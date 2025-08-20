#!/usr/bin/env bash
set -eo pipefail

# ====== 配置变量 ======
REGION=${AWS_REGION:-"ap-southeast-1"}
ENV=${ENVIRONMENT:-"prod"}
PREFIX="/omnilaze/${ENV}"

echo "🔧 设置 SSM 参数 - 环境: $ENV, 区域: $REGION"

# 设置普通参数的函数
set_standard_param() {
    local name=$1
    local value=$2
    echo "  设置: $PREFIX/$name"
    aws ssm put-parameter \
        --region "$REGION" \
        --name "$PREFIX/$name" \
        --value "$value" \
        --type "String" \
        --overwrite \
        --description "OmniLaze $ENV environment variable: $name" >/dev/null
}

# 设置敏感参数的函数
set_secure_param() {
    local name=$1
    local value=$2
    echo "  设置: $PREFIX/$name"
    aws ssm put-parameter \
        --region "$REGION" \
        --name "$PREFIX/$name" \
        --value "$value" \
        --type "SecureString" \
        --overwrite \
        --description "OmniLaze $ENV secure environment variable: $name" >/dev/null
}

echo "📝 设置普通参数..."
set_standard_param "NODE_ENV" "production"
set_standard_param "PORT" "3000"
set_standard_param "CORS_ORIGINS" "[\"https://order.omnilaze.co\",\"http://localhost:8081\",\"http://localhost:3000\"]"
set_standard_param "ALIPAY_GATEWAY" "https://openapi.alipay.com/gateway.do"
set_standard_param "ALIPAY_NOTIFY_URL" "https://backend.omnilaze.co/v1/payments/webhook/alipay"
set_standard_param "ALIPAY_RETURN_URL" "https://order.omnilaze.co/payment/callback"
set_standard_param "WECHAT_NOTIFY_URL" "https://backend.omnilaze.co/v1/payments/webhook/wechatpay"
set_standard_param "WECHAT_GATEWAY" "https://api.mch.weixin.qq.com"

echo "🔐 设置敏感参数..."
set_secure_param "DATABASE_URL" "postgresql://postgres:Omnilaze2024!@omnilaze-postgres.czoamaem021x.ap-southeast-1.rds.amazonaws.com:5432/omnilaze"
set_secure_param "JWT_SECRET" "omnilaze-jwt-secret-2024"
set_secure_param "SYSTEM_API_KEY" "test-system-key-change-in-production"

echo "✅ SSM 参数设置完成！"
echo "📋 查看所有参数:"
aws ssm get-parameters-by-path \
    --region "$REGION" \
    --path "$PREFIX" \
    --recursive \
    --query "Parameters[*].{Name:Name,Type:Type}" \
    --output table