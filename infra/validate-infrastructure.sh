#!/bin/bash

# AWS Infrastructure Validation Script
# 验证OmniLaze基础设施是否正确创建

set -e

PROJECT_NAME="omnilaze"
AWS_REGION="ap-southeast-1"
DOMAIN_NAME="backend.omnilaze.co"

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

# 验证函数
validate_resource() {
    local resource_name="$1"
    local check_command="$2"
    local expected_count="$3"
    
    echo_info "检查 $resource_name..."
    
    local result=$(eval "$check_command" 2>/dev/null || echo "")
    local count=$(echo "$result" | wc -w)
    
    if [ "$count" -ge "$expected_count" ]; then
        echo_success "$resource_name: $count 个资源"
        return 0
    else
        echo_error "$resource_name: 期望 $expected_count 个，实际 $count 个"
        return 1
    fi
}

# 检查AWS CLI
if ! command -v aws &> /dev/null; then
    echo_error "AWS CLI未安装"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo_error "AWS CLI未配置"
    exit 1
fi

echo_info "开始验证AWS基础设施..."
echo "项目: $PROJECT_NAME"
echo "区域: $AWS_REGION"
echo ""

validation_failed=0

# 1. 验证VPC
echo_info "=== 网络资源验证 ==="
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Project,Values=$PROJECT_NAME" \
    --query 'Vpcs[0].VpcId' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
    echo_success "VPC: $VPC_ID"
    
    # 验证子网
    validate_resource "子网" \
        "aws ec2 describe-subnets --filters 'Name=vpc-id,Values=$VPC_ID' --query 'Subnets[].SubnetId' --output text --region $AWS_REGION" \
        6 || validation_failed=1
    
    # 验证安全组
    validate_resource "安全组" \
        "aws ec2 describe-security-groups --filters 'Name=vpc-id,Values=$VPC_ID' 'Name=tag:Project,Values=$PROJECT_NAME' --query 'SecurityGroups[].GroupId' --output text --region $AWS_REGION" \
        3 || validation_failed=1
    
    # 验证NAT Gateway
    validate_resource "NAT Gateway" \
        "aws ec2 describe-nat-gateways --filter 'Name=vpc-id,Values=$VPC_ID' --query 'NatGateways[?State==\`available\`].NatGatewayId' --output text --region $AWS_REGION" \
        2 || validation_failed=1
    
    # 验证Internet Gateway
    IGW_ID=$(aws ec2 describe-internet-gateways \
        --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
        --query 'InternetGateways[0].InternetGatewayId' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [ "$IGW_ID" != "None" ] && [ -n "$IGW_ID" ]; then
        echo_success "Internet Gateway: $IGW_ID"
    else
        echo_error "Internet Gateway 未找到"
        validation_failed=1
    fi
else
    echo_error "VPC 未找到"
    validation_failed=1
fi

echo ""

# 2. 验证负载均衡器
echo_info "=== 负载均衡器验证 ==="
ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names ${PROJECT_NAME}-alb \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$ALB_ARN" != "None" ] && [ -n "$ALB_ARN" ]; then
    echo_success "ALB: $ALB_ARN"
    
    # 获取ALB状态
    ALB_STATE=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns $ALB_ARN \
        --query 'LoadBalancers[0].State.Code' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$ALB_STATE" = "active" ]; then
        echo_success "ALB状态: $ALB_STATE"
    else
        echo_warning "ALB状态: $ALB_STATE (非活跃状态)"
    fi
    
    # 获取ALB DNS
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns $ALB_ARN \
        --query 'LoadBalancers[0].DNSName' \
        --output text \
        --region $AWS_REGION)
    echo_info "ALB DNS: $ALB_DNS"
    
    # 验证目标组
    TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
        --names ${PROJECT_NAME}-tg \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [ "$TARGET_GROUP_ARN" != "None" ] && [ -n "$TARGET_GROUP_ARN" ]; then
        echo_success "目标组: $TARGET_GROUP_ARN"
    else
        echo_error "目标组未找到"
        validation_failed=1
    fi
    
    # 验证监听器
    LISTENERS=$(aws elbv2 describe-listeners \
        --load-balancer-arn $ALB_ARN \
        --query 'Listeners[].Protocol' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "")
    
    echo_info "监听器协议: $LISTENERS"
    
    if echo "$LISTENERS" | grep -q "HTTPS"; then
        echo_success "HTTPS监听器已配置"
    else
        echo_warning "HTTPS监听器未配置（可能SSL证书未验证）"
    fi
else
    echo_error "ALB 未找到"
    validation_failed=1
fi

echo ""

# 3. 验证RDS数据库
echo_info "=== 数据库验证 ==="
DB_INSTANCE_ID="${PROJECT_NAME}-postgres"

if aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --region $AWS_REGION >/dev/null 2>&1; then
    
    DB_STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_ID \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text \
        --region $AWS_REGION)
    
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_ID \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text \
        --region $AWS_REGION)
    
    echo_success "RDS实例: $DB_INSTANCE_ID"
    echo_info "数据库状态: $DB_STATUS"
    echo_info "数据库端点: $DB_ENDPOINT"
    
    if [ "$DB_STATUS" = "available" ]; then
        echo_success "数据库可用"
    else
        echo_warning "数据库状态非available: $DB_STATUS"
    fi
    
    # 验证子网组
    if aws rds describe-db-subnet-groups \
        --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
        --region $AWS_REGION >/dev/null 2>&1; then
        echo_success "RDS子网组已创建"
    else
        echo_error "RDS子网组未找到"
        validation_failed=1
    fi
else
    echo_error "RDS实例未找到"
    validation_failed=1
fi

echo ""

# 4. 验证SSL证书
echo_info "=== SSL证书验证 ==="
CERT_ARN=$(aws acm list-certificates \
    --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ -n "$CERT_ARN" ]; then
    echo_success "SSL证书: $CERT_ARN"
    
    CERT_STATUS=$(aws acm describe-certificate \
        --certificate-arn $CERT_ARN \
        --query 'Certificate.Status' \
        --output text \
        --region $AWS_REGION)
    
    echo_info "证书状态: $CERT_STATUS"
    
    if [ "$CERT_STATUS" = "ISSUED" ]; then
        echo_success "SSL证书已验证"
    else
        echo_warning "SSL证书未验证，状态: $CERT_STATUS"
        
        # 显示验证信息
        echo_info "DNS验证记录："
        aws acm describe-certificate \
            --certificate-arn $CERT_ARN \
            --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
            --region $AWS_REGION
    fi
else
    echo_error "SSL证书未找到"
    validation_failed=1
fi

echo ""

# 5. 验证ECS集群
echo_info "=== ECS集群验证 ==="
if aws ecs describe-clusters \
    --clusters ${PROJECT_NAME}-cluster \
    --region $AWS_REGION >/dev/null 2>&1; then
    
    CLUSTER_STATUS=$(aws ecs describe-clusters \
        --clusters ${PROJECT_NAME}-cluster \
        --query 'clusters[0].status' \
        --output text \
        --region $AWS_REGION)
    
    echo_success "ECS集群: ${PROJECT_NAME}-cluster"
    echo_info "集群状态: $CLUSTER_STATUS"
else
    echo_error "ECS集群未找到"
    validation_failed=1
fi

echo ""

# 6. 验证Secrets Manager
echo_info "=== Secrets Manager验证 ==="
if aws secretsmanager describe-secret \
    --secret-id "${PROJECT_NAME}/db/password" \
    --region $AWS_REGION >/dev/null 2>&1; then
    echo_success "数据库密码已存储在Secrets Manager"
else
    echo_error "Secrets Manager密钥未找到"
    validation_failed=1
fi

echo ""

# 总结
echo_info "=== 验证总结 ==="
if [ $validation_failed -eq 0 ]; then
    echo_success "🎉 所有基础设施资源验证通过！"
    echo ""
    echo_info "下一步操作："
    echo "1. 如果SSL证书未验证，请在DNS提供商处添加验证记录"
    echo "2. 运行 ./infra/setup-https-listener.sh 配置HTTPS"
    echo "3. 配置DNS CNAME记录指向ALB"
    echo "4. 部署应用到ECS集群"
    echo ""
    echo_info "访问信息："
    echo "ALB DNS: $ALB_DNS"
    echo "目标域名: https://$DOMAIN_NAME"
    echo "健康检查: https://$DOMAIN_NAME/v1/health"
else
    echo_error "验证失败！请检查上述错误并重新运行基础设施脚本"
    exit 1
fi