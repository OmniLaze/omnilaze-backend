#!/usr/bin/env bash
set -eo pipefail

# ====== 配置变量 ======
REGION=${AWS_REGION:-"ap-southeast-1"}
ENV=${ENVIRONMENT:-"prod"}
IMAGE_URI=${1:-""}

if [ -z "$IMAGE_URI" ]; then
    echo "❌ 使用方法: $0 <IMAGE_URI>"
    echo "   示例: $0 442729101249.dkr.ecr.ap-southeast-1.amazonaws.com/omnilaze-backend:latest"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
TEMPLATE_FILE="task-definitions/template.json"
OUTPUT_FILE="task-definition-generated.json"

echo "🔧 生成 Task Definition - 环境: $ENV, 区域: $REGION"
echo "🖼️  镜像: $IMAGE_URI"

# 检查模板文件是否存在
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ 模板文件不存在: $TEMPLATE_FILE"
    exit 1
fi

# 替换占位符并生成最终的 Task Definition
cat "$TEMPLATE_FILE" | \
    sed "s|PLACEHOLDER_IMAGE_URI|$IMAGE_URI|g" | \
    sed "s/REGION/$REGION/g" | \
    sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" | \
    sed "s/ENVIRONMENT/$ENV/g" > "$OUTPUT_FILE"

echo "✅ Task Definition 生成完成: $OUTPUT_FILE"

# 注册 Task Definition
echo "📝 注册新的 Task Definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --region "$REGION" \
    --cli-input-json file://"$OUTPUT_FILE" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✅ Task Definition 注册成功: $TASK_DEF_ARN"

# 输出简短的 ARN
FAMILY_REVISION=$(echo $TASK_DEF_ARN | sed 's/.*task-definition\///')
echo "📋 可使用的 ARN: $FAMILY_REVISION"