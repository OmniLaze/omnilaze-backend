#!/usr/bin/env bash
set -euo pipefail

# ====== 可配置变量（可通过环境变量覆盖） ======
REGION=${AWS_REGION:-"ap-southeast-1"}
REPO=${ECR_REPOSITORY:-"omnilaze-backend"}
CLUSTER=${ECS_CLUSTER:-"omnilaze-cluster"}
SERVICE=${ECS_SERVICE:-"omnilaze-service"}
CONTAINER_NAME=${CONTAINER_NAME:-"app"}
CONTAINER_PORT=${CONTAINER_PORT:-"3000"}          # 应用端口
CPU=${CPU:-"256"}                                  # 0.25 vCPU
MEMORY=${MEMORY:-"512"}                            # 0.5 GB

# 私有子网 & 安全组（逗号分隔，无空格）
SUBNETS=${SUBNETS:-"subnet-xxxxxxx,subnet-yyyyyyy"}
SECURITY_GROUPS=${SECURITY_GROUPS:-"sg-zzzzzzzz"}

# 公网暴露（无ALB时建议 ENABLED）
ASSIGN_PUBLIC_IP=${ASSIGN_PUBLIC_IP:-"ENABLED"}

# 可选：ALB 目标组（提供则服务挂到 ALB 上）
TARGET_GROUP_ARN=${TARGET_GROUP_ARN:-""}

echo "🔧 AWS 区域: $REGION"
aws configure set region "$REGION"

command -v docker >/dev/null 2>&1 || { echo "❌ 需要安装 Docker"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ 需要安装 AWS CLI"; exit 1; }

# 1) 准备 ECR 仓库
aws ecr describe-repositories --repository-names "$REPO" >/dev/null 2>&1 || \
aws ecr create-repository --repository-name "$REPO"
echo "✅ ECR 仓库就绪: $REPO"

# 2) 构建并推送镜像
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
# 兼容中国区 ECR 域名后缀
if [[ "$REGION" == cn-* ]]; then
  ECR_DOMAIN_SUFFIX="amazonaws.com.cn"
else
  ECR_DOMAIN_SUFFIX="amazonaws.com"
fi
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.$ECR_DOMAIN_SUFFIX/$REPO"
TAG=${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}
IMAGE="$ECR_URI:$TAG"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.$ECR_DOMAIN_SUFFIX"
docker build -t "$IMAGE" .
docker push "$IMAGE"
echo "✅ 镜像已推送: $IMAGE"

# 3) 创建 ECS 集群（已存在则跳过）
aws ecs describe-clusters --clusters "$CLUSTER" --query 'clusters[0].status' --output text 2>/dev/null | grep -qi ACTIVE || \
aws ecs create-cluster --cluster-name "$CLUSTER"
echo "✅ 集群就绪: $CLUSTER"

# 4) 创建 Execution Role（任务拉镜像/打日志用）
EXEC_ROLE_NAME=${EXEC_ROLE_NAME:-"ecsTaskExecutionRole"}
if ! aws iam get-role --role-name "$EXEC_ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$EXEC_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]
    }' >/dev/null
  aws iam attach-role-policy --role-name "$EXEC_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
fi
EXEC_ROLE_ARN=$(aws iam get-role --role-name "$EXEC_ROLE_NAME" --query 'Role.Arn' --output text)
TASK_ROLE_ARN=${TASK_ROLE_ARN:-$EXEC_ROLE_ARN}

# 5) 生成 Task Definition（使用后端镜像 + 环境变量 + 日志）
ENV_KEYS=(NODE_ENV PORT DATABASE_URL REDIS_URL JWT_SECRET CORS_ORIGINS \
  ALIYUN_ACCESS_KEY_ID ALIYUN_ACCESS_KEY_SECRET ALIYUN_REGION_ID ALIYUN_DYPN_ENDPOINT \
  ALIYUN_SMS_SIGN_NAME ALIYUN_SMS_TEMPLATE_CODE ALIYUN_SMS_SCHEME_NAME SKIP_DB_CONNECTION)

ENV_JSON="[]"
for key in "${ENV_KEYS[@]}"; do
  val=${!key-}
  if [ -n "$val" ]; then
    esc=$(printf '%s' "$val" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()).strip())' 2>/dev/null || echo "$val")
    ENV_JSON=$(python3 - <<PY 2>/dev/null || echo "$ENV_JSON"
import json
env = json.loads('''$ENV_JSON''')
env.append({"name": "$key", "value": $esc})
print(json.dumps(env))
PY
)
  fi
done

cat > taskdef-app.json <<JSON
{
  "family": "omnilaze-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "$CPU",
  "memory": "$MEMORY",
  "executionRoleArn": "$EXEC_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "$CONTAINER_NAME",
      "image": "$IMAGE",
      "essential": true,
      "portMappings": [{ "containerPort": $CONTAINER_PORT }],
      "environment": $ENV_JSON,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$SERVICE",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
JSON

TD_ARN=$(aws ecs register-task-definition --cli-input-json file://taskdef-app.json --query 'taskDefinition.taskDefinitionArn' --output text)
echo "✅ 任务定义: $TD_ARN"

# 6) 创建/更新 ECS Service
NETWORK_CFG="awsvpcConfiguration={subnets=[$(echo $SUBNETS | sed 's/[^,][^,]*/\"&\"/g')],securityGroups=[$(echo $SECURITY_GROUPS | sed 's/[^,][^,]*/\"&\"/g')],assignPublicIp=$ASSIGN_PUBLIC_IP}"

if ! aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --query 'services[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
  if [ -n "$TARGET_GROUP_ARN" ]; then
    aws ecs create-service \
      --cluster "$CLUSTER" \
      --service-name "$SERVICE" \
      --task-definition "$TD_ARN" \
      --desired-count 1 \
      --launch-type FARGATE \
      --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=$CONTAINER_NAME,containerPort=$CONTAINER_PORT \
      --network-configuration "$NETWORK_CFG"
  else
    aws ecs create-service \
      --cluster "$CLUSTER" \
      --service-name "$SERVICE" \
      --task-definition "$TD_ARN" \
      --desired-count 1 \
      --launch-type FARGATE \
      --network-configuration "$NETWORK_CFG"
  fi
  echo "✅ 已创建服务: $SERVICE"
else
  aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --task-definition "$TD_ARN" >/dev/null
  echo "✅ 已更新服务: $SERVICE"
fi

echo "🎉 部署完成"
echo "- 镜像: $IMAGE"
echo "- 集群: $CLUSTER"
echo "- 服务: $SERVICE"
echo "- 子网: $SUBNETS"
echo "- 安全组: $SECURITY_GROUPS"
echo "- 公网IP: $ASSIGN_PUBLIC_IP"
