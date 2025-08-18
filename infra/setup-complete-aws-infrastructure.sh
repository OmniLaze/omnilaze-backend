#!/bin/bash

# AWS Complete Infrastructure Setup for OmniLaze Backend
# 基于迁移文档的完整网络架构设置
# 
# 网络架构:
# - VPC: 10.0.0.0/16
# - 公共子网: 10.0.1.0/24 (1a), 10.0.2.0/24 (1c)
# - 私有应用子网: 10.0.10.0/24 (1a), 10.0.12.0/24 (1c)
# - 私有数据库子网: 10.0.20.0/24 (1a), 10.0.21.0/24 (1c)

set -e

# 配置变量
AWS_REGION="ap-southeast-1"
AWS_ACCOUNT_ID="442729101249"
PROJECT_NAME="omnilaze"
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

# 检查AWS CLI和权限
echo_info "检查AWS CLI配置..."
if ! command -v aws &> /dev/null; then
    echo_error "AWS CLI未安装，请先安装AWS CLI"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo_error "AWS CLI未配置，请先运行 'aws configure'"
    exit 1
fi

CURRENT_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ "$CURRENT_ACCOUNT_ID" != "$AWS_ACCOUNT_ID" ]; then
    echo_warning "当前AWS账号 ($CURRENT_ACCOUNT_ID) 与预期账号 ($AWS_ACCOUNT_ID) 不匹配"
    read -p "继续吗？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo_success "AWS配置检查通过"
echo_info "AWS账号: $CURRENT_ACCOUNT_ID"
echo_info "AWS区域: $AWS_REGION"

# 1. 创建VPC
echo_info "步骤1: 创建VPC (10.0.0.0/16)..."
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT_NAME}-vpc},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'Vpc.VpcId' \
    --output text)

if [ $? -eq 0 ]; then
    echo_success "VPC创建成功: $VPC_ID"
else
    echo_error "VPC创建失败"
    exit 1
fi

# 启用DNS主机名和DNS解析
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $AWS_REGION

# 2. 创建Internet Gateway
echo_info "步骤2: 创建Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-igw},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $AWS_REGION
echo_success "Internet Gateway创建并附加成功: $IGW_ID"

# 3. 创建子网
echo_info "步骤3: 创建子网..."

# 公共子网
PUBLIC_SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone ${AWS_REGION}a \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-1a},{Key=Project,Value=${PROJECT_NAME}},{Key=Type,Value=Public}]" \
    --query 'Subnet.SubnetId' \
    --output text)

PUBLIC_SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone ${AWS_REGION}c \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-1c},{Key=Project,Value=${PROJECT_NAME}},{Key=Type,Value=Public}]" \
    --query 'Subnet.SubnetId' \
    --output text)

# 私有应用子网
PRIVATE_APP_SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.10.0/24 \
    --availability-zone ${AWS_REGION}a \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-app-subnet-1a},{Key=Project,Value=${PROJECT_NAME}},{Key=Type,Value=PrivateApp}]" \
    --query 'Subnet.SubnetId' \
    --output text)

PRIVATE_APP_SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.12.0/24 \
    --availability-zone ${AWS_REGION}c \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-app-subnet-1c},{Key=Project,Value=${PROJECT_NAME}},{Key=Type,Value=PrivateApp}]" \
    --query 'Subnet.SubnetId' \
    --output text)

# 私有数据库子网
PRIVATE_DB_SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.20.0/24 \
    --availability-zone ${AWS_REGION}a \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-db-subnet-1a},{Key=Project,Value=${PROJECT_NAME}},{Key=Type,Value=PrivateDB}]" \
    --query 'Subnet.SubnetId' \
    --output text)

PRIVATE_DB_SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.21.0/24 \
    --availability-zone ${AWS_REGION}c \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-db-subnet-1c},{Key=Project,Value=${PROJECT_NAME}},{Key=Type,Value=PrivateDB}]" \
    --query 'Subnet.SubnetId' \
    --output text)

echo_success "所有子网创建成功"

# 4. 创建NAT Gateway
echo_info "步骤4: 创建NAT Gateway..."

# 为NAT Gateway分配弹性IP
EIP_1_ID=$(aws ec2 allocate-address \
    --domain vpc \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${PROJECT_NAME}-nat-eip-1},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'AllocationId' \
    --output text)

EIP_2_ID=$(aws ec2 allocate-address \
    --domain vpc \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${PROJECT_NAME}-nat-eip-2},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'AllocationId' \
    --output text)

# 创建NAT Gateway (不支持创建时标签)
NAT_GW_1_ID=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1_ID \
    --allocation-id $EIP_1_ID \
    --region $AWS_REGION \
    --query 'NatGateway.NatGatewayId' \
    --output text)

# 为NAT Gateway 1添加标签
aws ec2 create-tags \
    --resources $NAT_GW_1_ID \
    --tags Key=Name,Value=${PROJECT_NAME}-nat-gw-1a Key=Project,Value=${PROJECT_NAME} \
    --region $AWS_REGION

NAT_GW_2_ID=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_2_ID \
    --allocation-id $EIP_2_ID \
    --region $AWS_REGION \
    --query 'NatGateway.NatGatewayId' \
    --output text)

# 为NAT Gateway 2添加标签
aws ec2 create-tags \
    --resources $NAT_GW_2_ID \
    --tags Key=Name,Value=${PROJECT_NAME}-nat-gw-1c Key=Project,Value=${PROJECT_NAME} \
    --region $AWS_REGION

echo_success "NAT Gateway创建成功"

# 等待NAT Gateway可用
echo_info "等待NAT Gateway可用..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_1_ID --region $AWS_REGION
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_2_ID --region $AWS_REGION

# 5. 创建路由表
echo_info "步骤5: 创建路由表..."

# 公共路由表
PUBLIC_RT_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-rt},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'RouteTable.RouteTableId' \
    --output text)

# 私有应用路由表
PRIVATE_APP_RT_1_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-app-rt-1a},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'RouteTable.RouteTableId' \
    --output text)

PRIVATE_APP_RT_2_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-app-rt-1c},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'RouteTable.RouteTableId' \
    --output text)

# 私有数据库路由表
PRIVATE_DB_RT_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-db-rt},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'RouteTable.RouteTableId' \
    --output text)

# 配置路由
aws ec2 create-route --route-table-id $PUBLIC_RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --region $AWS_REGION
aws ec2 create-route --route-table-id $PRIVATE_APP_RT_1_ID --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_GW_1_ID --region $AWS_REGION
aws ec2 create-route --route-table-id $PRIVATE_APP_RT_2_ID --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_GW_2_ID --region $AWS_REGION

# 关联子网到路由表
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_1_ID --route-table-id $PUBLIC_RT_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_2_ID --route-table-id $PUBLIC_RT_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $PRIVATE_APP_SUBNET_1_ID --route-table-id $PRIVATE_APP_RT_1_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $PRIVATE_APP_SUBNET_2_ID --route-table-id $PRIVATE_APP_RT_2_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $PRIVATE_DB_SUBNET_1_ID --route-table-id $PRIVATE_DB_RT_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $PRIVATE_DB_SUBNET_2_ID --route-table-id $PRIVATE_DB_RT_ID --region $AWS_REGION

echo_success "路由表配置完成"

# 6. 创建安全组
echo_info "步骤6: 创建安全组..."

# ALB安全组
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name ${PROJECT_NAME}-alb-sg \
    --description "Security group for ${PROJECT_NAME} ALB" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-alb-sg},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'GroupId' \
    --output text)

# ECS应用安全组
ECS_SG_ID=$(aws ec2 create-security-group \
    --group-name ${PROJECT_NAME}-ecs-sg \
    --description "Security group for ${PROJECT_NAME} ECS tasks" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-ecs-sg},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'GroupId' \
    --output text)

# RDS数据库安全组
RDS_SG_ID=$(aws ec2 create-security-group \
    --group-name ${PROJECT_NAME}-rds-sg \
    --description "Security group for ${PROJECT_NAME} RDS database" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-rds-sg},{Key=Project,Value=${PROJECT_NAME}}]" \
    --query 'GroupId' \
    --output text)

# 配置安全组规则
# ALB安全组：允许HTTP和HTTPS
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION

# ECS安全组：允许来自ALB的流量
aws ec2 authorize-security-group-ingress --group-id $ECS_SG_ID --protocol tcp --port 3000 --source-group $ALB_SG_ID --region $AWS_REGION

# RDS安全组：允许来自ECS的PostgreSQL流量
aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $ECS_SG_ID --region $AWS_REGION

echo_success "安全组创建完成"

# 7. 创建RDS子网组
echo_info "步骤7: 创建RDS子网组..."
aws rds create-db-subnet-group \
    --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
    --db-subnet-group-description "Database subnet group for ${PROJECT_NAME}" \
    --subnet-ids $PRIVATE_DB_SUBNET_1_ID $PRIVATE_DB_SUBNET_2_ID \
    --region $AWS_REGION \
    --tags "Key=Name,Value=${PROJECT_NAME}-db-subnet-group" "Key=Project,Value=${PROJECT_NAME}"

echo_success "RDS子网组创建完成"

# 8. 创建RDS PostgreSQL数据库
echo_info "步骤8: 创建RDS PostgreSQL数据库..."
DB_INSTANCE_ID="${PROJECT_NAME}-postgres"

# 生成随机密码
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.7 \
    --master-username omnilaze \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --storage-type gp2 \
    --storage-encrypted \
    --vpc-security-group-ids $RDS_SG_ID \
    --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
    --backup-retention-period 7 \
    --no-publicly-accessible \
    --region $AWS_REGION \
    --tags "Key=Name,Value=${PROJECT_NAME}-postgres" "Key=Project,Value=${PROJECT_NAME}"

echo_success "RDS数据库创建中..."

# 9. 创建SSL证书
echo_info "步骤9: 创建SSL证书..."
CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --validation-method DNS \
    --region $AWS_REGION \
    --tags "Key=Name,Value=${PROJECT_NAME}-ssl-cert" "Key=Project,Value=${PROJECT_NAME}" \
    --query 'CertificateArn' \
    --output text)

echo_success "SSL证书请求已创建: $CERT_ARN"
echo_warning "请在DNS提供商处添加证书验证记录以完成验证"

# 10. 创建Application Load Balancer
echo_info "步骤10: 创建Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name ${PROJECT_NAME}-alb \
    --subnets $PUBLIC_SUBNET_1_ID $PUBLIC_SUBNET_2_ID \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region $AWS_REGION \
    --tags "Key=Name,Value=${PROJECT_NAME}-alb" "Key=Project,Value=${PROJECT_NAME}" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# 创建目标组
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name ${PROJECT_NAME}-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path /v1/health \
    --health-check-protocol HTTP \
    --health-check-port 3000 \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $AWS_REGION \
    --tags "Key=Name,Value=${PROJECT_NAME}-tg" "Key=Project,Value=${PROJECT_NAME}" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# 创建HTTP监听器（重定向到HTTPS）
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
    --region $AWS_REGION

# 创建HTTPS监听器（等待证书验证后手动添加）
echo_warning "HTTPS监听器需要在SSL证书验证完成后手动创建"

# 获取ALB DNS名称
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo_success "Application Load Balancer创建完成"

# 11. 创建ECS集群
echo_info "步骤11: 创建ECS集群..."
aws ecs create-cluster \
    --cluster-name ${PROJECT_NAME}-cluster \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
    --region $AWS_REGION \
    --tags "key=Name,value=${PROJECT_NAME}-cluster" "key=Project,value=${PROJECT_NAME}"

echo_success "ECS集群创建完成"

# 12. 将数据库密码存储到AWS Secrets Manager
echo_info "步骤12: 存储数据库密码到AWS Secrets Manager..."
SECRET_ARN=$(aws secretsmanager create-secret \
    --name "${PROJECT_NAME}/db/password" \
    --description "Database password for ${PROJECT_NAME}" \
    --secret-string "$DB_PASSWORD" \
    --region $AWS_REGION \
    --tags '[{"Key":"Name","Value":"'${PROJECT_NAME}'-db-password"},{"Key":"Project","Value":"'${PROJECT_NAME}'"}]' \
    --query 'ARN' \
    --output text)

echo_success "数据库密码已存储到Secrets Manager"

# 等待数据库可用
echo_info "等待RDS数据库可用（这可能需要10-15分钟）..."
aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID --region $AWS_REGION

# 获取数据库端点
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --region $AWS_REGION \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo_success "RDS数据库已可用"

# 输出所有重要信息
echo ""
echo_success "🎉 AWS基础设施创建完成！"
echo ""
echo "📋 创建的资源ID："
echo "-----------------------------------"
echo "VPC ID: $VPC_ID"
echo "公共子网1 ID: $PUBLIC_SUBNET_1_ID"
echo "公共子网2 ID: $PUBLIC_SUBNET_2_ID"
echo "私有应用子网1 ID: $PRIVATE_APP_SUBNET_1_ID"
echo "私有应用子网2 ID: $PRIVATE_APP_SUBNET_2_ID"
echo "私有数据库子网1 ID: $PRIVATE_DB_SUBNET_1_ID"
echo "私有数据库子网2 ID: $PRIVATE_DB_SUBNET_2_ID"
echo "ALB安全组 ID: $ALB_SG_ID"
echo "ECS安全组 ID: $ECS_SG_ID"
echo "RDS安全组 ID: $RDS_SG_ID"
echo "ALB ARN: $ALB_ARN"
echo "目标组 ARN: $TARGET_GROUP_ARN"
echo "SSL证书 ARN: $CERT_ARN"
echo "数据库端点: $DB_ENDPOINT"
echo "Secrets Manager ARN: $SECRET_ARN"
echo "-----------------------------------"
echo ""
echo "🌐 访问信息："
echo "ALB DNS名称: $ALB_DNS"
echo "后端域名: $DOMAIN_NAME (需要配置DNS指向ALB)"
echo "数据库用户名: omnilaze"
echo "数据库密码已存储在: ${PROJECT_NAME}/db/password"
echo ""
echo "📝 下一步操作："
echo "1. 在DNS提供商处验证SSL证书"
echo "2. 创建CNAME记录: $DOMAIN_NAME -> $ALB_DNS"
echo "3. 验证证书后创建HTTPS监听器"
echo "4. 配置ECS服务任务定义"
echo "5. 部署应用到ECS"
echo ""
echo "💾 将以下环境变量保存用于部署脚本："
echo "export VPC_ID=\"$VPC_ID\""
echo "export PRIVATE_APP_SUBNET_1_ID=\"$PRIVATE_APP_SUBNET_1_ID\""
echo "export PRIVATE_APP_SUBNET_2_ID=\"$PRIVATE_APP_SUBNET_2_ID\""
echo "export ECS_SG_ID=\"$ECS_SG_ID\""
echo "export TARGET_GROUP_ARN=\"$TARGET_GROUP_ARN\""
echo "export DB_ENDPOINT=\"$DB_ENDPOINT\""
echo "export SECRET_ARN=\"$SECRET_ARN\""
echo "export CERT_ARN=\"$CERT_ARN\""