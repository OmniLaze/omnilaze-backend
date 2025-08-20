#!/usr/bin/env bash
set -eo pipefail

# ====== 新版部署脚本 - 使用 SSM Parameter Store ======
REGION=${AWS_REGION:-"ap-southeast-1"}
REPO=${ECR_REPOSITORY:-"omnilaze-backend"}
CLUSTER=${ECS_CLUSTER:-"omnilaze-cluster"}
SERVICE=${ECS_SERVICE:-"omnilaze-service"}
ENV=${ENVIRONMENT:-"prod"}

echo "🚀 OmniLaze 部署脚本 v2.0 - 使用 SSM Parameter Store"
echo "📍 区域: $REGION | 环境: $ENV | 集群: $CLUSTER | 服务: $SERVICE"

# 检查必要的工具
command -v docker >/dev/null 2>&1 || { echo "❌ 需要安装 Docker"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ 需要安装 AWS CLI"; exit 1; }

# 设置 AWS 区域
aws configure set region "$REGION"

# 1) 构建并推送镜像
echo ""
echo "🏗️  步骤 1: 构建和推送 Docker 镜像"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO"
TAG=${IMAGE_TAG:-$(git rev-parse --short HEAD)}
IMAGE="$ECR_URI:$TAG"

echo "  📦 镜像: $IMAGE"

# 创建 ECR 仓库（如果不存在）
aws ecr describe-repositories --repository-names "$REPO" >/dev/null 2>&1 || \
aws ecr create-repository --repository-name "$REPO" >/dev/null

# 登录 ECR
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# 构建和推送
docker build -t "$IMAGE" .
docker push "$IMAGE"
echo "  ✅ 镜像推送完成"

# 2) 生成 Task Definition
echo ""
echo "📋 步骤 2: 生成 Task Definition"
if [ ! -f "scripts/generate-task-definition.sh" ]; then
    echo "❌ 找不到 Task Definition 生成脚本"
    exit 1
fi

./scripts/generate-task-definition.sh "$IMAGE"
TD_FILE="task-definition-generated.json"

if [ ! -f "$TD_FILE" ]; then
    echo "❌ Task Definition 生成失败"
    exit 1
fi

# 提取新的 Task Definition ARN
TD_ARN=$(jq -r '.taskDefinitionArn // empty' "$TD_FILE" 2>/dev/null)
if [ -z "$TD_ARN" ]; then
    echo "❌ 无法获取 Task Definition ARN"
    exit 1
fi

echo "  ✅ Task Definition: $TD_ARN"

# 3) 更新 ECS 服务
echo ""
echo "🔄 步骤 3: 更新 ECS 服务"

# 检查服务是否存在
if aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --query 'services[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
    echo "  🔄 更新现有服务..."
    aws ecs update-service \
        --cluster "$CLUSTER" \
        --service "$SERVICE" \
        --task-definition "$TD_ARN" \
        --force-new-deployment >/dev/null
    
    echo "  ✅ 服务更新完成"
else
    echo "❌ 服务不存在: $SERVICE"
    echo "💡 请先使用 deploy-ecs.sh 创建服务，或手动创建服务"
    exit 1
fi

# 4) 等待部署完成
echo ""
echo "⏳ 步骤 4: 等待部署完成"
echo "  🔍 监控服务状态..."

for i in {1..30}; do
    RUNNING_COUNT=$(aws ecs describe-services \
        --cluster "$CLUSTER" \
        --services "$SERVICE" \
        --query 'services[0].runningCount' \
        --output text 2>/dev/null || echo "0")
    
    DESIRED_COUNT=$(aws ecs describe-services \
        --cluster "$CLUSTER" \
        --services "$SERVICE" \
        --query 'services[0].desiredCount' \
        --output text 2>/dev/null || echo "1")
    
    echo "    尝试 $i/30: 运行中任务 $RUNNING_COUNT/$DESIRED_COUNT"
    
    if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" -gt "0" ]; then
        echo "  ✅ 部署成功！"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "  ⚠️  部署超时，请检查 ECS 控制台"
        break
    fi
    
    sleep 10
done

# 5) 健康检查
echo ""
echo "🩺 步骤 5: 健康检查"
HEALTH_URL="https://backend.omnilaze.co/v1/health"
echo "  🔍 检查健康端点: $HEALTH_URL"

for i in {1..6}; do
    if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
        echo "  ✅ 健康检查通过！"
        break
    else
        echo "    尝试 $i/6: 健康检查失败，等待服务启动..."
        if [ $i -eq 6 ]; then
            echo "  ⚠️  健康检查失败，请检查服务日志"
        else
            sleep 10
        fi
    fi
done

# 6) 部署总结
echo ""
echo "🎉 部署完成总结"
echo "─────────────────────────────────────"
echo "📦 镜像: $IMAGE"
echo "📋 Task Definition: $TD_ARN"
echo "🎯 集群: $CLUSTER"
echo "🚀 服务: $SERVICE"
echo "🌍 环境: $ENV"
echo "🔗 健康检查: $HEALTH_URL"
echo "─────────────────────────────────────"

# 清理临时文件
rm -f "$TD_FILE"

echo ""
echo "💡 有用的命令:"
echo "  查看服务状态: aws ecs describe-services --cluster $CLUSTER --services $SERVICE"
echo "  查看服务日志: aws logs tail /ecs/omnilaze-service --follow"
echo "  管理 SSM 参数: ./scripts/manage-ssm-config.sh list"
echo ""