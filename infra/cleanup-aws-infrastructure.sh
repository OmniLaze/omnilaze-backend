#!/bin/bash

# AWS Infrastructure Cleanup Script for OmniLaze
# 谨慎使用！此脚本将删除所有创建的AWS资源

set -e

PROJECT_NAME="omnilaze"
AWS_REGION="ap-southeast-1"

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

# 警告确认
echo_warning "⚠️  警告：此脚本将删除所有与 $PROJECT_NAME 相关的AWS资源！"
echo_warning "这包括：VPC、子网、安全组、RDS数据库、ALB、ECS集群等"
echo_warning "删除后的资源无法恢复！"
echo ""
read -p "确定要继续吗？输入 'DELETE' 来确认: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo_info "操作已取消"
    exit 0
fi

echo_info "开始删除AWS资源..."

# 查找资源
echo_info "查找项目资源..."

# 查找VPC
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Project,Values=$PROJECT_NAME" \
    --query 'Vpcs[0].VpcId' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
    echo_info "未找到项目相关的VPC，可能资源已被删除"
    exit 0
fi

echo_info "找到VPC: $VPC_ID"

# 1. 删除ECS集群
echo_info "步骤1: 删除ECS集群..."
ECS_CLUSTER=$(aws ecs describe-clusters \
    --clusters ${PROJECT_NAME}-cluster \
    --query 'clusters[0].clusterName' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$ECS_CLUSTER" != "None" ] && [ "$ECS_CLUSTER" != "" ]; then
    # 停止所有服务
    SERVICES=$(aws ecs list-services \
        --cluster ${PROJECT_NAME}-cluster \
        --query 'serviceArns' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "")
    
    if [ -n "$SERVICES" ]; then
        for service in $SERVICES; do
            echo_info "停止ECS服务: $service"
            aws ecs update-service \
                --cluster ${PROJECT_NAME}-cluster \
                --service $service \
                --desired-count 0 \
                --region $AWS_REGION >/dev/null 2>&1
        done
        
        # 等待服务停止
        sleep 30
        
        # 删除服务
        for service in $SERVICES; do
            echo_info "删除ECS服务: $service"
            aws ecs delete-service \
                --cluster ${PROJECT_NAME}-cluster \
                --service $service \
                --region $AWS_REGION >/dev/null 2>&1
        done
    fi
    
    # 删除集群
    aws ecs delete-cluster \
        --cluster ${PROJECT_NAME}-cluster \
        --region $AWS_REGION >/dev/null 2>&1
    
    echo_success "ECS集群删除完成"
fi

# 2. 删除ALB和相关资源
echo_info "步骤2: 删除Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names ${PROJECT_NAME}-alb \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$ALB_ARN" != "None" ] && [ "$ALB_ARN" != "" ]; then
    # 删除监听器
    LISTENERS=$(aws elbv2 describe-listeners \
        --load-balancer-arn $ALB_ARN \
        --query 'Listeners[].ListenerArn' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "")
    
    for listener in $LISTENERS; do
        aws elbv2 delete-listener \
            --listener-arn $listener \
            --region $AWS_REGION >/dev/null 2>&1
    done
    
    # 删除ALB
    aws elbv2 delete-load-balancer \
        --load-balancer-arn $ALB_ARN \
        --region $AWS_REGION >/dev/null 2>&1
    
    echo_success "ALB删除完成"
    
    # 等待ALB删除
    echo_info "等待ALB删除完成..."
    sleep 60
fi

# 删除目标组
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --names ${PROJECT_NAME}-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$TARGET_GROUP_ARN" != "None" ] && [ "$TARGET_GROUP_ARN" != "" ]; then
    aws elbv2 delete-target-group \
        --target-group-arn $TARGET_GROUP_ARN \
        --region $AWS_REGION >/dev/null 2>&1
    echo_success "目标组删除完成"
fi

# 3. 删除RDS实例
echo_info "步骤3: 删除RDS数据库..."
DB_INSTANCE_ID="${PROJECT_NAME}-postgres"

if aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --region $AWS_REGION >/dev/null 2>&1; then
    
    aws rds delete-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --skip-final-snapshot \
        --delete-automated-backups \
        --region $AWS_REGION >/dev/null 2>&1
    
    echo_success "RDS数据库删除开始"
    
    # 等待RDS删除
    echo_info "等待RDS删除完成（这可能需要几分钟）..."
    aws rds wait db-instance-deleted \
        --db-instance-identifier $DB_INSTANCE_ID \
        --region $AWS_REGION
fi

# 删除RDS子网组
aws rds delete-db-subnet-group \
    --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
    --region $AWS_REGION >/dev/null 2>&1

# 4. 删除Secrets Manager密钥
echo_info "步骤4: 删除Secrets Manager密钥..."
aws secretsmanager delete-secret \
    --secret-id "${PROJECT_NAME}/db/password" \
    --force-delete-without-recovery \
    --region $AWS_REGION >/dev/null 2>&1

# 5. 删除SSL证书
echo_info "步骤5: 删除SSL证书..."
CERT_ARN=$(aws acm list-certificates \
    --query "CertificateSummaryList[?DomainName=='backend.omnilaze.co'].CertificateArn" \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ -n "$CERT_ARN" ]; then
    aws acm delete-certificate \
        --certificate-arn $CERT_ARN \
        --region $AWS_REGION >/dev/null 2>&1
    echo_success "SSL证书删除完成"
fi

# 6. 删除NAT Gateway
echo_info "步骤6: 删除NAT Gateway..."
NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
    --filter "Name=vpc-id,Values=$VPC_ID" \
    --query 'NatGateways[?State==`available`].NatGatewayId' \
    --output text \
    --region $AWS_REGION)

for nat_gw in $NAT_GATEWAYS; do
    aws ec2 delete-nat-gateway \
        --nat-gateway-id $nat_gw \
        --region $AWS_REGION >/dev/null 2>&1
done

if [ -n "$NAT_GATEWAYS" ]; then
    echo_info "等待NAT Gateway删除完成..."
    for nat_gw in $NAT_GATEWAYS; do
        aws ec2 wait nat-gateway-deleted \
            --nat-gateway-ids $nat_gw \
            --region $AWS_REGION
    done
    echo_success "NAT Gateway删除完成"
fi

# 7. 释放弹性IP
echo_info "步骤7: 释放弹性IP..."
EIPS=$(aws ec2 describe-addresses \
    --filters "Name=tag:Project,Values=$PROJECT_NAME" \
    --query 'Addresses[].AllocationId' \
    --output text \
    --region $AWS_REGION)

for eip in $EIPS; do
    aws ec2 release-address \
        --allocation-id $eip \
        --region $AWS_REGION >/dev/null 2>&1
done

if [ -n "$EIPS" ]; then
    echo_success "弹性IP释放完成"
fi

# 8. 删除安全组
echo_info "步骤8: 删除安全组..."
SECURITY_GROUPS=$(aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Project,Values=$PROJECT_NAME" \
    --query 'SecurityGroups[].GroupId' \
    --output text \
    --region $AWS_REGION)

for sg in $SECURITY_GROUPS; do
    aws ec2 delete-security-group \
        --group-id $sg \
        --region $AWS_REGION >/dev/null 2>&1
done

if [ -n "$SECURITY_GROUPS" ]; then
    echo_success "安全组删除完成"
fi

# 9. 删除子网
echo_info "步骤9: 删除子网..."
SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[].SubnetId' \
    --output text \
    --region $AWS_REGION)

for subnet in $SUBNETS; do
    aws ec2 delete-subnet \
        --subnet-id $subnet \
        --region $AWS_REGION >/dev/null 2>&1
done

if [ -n "$SUBNETS" ]; then
    echo_success "子网删除完成"
fi

# 10. 删除路由表
echo_info "步骤10: 删除路由表..."
ROUTE_TABLES=$(aws ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Project,Values=$PROJECT_NAME" \
    --query 'RouteTables[].RouteTableId' \
    --output text \
    --region $AWS_REGION)

for rt in $ROUTE_TABLES; do
    aws ec2 delete-route-table \
        --route-table-id $rt \
        --region $AWS_REGION >/dev/null 2>&1
done

if [ -n "$ROUTE_TABLES" ]; then
    echo_success "路由表删除完成"
fi

# 11. 删除Internet Gateway
echo_info "步骤11: 删除Internet Gateway..."
IGW_ID=$(aws ec2 describe-internet-gateways \
    --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text \
    --region $AWS_REGION)

if [ "$IGW_ID" != "None" ] && [ -n "$IGW_ID" ]; then
    aws ec2 detach-internet-gateway \
        --internet-gateway-id $IGW_ID \
        --vpc-id $VPC_ID \
        --region $AWS_REGION >/dev/null 2>&1
    
    aws ec2 delete-internet-gateway \
        --internet-gateway-id $IGW_ID \
        --region $AWS_REGION >/dev/null 2>&1
    
    echo_success "Internet Gateway删除完成"
fi

# 12. 删除VPC
echo_info "步骤12: 删除VPC..."
aws ec2 delete-vpc \
    --vpc-id $VPC_ID \
    --region $AWS_REGION >/dev/null 2>&1

echo_success "VPC删除完成"

echo ""
echo_success "🎉 所有AWS资源删除完成！"
echo ""
echo_warning "请检查AWS控制台确认所有资源已被删除"
echo_warning "某些资源（如RDS快照）可能需要手动删除"