#!/usr/bin/env bash
set -eo pipefail

# ====== OmniLaze AWS 基础设施管理工具 ======
# 这个脚本整合了所有基础设施管理功能：创建、验证、清理

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
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 显示帮助信息
show_help() {
    echo "🏗️  OmniLaze AWS 基础设施管理工具"
    echo ""
    echo "使用方法:"
    echo "  $0 setup       # 创建完整的 AWS 基础设施"
    echo "  $0 validate    # 验证基础设施是否正确部署"
    echo "  $0 https       # 配置 HTTPS 监听器（需要 SSL 证书已验证）"
    echo "  $0 cleanup     # ⚠️  删除所有基础设施（不可逆）"
    echo "  $0 status      # 显示当前基础设施状态"
    echo ""
    echo "环境变量:"
    echo "  AWS_REGION     # 默认: ap-southeast-1"
    echo "  PROJECT_NAME   # 默认: omnilaze"
    echo "  DOMAIN_NAME    # 默认: backend.omnilaze.co"
    echo ""
}

# 检查 AWS CLI 和权限
check_aws_prerequisites() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI 未安装"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI 未配置或权限不足"
        exit 1
    fi

    local account_id=$(aws sts get-caller-identity --query Account --output text)
    if [ "$account_id" != "$AWS_ACCOUNT_ID" ]; then
        log_warn "账号 ID 不匹配: 预期 $AWS_ACCOUNT_ID, 实际 $account_id"
    fi

    aws configure set region "$AWS_REGION"
    log_success "AWS CLI 配置验证通过"
}

# 检查资源是否存在
check_resource_exists() {
    local resource_type=$1
    local resource_name=$2
    local check_command=$3
    
    if eval "$check_command" &> /dev/null; then
        return 0  # 存在
    else
        return 1  # 不存在
    fi
}

# 创建基础设施
setup_infrastructure() {
    log_info "开始创建 OmniLaze AWS 基础设施..."
    
    # 1. 创建 VPC
    log_info "创建 VPC..."
    if ! check_resource_exists "vpc" "$PROJECT_NAME-vpc" "aws ec2 describe-vpcs --filters Name=tag:Name,Values=$PROJECT_NAME-vpc --query 'Vpcs[0].VpcId' --output text"; then
        VPC_ID=$(aws ec2 create-vpc \
            --cidr-block 10.0.0.0/16 \
            --query 'Vpc.VpcId' \
            --output text)
        aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=$PROJECT_NAME-vpc Key=Project,Value=$PROJECT_NAME
        aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
        aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support
        log_success "VPC 已创建: $VPC_ID"
    else
        VPC_ID=$(aws ec2 describe-vpcs --filters Name=tag:Name,Values=$PROJECT_NAME-vpc --query 'Vpcs[0].VpcId' --output text)
        log_info "VPC 已存在: $VPC_ID"
    fi

    # 2. 创建 Internet Gateway
    log_info "创建 Internet Gateway..."
    if ! check_resource_exists "igw" "$PROJECT_NAME-igw" "aws ec2 describe-internet-gateways --filters Name=tag:Name,Values=$PROJECT_NAME-igw --query 'InternetGateways[0].InternetGatewayId' --output text"; then
        IGW_ID=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
        aws ec2 create-tags --resources $IGW_ID --tags Key=Name,Value=$PROJECT_NAME-igw Key=Project,Value=$PROJECT_NAME
        aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
        log_success "Internet Gateway 已创建: $IGW_ID"
    else
        IGW_ID=$(aws ec2 describe-internet-gateways --filters Name=tag:Name,Values=$PROJECT_NAME-igw --query 'InternetGateways[0].InternetGatewayId' --output text)
        log_info "Internet Gateway 已存在: $IGW_ID"
    fi

    # 3. 创建公共子网
    log_info "创建公共子网..."
    PUBLIC_SUBNET_1_ID=$(create_subnet_if_not_exists "$PROJECT_NAME-public-1a" "10.0.1.0/24" "${AWS_REGION}a")
    PUBLIC_SUBNET_2_ID=$(create_subnet_if_not_exists "$PROJECT_NAME-public-1c" "10.0.2.0/24" "${AWS_REGION}c")
    
    # 4. 创建私有应用子网
    log_info "创建私有应用子网..."
    PRIVATE_APP_SUBNET_1_ID=$(create_subnet_if_not_exists "$PROJECT_NAME-private-app-1a" "10.0.10.0/24" "${AWS_REGION}a")
    PRIVATE_APP_SUBNET_2_ID=$(create_subnet_if_not_exists "$PROJECT_NAME-private-app-1c" "10.0.12.0/24" "${AWS_REGION}c")
    
    # 5. 创建私有数据库子网
    log_info "创建私有数据库子网..."
    PRIVATE_DB_SUBNET_1_ID=$(create_subnet_if_not_exists "$PROJECT_NAME-private-db-1a" "10.0.20.0/24" "${AWS_REGION}a")
    PRIVATE_DB_SUBNET_2_ID=$(create_subnet_if_not_exists "$PROJECT_NAME-private-db-1c" "10.0.21.0/24" "${AWS_REGION}c")

    # 6. 创建路由表
    create_route_tables

    # 7. 创建 NAT Gateways
    create_nat_gateways

    # 8. 创建安全组
    create_security_groups

    # 9. 创建 RDS 子网组
    create_rds_subnet_group

    # 10. 创建 RDS 实例
    create_rds_instance

    # 11. 创建 ALB
    create_application_load_balancer

    # 12. 创建 ECS 集群
    create_ecs_cluster

    # 13. 申请 SSL 证书
    create_ssl_certificate

    log_success "基础设施创建完成！"
    print_infrastructure_summary
}

# 创建子网的辅助函数
create_subnet_if_not_exists() {
    local name=$1
    local cidr=$2
    local az=$3
    
    if check_resource_exists "subnet" "$name" "aws ec2 describe-subnets --filters Name=tag:Name,Values=$name --query 'Subnets[0].SubnetId' --output text"; then
        local subnet_id=$(aws ec2 describe-subnets --filters Name=tag:Name,Values=$name --query 'Subnets[0].SubnetId' --output text)
        log_info "子网 $name 已存在: $subnet_id"
        echo $subnet_id
    else
        local subnet_id=$(aws ec2 create-subnet \
            --vpc-id $VPC_ID \
            --cidr-block $cidr \
            --availability-zone $az \
            --query 'Subnet.SubnetId' \
            --output text)
        aws ec2 create-tags --resources $subnet_id --tags Key=Name,Value=$name Key=Project,Value=$PROJECT_NAME
        log_success "子网 $name 已创建: $subnet_id"
        echo $subnet_id
    fi
}

# 创建路由表
create_route_tables() {
    log_info "创建路由表..."
    
    # 公共路由表
    if ! check_resource_exists "route-table" "$PROJECT_NAME-public-rt" "aws ec2 describe-route-tables --filters Name=tag:Name,Values=$PROJECT_NAME-public-rt --query 'RouteTables[0].RouteTableId' --output text"; then
        PUBLIC_RT_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text)
        aws ec2 create-tags --resources $PUBLIC_RT_ID --tags Key=Name,Value=$PROJECT_NAME-public-rt Key=Project,Value=$PROJECT_NAME
        aws ec2 create-route --route-table-id $PUBLIC_RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID
        aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_1_ID --route-table-id $PUBLIC_RT_ID
        aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_2_ID --route-table-id $PUBLIC_RT_ID
        log_success "公共路由表已创建: $PUBLIC_RT_ID"
    fi
}

# 创建 NAT Gateways
create_nat_gateways() {
    log_info "创建 NAT Gateways..."
    
    # 创建弹性 IP
    EIP_1=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
    EIP_2=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
    
    # 创建 NAT Gateway
    NAT_1_ID=$(aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET_1_ID --allocation-id $EIP_1 --query 'NatGateway.NatGatewayId' --output text)
    NAT_2_ID=$(aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET_2_ID --allocation-id $EIP_2 --query 'NatGateway.NatGatewayId' --output text)
    
    log_success "NAT Gateways 已创建: $NAT_1_ID, $NAT_2_ID"
    
    # 等待 NAT Gateway 就绪
    log_info "等待 NAT Gateways 就绪..."
    aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_1_ID $NAT_2_ID
    
    # 创建私有路由表
    PRIVATE_RT_1_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text)
    PRIVATE_RT_2_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text)
    
    aws ec2 create-tags --resources $PRIVATE_RT_1_ID --tags Key=Name,Value=$PROJECT_NAME-private-rt-1a Key=Project,Value=$PROJECT_NAME
    aws ec2 create-tags --resources $PRIVATE_RT_2_ID --tags Key=Name,Value=$PROJECT_NAME-private-rt-1c Key=Project,Value=$PROJECT_NAME
    
    aws ec2 create-route --route-table-id $PRIVATE_RT_1_ID --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_1_ID
    aws ec2 create-route --route-table-id $PRIVATE_RT_2_ID --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_2_ID
    
    aws ec2 associate-route-table --subnet-id $PRIVATE_APP_SUBNET_1_ID --route-table-id $PRIVATE_RT_1_ID
    aws ec2 associate-route-table --subnet-id $PRIVATE_APP_SUBNET_2_ID --route-table-id $PRIVATE_RT_2_ID
    aws ec2 associate-route-table --subnet-id $PRIVATE_DB_SUBNET_1_ID --route-table-id $PRIVATE_RT_1_ID
    aws ec2 associate-route-table --subnet-id $PRIVATE_DB_SUBNET_2_ID --route-table-id $PRIVATE_RT_2_ID
}

# 创建安全组
create_security_groups() {
    log_info "创建安全组..."
    
    # ALB 安全组
    if ! check_resource_exists "security-group" "$PROJECT_NAME-alb-sg" "aws ec2 describe-security-groups --filters Name=group-name,Values=$PROJECT_NAME-alb-sg --query 'SecurityGroups[0].GroupId' --output text"; then
        ALB_SG_ID=$(aws ec2 create-security-group \
            --group-name $PROJECT_NAME-alb-sg \
            --description "Security group for $PROJECT_NAME ALB" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text)
        aws ec2 create-tags --resources $ALB_SG_ID --tags Key=Name,Value=$PROJECT_NAME-alb-sg Key=Project,Value=$PROJECT_NAME
        aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
        log_success "ALB 安全组已创建: $ALB_SG_ID"
    else
        ALB_SG_ID=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$PROJECT_NAME-alb-sg --query 'SecurityGroups[0].GroupId' --output text)
    fi
    
    # ECS 安全组
    if ! check_resource_exists "security-group" "$PROJECT_NAME-ecs-sg" "aws ec2 describe-security-groups --filters Name=group-name,Values=$PROJECT_NAME-ecs-sg --query 'SecurityGroups[0].GroupId' --output text"; then
        ECS_SG_ID=$(aws ec2 create-security-group \
            --group-name $PROJECT_NAME-ecs-sg \
            --description "Security group for $PROJECT_NAME ECS" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text)
        aws ec2 create-tags --resources $ECS_SG_ID --tags Key=Name,Value=$PROJECT_NAME-ecs-sg Key=Project,Value=$PROJECT_NAME
        aws ec2 authorize-security-group-ingress --group-id $ECS_SG_ID --protocol tcp --port 3000 --source-group $ALB_SG_ID
        log_success "ECS 安全组已创建: $ECS_SG_ID"
    else
        ECS_SG_ID=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$PROJECT_NAME-ecs-sg --query 'SecurityGroups[0].GroupId' --output text)
    fi
    
    # RDS 安全组
    if ! check_resource_exists "security-group" "$PROJECT_NAME-rds-sg" "aws ec2 describe-security-groups --filters Name=group-name,Values=$PROJECT_NAME-rds-sg --query 'SecurityGroups[0].GroupId' --output text"; then
        RDS_SG_ID=$(aws ec2 create-security-group \
            --group-name $PROJECT_NAME-rds-sg \
            --description "Security group for $PROJECT_NAME RDS" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text)
        aws ec2 create-tags --resources $RDS_SG_ID --tags Key=Name,Value=$PROJECT_NAME-rds-sg Key=Project,Value=$PROJECT_NAME
        aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $ECS_SG_ID
        log_success "RDS 安全组已创建: $RDS_SG_ID"
    else
        RDS_SG_ID=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$PROJECT_NAME-rds-sg --query 'SecurityGroups[0].GroupId' --output text)
    fi
}

# 创建 RDS 子网组
create_rds_subnet_group() {
    log_info "创建 RDS 子网组..."
    
    if ! aws rds describe-db-subnet-groups --db-subnet-group-name $PROJECT_NAME-db-subnet-group &> /dev/null; then
        aws rds create-db-subnet-group \
            --db-subnet-group-name $PROJECT_NAME-db-subnet-group \
            --db-subnet-group-description "Subnet group for $PROJECT_NAME database" \
            --subnet-ids $PRIVATE_DB_SUBNET_1_ID $PRIVATE_DB_SUBNET_2_ID \
            --tags Key=Name,Value=$PROJECT_NAME-db-subnet-group Key=Project,Value=$PROJECT_NAME
        log_success "RDS 子网组已创建: $PROJECT_NAME-db-subnet-group"
    else
        log_info "RDS 子网组已存在: $PROJECT_NAME-db-subnet-group"
    fi
}

# 创建 RDS 实例
create_rds_instance() {
    log_info "创建 RDS PostgreSQL 实例..."
    
    if ! aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-postgres &> /dev/null; then
        aws rds create-db-instance \
            --db-instance-identifier $PROJECT_NAME-postgres \
            --db-instance-class db.t3.micro \
            --engine postgres \
            --engine-version 15.7 \
            --allocated-storage 20 \
            --storage-type gp2 \
            --master-username postgres \
            --master-user-password "Omnilaze2024!" \
            --db-name omnilaze \
            --vpc-security-group-ids $RDS_SG_ID \
            --db-subnet-group-name $PROJECT_NAME-db-subnet-group \
            --backup-retention-period 7 \
            --storage-encrypted \
            --copy-tags-to-snapshot \
            --tags Key=Name,Value=$PROJECT_NAME-postgres Key=Project,Value=$PROJECT_NAME
        
        log_info "等待 RDS 实例创建完成（约 10-15 分钟）..."
        aws rds wait db-instance-available --db-instance-identifier $PROJECT_NAME-postgres
        log_success "RDS 实例已创建: $PROJECT_NAME-postgres"
    else
        log_info "RDS 实例已存在: $PROJECT_NAME-postgres"
    fi
    
    DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-postgres --query 'DBInstances[0].Endpoint.Address' --output text)
    log_success "数据库端点: $DB_ENDPOINT"
}

# 创建 Application Load Balancer
create_application_load_balancer() {
    log_info "创建 Application Load Balancer..."
    
    if ! aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb &> /dev/null; then
        ALB_ARN=$(aws elbv2 create-load-balancer \
            --name $PROJECT_NAME-alb \
            --subnets $PUBLIC_SUBNET_1_ID $PUBLIC_SUBNET_2_ID \
            --security-groups $ALB_SG_ID \
            --tags Key=Name,Value=$PROJECT_NAME-alb Key=Project,Value=$PROJECT_NAME \
            --query 'LoadBalancers[0].LoadBalancerArn' \
            --output text)
        
        TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
            --name $PROJECT_NAME-tg \
            --protocol HTTP \
            --port 3000 \
            --vpc-id $VPC_ID \
            --target-type ip \
            --health-check-path /v1/health \
            --tags Key=Name,Value=$PROJECT_NAME-tg Key=Project,Value=$PROJECT_NAME \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text)
        
        aws elbv2 create-listener \
            --load-balancer-arn $ALB_ARN \
            --protocol HTTP \
            --port 80 \
            --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
        
        log_success "ALB 已创建: $ALB_ARN"
        log_success "目标组已创建: $TARGET_GROUP_ARN"
    else
        ALB_ARN=$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text)
        TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names $PROJECT_NAME-tg --query 'TargetGroups[0].TargetGroupArn' --output text)
        log_info "ALB 已存在: $ALB_ARN"
    fi
}

# 创建 ECS 集群
create_ecs_cluster() {
    log_info "创建 ECS 集群..."
    
    if ! aws ecs describe-clusters --clusters $PROJECT_NAME-cluster --query 'clusters[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
        aws ecs create-cluster --cluster-name $PROJECT_NAME-cluster --tags key=Name,value=$PROJECT_NAME-cluster key=Project,value=$PROJECT_NAME
        log_success "ECS 集群已创建: $PROJECT_NAME-cluster"
    else
        log_info "ECS 集群已存在: $PROJECT_NAME-cluster"
    fi
}

# 申请 SSL 证书
create_ssl_certificate() {
    log_info "申请 SSL 证书..."
    
    CERT_ARN=$(aws acm request-certificate \
        --domain-name $DOMAIN_NAME \
        --validation-method DNS \
        --key-algorithm RSA_2048 \
        --query 'CertificateArn' \
        --output text)
    
    log_success "SSL 证书已申请: $CERT_ARN"
    log_warn "请在 DNS 提供商处添加验证记录，然后运行: $0 https"
    
    # 显示 DNS 验证记录
    sleep 5
    aws acm describe-certificate \
        --certificate-arn "$CERT_ARN" \
        --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
        --output table
}

# 打印基础设施摘要
print_infrastructure_summary() {
    echo ""
    log_success "🎉 基础设施创建完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 创建的资源摘要:"
    echo ""
    echo "🌐 网络资源:"
    echo "   VPC ID: ${VPC_ID:-未创建}"
    echo "   公共子网: ${PUBLIC_SUBNET_1_ID:-未创建}, ${PUBLIC_SUBNET_2_ID:-未创建}"
    echo "   私有应用子网: ${PRIVATE_APP_SUBNET_1_ID:-未创建}, ${PRIVATE_APP_SUBNET_2_ID:-未创建}"
    echo "   私有数据库子网: ${PRIVATE_DB_SUBNET_1_ID:-未创建}, ${PRIVATE_DB_SUBNET_2_ID:-未创建}"
    echo ""
    echo "🔒 安全组:"
    echo "   ALB 安全组: ${ALB_SG_ID:-未创建}"
    echo "   ECS 安全组: ${ECS_SG_ID:-未创建}"
    echo "   RDS 安全组: ${RDS_SG_ID:-未创建}"
    echo ""
    echo "🗃️  数据库:"
    echo "   RDS 实例: $PROJECT_NAME-postgres"
    echo "   数据库端点: ${DB_ENDPOINT:-未创建}"
    echo ""
    echo "⚖️  负载均衡器:"
    echo "   ALB ARN: ${ALB_ARN:-未创建}"
    echo "   目标组 ARN: ${TARGET_GROUP_ARN:-未创建}"
    echo ""
    echo "🚀 容器服务:"
    echo "   ECS 集群: $PROJECT_NAME-cluster"
    echo ""
    echo "🔐 SSL 证书:"
    echo "   证书 ARN: ${CERT_ARN:-未申请}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "下一步:"
    echo "1. 在 DNS 提供商处添加 SSL 证书验证记录"
    echo "2. 等待证书验证完成"
    echo "3. 运行: $0 https"
    echo "4. 配置域名 CNAME 记录指向 ALB"
}

# 验证基础设施
validate_infrastructure() {
    log_info "验证 OmniLaze 基础设施..."
    
    local all_good=true
    
    # 检查 VPC
    if check_resource_exists "vpc" "$PROJECT_NAME-vpc" "aws ec2 describe-vpcs --filters Name=tag:Name,Values=$PROJECT_NAME-vpc --query 'Vpcs[0].VpcId' --output text"; then
        log_success "VPC 运行正常"
    else
        log_error "VPC 不存在或配置错误"
        all_good=false
    fi
    
    # 检查 RDS
    if aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-postgres --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null | grep -q available; then
        log_success "RDS 实例运行正常"
        DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-postgres --query 'DBInstances[0].Endpoint.Address' --output text)
        echo "   数据库端点: $DB_ENDPOINT"
    else
        log_error "RDS 实例不可用"
        all_good=false
    fi
    
    # 检查 ALB
    if aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].State.Code' --output text 2>/dev/null | grep -q active; then
        log_success "ALB 运行正常"
        ALB_DNS=$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].DNSName' --output text)
        echo "   ALB DNS: $ALB_DNS"
    else
        log_error "ALB 不可用"
        all_good=false
    fi
    
    # 检查 ECS 集群
    if aws ecs describe-clusters --clusters $PROJECT_NAME-cluster --query 'clusters[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
        log_success "ECS 集群运行正常"
    else
        log_error "ECS 集群不可用"
        all_good=false
    fi
    
    # 检查 SSL 证书
    local cert_count=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" --output text | wc -l)
    if [ "$cert_count" -gt 0 ]; then
        log_success "SSL 证书已申请"
        CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" --output text)
        local cert_status=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --query 'Certificate.Status' --output text)
        echo "   证书状态: $cert_status"
        if [ "$cert_status" = "ISSUED" ]; then
            log_success "SSL 证书已验证"
        else
            log_warn "SSL 证书待验证"
        fi
    else
        log_warn "未找到 SSL 证书"
    fi
    
    if [ "$all_good" = true ]; then
        log_success "✅ 所有基础设施组件运行正常！"
    else
        log_error "❌ 部分基础设施组件存在问题"
        return 1
    fi
}

# 配置 HTTPS 监听器
configure_https() {
    log_info "配置 HTTPS 监听器..."
    
    # 获取资源 ID
    ALB_ARN=$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "")
    TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names $PROJECT_NAME-tg --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")
    CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" --output text 2>/dev/null || echo "")
    
    if [ -z "$ALB_ARN" ] || [ -z "$TARGET_GROUP_ARN" ] || [ -z "$CERT_ARN" ]; then
        log_error "缺少必要资源，请先运行 setup 命令"
        return 1
    fi
    
    # 检查证书状态
    local cert_status=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --query 'Certificate.Status' --output text)
    if [ "$cert_status" != "ISSUED" ]; then
        log_error "SSL 证书未验证，当前状态: $cert_status"
        log_info "请先在 DNS 提供商处添加验证记录"
        return 1
    fi
    
    # 创建 HTTPS 监听器
    if ! aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[?Port==`443`].ListenerArn' --output text | grep -q arn; then
        aws elbv2 create-listener \
            --load-balancer-arn "$ALB_ARN" \
            --protocol HTTPS \
            --port 443 \
            --certificates CertificateArn="$CERT_ARN" \
            --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN"
        log_success "HTTPS 监听器已创建"
    else
        log_info "HTTPS 监听器已存在"
    fi
    
    # 修改 HTTP 监听器为重定向到 HTTPS
    local http_listener=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[?Port==`80`].ListenerArn' --output text)
    if [ -n "$http_listener" ]; then
        aws elbv2 modify-listener \
            --listener-arn "$http_listener" \
            --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}"
        log_success "HTTP 自动重定向到 HTTPS 已配置"
    fi
    
    log_success "HTTPS 配置完成！"
    
    ALB_DNS=$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].DNSName' --output text)
    echo ""
    log_info "下一步: 在 DNS 提供商处创建 CNAME 记录"
    echo "   名称: $(echo $DOMAIN_NAME | sed 's/\.[^.]*\.[^.]*$//')"
    echo "   值: $ALB_DNS"
}

# 显示状态
show_status() {
    log_info "OmniLaze 基础设施状态概览"
    echo ""
    
    # VPC 状态
    if check_resource_exists "vpc" "$PROJECT_NAME-vpc" "aws ec2 describe-vpcs --filters Name=tag:Name,Values=$PROJECT_NAME-vpc --query 'Vpcs[0].VpcId' --output text"; then
        VPC_ID=$(aws ec2 describe-vpcs --filters Name=tag:Name,Values=$PROJECT_NAME-vpc --query 'Vpcs[0].VpcId' --output text)
        echo "🌐 VPC: ✅ $VPC_ID"
    else
        echo "🌐 VPC: ❌ 不存在"
    fi
    
    # RDS 状态
    if aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-postgres &> /dev/null; then
        local rds_status=$(aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-postgres --query 'DBInstances[0].DBInstanceStatus' --output text)
        if [ "$rds_status" = "available" ]; then
            echo "🗃️  RDS: ✅ $rds_status"
        else
            echo "🗃️  RDS: ⏳ $rds_status"
        fi
    else
        echo "🗃️  RDS: ❌ 不存在"
    fi
    
    # ALB 状态
    if aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb &> /dev/null; then
        local alb_status=$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].State.Code' --output text)
        if [ "$alb_status" = "active" ]; then
            echo "⚖️  ALB: ✅ $alb_status"
        else
            echo "⚖️  ALB: ⏳ $alb_status"
        fi
    else
        echo "⚖️  ALB: ❌ 不存在"
    fi
    
    # ECS 状态
    if aws ecs describe-clusters --clusters $PROJECT_NAME-cluster --query 'clusters[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
        echo "🚀 ECS: ✅ ACTIVE"
    else
        echo "🚀 ECS: ❌ 不存在或不活跃"
    fi
    
    # SSL 证书状态
    local cert_arn=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" --output text 2>/dev/null || echo "")
    if [ -n "$cert_arn" ]; then
        local cert_status=$(aws acm describe-certificate --certificate-arn "$cert_arn" --query 'Certificate.Status' --output text)
        if [ "$cert_status" = "ISSUED" ]; then
            echo "🔐 SSL: ✅ $cert_status"
        else
            echo "🔐 SSL: ⏳ $cert_status"
        fi
    else
        echo "🔐 SSL: ❌ 不存在"
    fi
}

# 清理基础设施
cleanup_infrastructure() {
    log_warn "⚠️  即将删除所有 OmniLaze 基础设施"
    log_warn "此操作不可逆，将删除所有数据！"
    echo ""
    read -p "请输入项目名称 '$PROJECT_NAME' 确认删除: " confirm
    if [ "$confirm" != "$PROJECT_NAME" ]; then
        log_info "操作已取消"
        return 0
    fi
    
    log_info "开始删除基础设施..."
    
    # 删除 ECS 服务和集群
    log_info "删除 ECS 资源..."
    if aws ecs describe-services --cluster $PROJECT_NAME-cluster --services $PROJECT_NAME-service &> /dev/null; then
        aws ecs update-service --cluster $PROJECT_NAME-cluster --service $PROJECT_NAME-service --desired-count 0
        aws ecs wait services-stable --cluster $PROJECT_NAME-cluster --services $PROJECT_NAME-service
        aws ecs delete-service --cluster $PROJECT_NAME-cluster --service $PROJECT_NAME-service
    fi
    if aws ecs describe-clusters --clusters $PROJECT_NAME-cluster --query 'clusters[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
        aws ecs delete-cluster --cluster $PROJECT_NAME-cluster
    fi
    
    # 删除 ALB 和目标组
    log_info "删除 ALB 资源..."
    if aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb &> /dev/null; then
        ALB_ARN=$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text)
        aws elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN"
        aws elbv2 wait load-balancer-not-exists --load-balancer-arns "$ALB_ARN"
    fi
    if aws elbv2 describe-target-groups --names $PROJECT_NAME-tg &> /dev/null; then
        TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names $PROJECT_NAME-tg --query 'TargetGroups[0].TargetGroupArn' --output text)
        aws elbv2 delete-target-group --target-group-arn "$TARGET_GROUP_ARN"
    fi
    
    # 删除 RDS 实例
    log_info "删除 RDS 实例..."
    if aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-postgres &> /dev/null; then
        aws rds delete-db-instance --db-instance-identifier $PROJECT_NAME-postgres --skip-final-snapshot
        log_info "等待 RDS 实例删除完成..."
        aws rds wait db-instance-deleted --db-instance-identifier $PROJECT_NAME-postgres
    fi
    if aws rds describe-db-subnet-groups --db-subnet-group-name $PROJECT_NAME-db-subnet-group &> /dev/null; then
        aws rds delete-db-subnet-group --db-subnet-group-name $PROJECT_NAME-db-subnet-group
    fi
    
    # 删除安全组
    log_info "删除安全组..."
    for sg_name in "$PROJECT_NAME-rds-sg" "$PROJECT_NAME-ecs-sg" "$PROJECT_NAME-alb-sg"; do
        if check_resource_exists "security-group" "$sg_name" "aws ec2 describe-security-groups --filters Name=group-name,Values=$sg_name --query 'SecurityGroups[0].GroupId' --output text"; then
            SG_ID=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$sg_name --query 'SecurityGroups[0].GroupId' --output text)
            aws ec2 delete-security-group --group-id "$SG_ID"
        fi
    done
    
    # 删除 NAT Gateways 和弹性 IP
    log_info "删除 NAT Gateways..."
    aws ec2 describe-nat-gateways --filter Name=tag:Project,Values=$PROJECT_NAME --query 'NatGateways[?State==`available`].NatGatewayId' --output text | while read nat_id; do
        if [ -n "$nat_id" ]; then
            aws ec2 delete-nat-gateway --nat-gateway-id "$nat_id"
        fi
    done
    
    # 删除 SSL 证书
    log_info "删除 SSL 证书..."
    CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" --output text 2>/dev/null || echo "")
    if [ -n "$CERT_ARN" ]; then
        aws acm delete-certificate --certificate-arn "$CERT_ARN"
    fi
    
    # 删除网络资源
    log_info "删除网络资源..."
    if check_resource_exists "vpc" "$PROJECT_NAME-vpc" "aws ec2 describe-vpcs --filters Name=tag:Name,Values=$PROJECT_NAME-vpc --query 'Vpcs[0].VpcId' --output text"; then
        VPC_ID=$(aws ec2 describe-vpcs --filters Name=tag:Name,Values=$PROJECT_NAME-vpc --query 'Vpcs[0].VpcId' --output text)
        
        # 删除路由表
        aws ec2 describe-route-tables --filters Name=vpc-id,Values=$VPC_ID Name=tag:Project,Values=$PROJECT_NAME --query 'RouteTables[?Main==`false`].RouteTableId' --output text | while read rt_id; do
            if [ -n "$rt_id" ]; then
                aws ec2 delete-route-table --route-table-id "$rt_id" || true
            fi
        done
        
        # 删除子网
        aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --query 'Subnets[].SubnetId' --output text | while read subnet_id; do
            if [ -n "$subnet_id" ]; then
                aws ec2 delete-subnet --subnet-id "$subnet_id"
            fi
        done
        
        # 删除 Internet Gateway
        aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=$VPC_ID --query 'InternetGateways[].InternetGatewayId' --output text | while read igw_id; do
            if [ -n "$igw_id" ]; then
                aws ec2 detach-internet-gateway --internet-gateway-id "$igw_id" --vpc-id "$VPC_ID"
                aws ec2 delete-internet-gateway --internet-gateway-id "$igw_id"
            fi
        done
        
        # 删除 VPC
        aws ec2 delete-vpc --vpc-id "$VPC_ID"
    fi
    
    # 释放弹性 IP
    log_info "释放弹性 IP..."
    aws ec2 describe-addresses --filters Name=tag:Project,Values=$PROJECT_NAME --query 'Addresses[].AllocationId' --output text | while read allocation_id; do
        if [ -n "$allocation_id" ]; then
            aws ec2 release-address --allocation-id "$allocation_id"
        fi
    done
    
    log_success "✅ 所有基础设施已删除"
}

# 主逻辑
case "${1:-""}" in
    "setup")
        check_aws_prerequisites
        setup_infrastructure
        ;;
    "validate")
        check_aws_prerequisites
        validate_infrastructure
        ;;
    "https")
        check_aws_prerequisites
        configure_https
        ;;
    "status")
        check_aws_prerequisites
        show_status
        ;;
    "cleanup")
        check_aws_prerequisites
        cleanup_infrastructure
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        log_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac