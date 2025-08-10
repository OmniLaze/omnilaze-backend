#!/bin/bash

# AWS Infrastructure Setup for OmniLaze Backend
# 运行前请确保配置了正确的 AWS CLI 和权限

set -e

REGION="ap-southeast-1"
CLUSTER_NAME="omnilaze-cluster"
SERVICE_NAME="omnilaze-service"
ALB_NAME="omnilaze-alb"
TARGET_GROUP_NAME="omnilaze-tg"
VPC_ID=""  # 需要填入你的VPC ID
SUBNET_1="subnet-07ab212afbbe02e7b"
SUBNET_2="subnet-07eea72bcd3edc366"
SECURITY_GROUP="sg-0c2b8bf2621aaf6dc"

echo "🚀 开始设置 AWS 基础设施..."

# 1. 获取VPC ID (从子网获取)
echo "📋 获取 VPC 信息..."
VPC_ID=$(aws ec2 describe-subnets --region $REGION --subnet-ids $SUBNET_1 --query 'Subnets[0].VpcId' --output text)
echo "VPC ID: $VPC_ID"

# 2. 创建 Application Load Balancer
echo "🔧 创建 Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --region $REGION \
  --name $ALB_NAME \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $SECURITY_GROUP \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB ARN: $ALB_ARN"

# 3. 创建 Target Group
echo "🎯 创建 Target Group..."
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --region $REGION \
  --name $TARGET_GROUP_NAME \
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
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group ARN: $TARGET_GROUP_ARN"

# 4. 创建 Listener
echo "👂 创建 ALB Listener..."
aws elbv2 create-listener \
  --region $REGION \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN

# 5. 获取 ALB DNS 名称
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --region $REGION \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "🎉 ALB DNS: $ALB_DNS"

# 6. 更新 ECS 服务以使用 ALB
echo "🔄 更新 ECS 服务配置..."
aws ecs update-service \
  --region $REGION \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=omnilaze-backend,containerPort=3000 \
  --desired-count 1

echo "✅ 基础设施设置完成！"
echo ""
echo "🌐 你的 ALB 域名: http://$ALB_DNS"
echo "🏥 健康检查: http://$ALB_DNS/v1/health"
echo "📚 API 文档: http://$ALB_DNS/v1/api"
echo ""
echo "⏰ 等待几分钟让服务启动，然后测试上面的链接。"
