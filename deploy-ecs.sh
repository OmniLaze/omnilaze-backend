#!/usr/bin/env bash
set -euo pipefail

# ====== 按需修改这些变量 ======
REGION="ap-southeast-1"
REPO="omnilaze-backend"
CLUSTER="omnilaze-cluster"
SERVICE="omnilaze-service"
CONTAINER_NAME="app"
CONTAINER_PORT="3000"          # 你的应用端口
CPU="256"                      # 0.25 vCPU
MEMORY="512"                   # 0.5 GB

# 私有子网 & 安全组（逗号分隔，无空格）
SUBNETS="subnet-07ab212afbbe02e7b,subnet-07eea72bcd3edc366"
SECURITY_GROUPS="sg-0c2b8bf2621aaf6dc"

# ====== 开始 ======
aws configure set region "$REGION"

# 1) 创建 ECR 仓库（已存在则跳过）
aws ecr describe-repositories --repository-names "$REPO" >/dev/null 2>&1 || \
aws ecr create-repository --repository-name "$REPO"
echo "ECR ready: $REPO"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO"
echo "ECR URI: $ECR_URI"

# 2) 创建 ECS 集群（已存在则跳过）
aws ecs describe-clusters --clusters "$CLUSTER" --query 'clusters[0].status' --output text 2>/dev/null | grep -qi ACTIVE || \
aws ecs create-cluster --cluster-name "$CLUSTER"
echo "Cluster ready: $CLUSTER"

# 3) 创建 Execution Role（任务拉镜像/打日志用）
EXEC_ROLE_NAME="ecsTaskExecutionRole"
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

# （可选）应用 Task Role，如果你的容器需要访问AWS资源，这里换成你的 Task Role
TASK_ROLE_ARN="$EXEC_ROLE_ARN"

# 4) 注册一个最简 Task Definition（占位镜像先用 nginx，后续部署会替换成你 ECR 的镜像）
cat > taskdef-app.json <<'JSON'
{
  "family": "omnilaze-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "__CPU__",
  "memory": "__MEM__",
  "executionRoleArn": "__EXEC_ROLE_ARN__",
  "taskRoleArn": "__TASK_ROLE_ARN__",
  "containerDefinitions": [
    {
      "name": "__CONTAINER_NAME__",
      "image": "public.ecr.aws/docker/library/nginx:latest",
      "essential": true,
      "portMappings": [{ "containerPort": __PORT__ }]
    }
  ]
}
JSON

sed -i '' -e "s/__CPU__/$CPU/" \
  -e "s/__MEM__/$MEMORY/" \
  -e "s#__EXEC_ROLE_ARN__#$EXEC_ROLE_ARN#" \
  -e "s#__TASK_ROLE_ARN__#$TASK_ROLE_ARN#" \
  -e "s/__CONTAINER_NAME__/$CONTAINER_NAME/" \
  -e "s/__PORT__/$CONTAINER_PORT/" taskdef-app.json 2>/dev/null || \
perl -pi -e "s/__CPU__/$CPU/; s/__MEM__/$MEMORY/; s#__EXEC_ROLE_ARN__#$EXEC_ROLE_ARN#; s#__TASK_ROLE_ARN__#$TASK_ROLE_ARN#; s/__CONTAINER_NAME__/$CONTAINER_NAME/; s/__PORT__/$CONTAINER_PORT/" taskdef-app.json

TD_ARN=$(aws ecs register-task-definition --cli-input-json file://taskdef-app.json --query 'taskDefinition.taskDefinitionArn' --output text)
echo "TaskDefinition: $TD_ARN"

# 5) 创建 ECS Service（若不存在）
if ! aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --query 'services[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
  aws ecs create-service \
    --cluster "$CLUSTER" \
    --service-name "$SERVICE" \
    --task-definition "$TD_ARN" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$(echo $SUBNETS | sed 's/[^,][^,]*/"&"/g')],securityGroups=[$(echo $SECURITY_GROUPS | sed 's/[^,][^,]*/"&"/g')],assignPublicIp=DISABLED}"
  echo "Service created: $SERVICE"
else
  echo "Service exists: $SERVICE"
fi

echo "All set ✅"
echo "Secrets you can fill in GitHub:"
echo "  AWS_REGION=$REGION"
echo "  ECR_REPOSITORY=$REPO"
echo "  ECS_CLUSTER=$CLUSTER"
echo "  ECS_SERVICE=$SERVICE"
echo "  SUBNETS=$SUBNETS"
echo "  SECURITY_GROUPS=$SECURITY_GROUPS"
