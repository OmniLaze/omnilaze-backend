#!/usr/bin/env bash
set -eo pipefail

# ====== 从 Task Definition 迁移到 SSM Parameter Store ======
REGION=${AWS_REGION:-"ap-southeast-1"}
ENV=${ENVIRONMENT:-"prod"}
CLUSTER=${ECS_CLUSTER:-"omnilaze-cluster"}
SERVICE=${ECS_SERVICE:-"omnilaze-service"}

echo "🔄 从 Task Definition 环境变量迁移到 SSM Parameter Store"
echo "📍 区域: $REGION | 环境: $ENV | 集群: $CLUSTER | 服务: $SERVICE"

# 1) 获取当前 Task Definition
echo ""
echo "📋 步骤 1: 获取当前 Task Definition"
CURRENT_TD=$(aws ecs describe-services \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --query 'services[0].taskDefinition' \
    --output text 2>/dev/null)

if [ -z "$CURRENT_TD" ] || [ "$CURRENT_TD" = "None" ]; then
    echo "❌ 无法获取当前 Task Definition"
    exit 1
fi

echo "  📄 当前 Task Definition: $CURRENT_TD"

# 获取 Task Definition 详情
aws ecs describe-task-definition \
    --task-definition "$CURRENT_TD" \
    --query 'taskDefinition' > current-task-def.json

echo "  ✅ Task Definition 详情已保存到 current-task-def.json"

# 2) 提取环境变量
echo ""
echo "🔍 步骤 2: 提取环境变量"
ENV_VARS=$(jq -r '.containerDefinitions[0].environment[]? | "\(.name)=\(.value)"' current-task-def.json 2>/dev/null || echo "")

if [ -z "$ENV_VARS" ]; then
    echo "  ℹ️  当前 Task Definition 中没有环境变量"
else
    echo "  📊 发现的环境变量:"
    echo "$ENV_VARS" | while read -r line; do
        echo "    $line"
    done
fi

# 3) 迁移环境变量到 SSM
echo ""
echo "📤 步骤 3: 迁移环境变量到 SSM Parameter Store"

if [ -z "$ENV_VARS" ]; then
    echo "  ⏭️  跳过迁移（无环境变量）"
else
    echo "  🔄 开始迁移..."
    echo "$ENV_VARS" | while IFS='=' read -r name value; do
        if [ -n "$name" ] && [ -n "$value" ]; then
            echo "    迁移: $name"
            
            # 确定参数类型（敏感信息使用 SecureString）
            if [[ "$name" =~ (SECRET|PASSWORD|KEY|TOKEN|DATABASE_URL) ]]; then
                param_type="SecureString"
            else
                param_type="String"
            fi
            
            # 设置 SSM 参数
            aws ssm put-parameter \
                --region "$REGION" \
                --name "/omnilaze/$ENV/$name" \
                --value "$value" \
                --type "$param_type" \
                --overwrite \
                --description "Migrated from Task Definition on $(date)" >/dev/null
        fi
    done
    echo "  ✅ 环境变量迁移完成"
fi

# 4) 生成新的 Task Definition
echo ""
echo "🏗️  步骤 4: 生成新的 Task Definition（仅使用 secrets）"

# 获取当前镜像
CURRENT_IMAGE=$(jq -r '.containerDefinitions[0].image' current-task-def.json)
echo "  🖼️  当前镜像: $CURRENT_IMAGE"

# 使用我们的模板生成新的 Task Definition
if [ -f "scripts/generate-task-definition.sh" ]; then
    ./scripts/generate-task-definition.sh "$CURRENT_IMAGE"
    echo "  ✅ 新的 Task Definition 已生成"
else
    echo "  ❌ 找不到 Task Definition 生成脚本"
    exit 1
fi

# 5) 比较新旧 Task Definition
echo ""
echo "🔍 步骤 5: 对比新旧 Task Definition"
if [ -f "task-definition-generated.json" ]; then
    echo "  📊 环境变量数量比较:"
    OLD_ENV_COUNT=$(jq '.containerDefinitions[0].environment | length' current-task-def.json 2>/dev/null || echo "0")
    NEW_ENV_COUNT=$(jq '.containerDefinitions[0].environment | length' task-definition-generated.json 2>/dev/null || echo "0")
    OLD_SECRET_COUNT=$(jq '.containerDefinitions[0].secrets | length' current-task-def.json 2>/dev/null || echo "0")
    NEW_SECRET_COUNT=$(jq '.containerDefinitions[0].secrets | length' task-definition-generated.json 2>/dev/null || echo "0")
    
    echo "    旧版 - 环境变量: $OLD_ENV_COUNT, Secrets: $OLD_SECRET_COUNT"
    echo "    新版 - 环境变量: $NEW_ENV_COUNT, Secrets: $NEW_SECRET_COUNT"
    echo "  ✅ 新版本将全部使用 SSM Parameter Store"
fi

# 6) 询问是否应用新配置
echo ""
echo "🤔 步骤 6: 确认部署"
echo "⚠️  这将使用新的 SSM-only Task Definition 更新服务"
echo "💾 旧的 Task Definition 已保存到 current-task-def.json"
echo ""
read -p "是否继续部署新配置？(y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 部署新配置..."
    
    # 获取新的 Task Definition ARN
    TD_ARN=$(jq -r '.taskDefinitionArn // empty' task-definition-generated.json 2>/dev/null)
    if [ -z "$TD_ARN" ]; then
        echo "❌ 无法获取新的 Task Definition ARN"
        exit 1
    fi
    
    # 更新服务
    aws ecs update-service \
        --cluster "$CLUSTER" \
        --service "$SERVICE" \
        --task-definition "$TD_ARN" \
        --force-new-deployment >/dev/null
    
    echo "✅ 服务更新完成"
    echo "📋 新的 Task Definition: $TD_ARN"
    
    # 清理临时文件
    rm -f task-definition-generated.json
else
    echo "❌ 取消部署"
    echo "💡 你可以稍后使用 deploy-v2.sh 脚本部署"
fi

echo ""
echo "🎉 迁移完成！"
echo ""
echo "💡 新的工作流程:"
echo "  1. 使用 ./scripts/manage-ssm-config.sh 管理配置"
echo "  2. 使用 ./deploy-v2.sh 进行部署"
echo "  3. 不再需要为每个配置变更创建新的 Task Definition"
echo ""