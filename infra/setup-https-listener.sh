#!/bin/bash

# AWS SSL Certificate and HTTPS Listener Setup
# 在SSL证书验证完成后运行此脚本

set -e

# 配置变量 - 请从基础设施脚本输出中获取这些值
PROJECT_NAME="omnilaze"
AWS_REGION="ap-southeast-1"
DOMAIN_NAME="backend.omnilaze.co"

# 需要从基础设施脚本中获取的值
ALB_ARN=""
TARGET_GROUP_ARN=""
CERT_ARN=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 从用户输入获取ARN值
if [ -z "$ALB_ARN" ]; then
    read -p "请输入ALB ARN: " ALB_ARN
fi

if [ -z "$TARGET_GROUP_ARN" ]; then
    read -p "请输入Target Group ARN: " TARGET_GROUP_ARN
fi

if [ -z "$CERT_ARN" ]; then
    read -p "请输入SSL证书ARN: " CERT_ARN
fi

echo_info "配置信息："
echo "ALB ARN: $ALB_ARN"
echo "Target Group ARN: $TARGET_GROUP_ARN"
echo "Certificate ARN: $CERT_ARN"
echo ""

# 检查SSL证书状态
echo_info "检查SSL证书状态..."
CERT_STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region $AWS_REGION \
    --query 'Certificate.Status' \
    --output text)

if [ "$CERT_STATUS" != "ISSUED" ]; then
    echo_error "SSL证书状态为: $CERT_STATUS"
    echo_warning "请先验证SSL证书，证书状态必须为 'ISSUED'"
    
    # 显示验证记录
    echo_info "SSL证书验证记录："
    aws acm describe-certificate \
        --certificate-arn $CERT_ARN \
        --region $AWS_REGION \
        --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
    
    exit 1
fi

echo_success "SSL证书已验证，状态为: $CERT_STATUS"

# 创建HTTPS监听器
echo_info "创建HTTPS监听器..."
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text)

if [ $? -eq 0 ]; then
    echo_success "HTTPS监听器创建成功: $HTTPS_LISTENER_ARN"
else
    echo_error "HTTPS监听器创建失败"
    exit 1
fi

# 获取ALB DNS名称
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo ""
echo_success "🎉 HTTPS配置完成！"
echo ""
echo "🌐 访问信息："
echo "ALB DNS名称: $ALB_DNS"
echo "HTTPS URL: https://$ALB_DNS"
echo "自定义域名: https://$DOMAIN_NAME"
echo ""
echo "📝 DNS配置："
echo "在你的DNS提供商处创建以下记录："
echo "类型: CNAME"
echo "名称: backend.omnilaze.co"
echo "值: $ALB_DNS"
echo ""
echo "🔍 测试访问："
echo "curl -k https://$ALB_DNS/v1/health"
echo "curl -k https://$DOMAIN_NAME/v1/health"
echo ""
echo "💡 提示："
echo "- 确保ECS服务已部署并正在运行"
echo "- 目标组健康检查通过后才能正常访问"
echo "- DNS传播可能需要几分钟时间"