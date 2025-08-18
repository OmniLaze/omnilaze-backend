# AWS基础设施部署指南

## 概述

本指南提供了为OmniLaze应用创建完整AWS后端基础设施的脚本和步骤。

## 网络架构

基于迁移文档的网络设计：

- **VPC**: 10.0.0.0/16
- **公共子网**: 10.0.1.0/24 (1a), 10.0.2.0/24 (1c)
- **私有应用子网**: 10.0.10.0/24 (1a), 10.0.12.0/24 (1c)
- **私有数据库子网**: 10.0.20.0/24 (1a), 10.0.21.0/24 (1c)

## 脚本文件

### 1. 主基础设施脚本
**文件**: `setup-complete-aws-infrastructure.sh`

**功能**:
- 创建VPC和完整的网络架构
- 设置安全组（ALB、ECS、RDS）
- 创建RDS PostgreSQL数据库
- 创建Application Load Balancer
- 申请SSL证书
- 创建ECS集群
- 配置所有必要的AWS资源

**使用方法**:
```bash
./infra/setup-complete-aws-infrastructure.sh
```

**输出**: 所有创建的资源ID，用于后续配置

### 2. HTTPS配置脚本
**文件**: `setup-https-listener.sh`

**功能**:
- 验证SSL证书状态
- 创建HTTPS监听器
- 配置ALB的HTTPS终端

**使用方法**:
```bash
./infra/setup-https-listener.sh
```

**前提条件**: SSL证书必须已验证

### 3. 资源清理脚本
**文件**: `cleanup-aws-infrastructure.sh`

**功能**:
- 安全删除所有创建的AWS资源
- 按正确顺序删除资源以避免依赖错误
- 释放所有相关费用

**使用方法**:
```bash
./infra/cleanup-aws-infrastructure.sh
```

**警告**: 此操作不可逆，会删除所有数据

## 部署步骤

### 第一步：基础设施创建
```bash
cd /omnilaze-backend
./infra/setup-complete-aws-infrastructure.sh
```

**预期时间**: 15-20分钟
**输出**: 资源ID列表

### 第二步：SSL证书验证
1. 从脚本输出中获取证书ARN
2. 在DNS提供商处添加验证记录
3. 等待证书状态变为"ISSUED"

### 第三步：HTTPS配置
```bash
./infra/setup-https-listener.sh
```

**输入**: ALB ARN、Target Group ARN、Certificate ARN

### 第四步：DNS配置
在DNS提供商处创建CNAME记录：
- **名称**: backend.omnilaze.co
- **值**: [ALB DNS名称]

## 创建的AWS资源

### 网络资源
- 1个VPC
- 6个子网（2个公共，2个私有应用，2个私有数据库）
- 3个路由表
- 1个Internet Gateway
- 2个NAT Gateway
- 2个弹性IP

### 安全资源
- 3个安全组（ALB、ECS、RDS）
- 1个SSL证书

### 计算和存储资源
- 1个Application Load Balancer
- 1个目标组
- 1个ECS集群
- 1个RDS PostgreSQL实例

### 其他资源
- 1个RDS子网组
- 1个Secrets Manager密钥

## 配置参数

### 当前配置
- **AWS区域**: ap-southeast-1
- **AWS账号**: 442729101249
- **域名**: backend.omnilaze.co
- **数据库引擎**: PostgreSQL 15.7
- **实例类型**: db.t3.micro

### 环境变量
脚本会输出以下环境变量，用于后续部署：

```bash
export VPC_ID="vpc-xxxxxxxxx"
export PRIVATE_APP_SUBNET_1_ID="subnet-xxxxxxxxx"
export PRIVATE_APP_SUBNET_2_ID="subnet-xxxxxxxxx"
export ECS_SG_ID="sg-xxxxxxxxx"
export TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:..."
export DB_ENDPOINT="xxxxx.rds.amazonaws.com"
export SECRET_ARN="arn:aws:secretsmanager:..."
export CERT_ARN="arn:aws:acm:..."
```

## 费用估算

### 每月预估费用（ap-southeast-1）
- **VPC**: 免费
- **NAT Gateway**: ~$45/月（2个）
- **ALB**: ~$25/月
- **RDS t3.micro**: ~$15/月
- **弹性IP**: ~$7/月（2个）
- **SSL证书**: 免费

**总计**: ~$92/月

## 故障排除

### 常见问题

1. **权限错误**
   - 确保AWS CLI已配置正确的IAM权限
   - 检查账号ID是否匹配

2. **资源已存在**
   - 运行清理脚本删除现有资源
   - 或修改资源名称避免冲突

3. **SSL证书验证失败**
   - 检查DNS记录是否正确添加
   - 等待DNS传播（可能需要几分钟）

4. **RDS创建失败**
   - 检查子网组是否正确创建
   - 确认安全组配置

### 检查资源状态
```bash
# 检查VPC
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=omnilaze"

# 检查RDS实例
aws rds describe-db-instances --db-instance-identifier omnilaze-postgres

# 检查ALB
aws elbv2 describe-load-balancers --names omnilaze-alb

# 检查SSL证书
aws acm list-certificates --region ap-southeast-1
```

## 安全最佳实践

1. **网络隔离**: 数据库位于私有子网，无法从互联网直接访问
2. **安全组**: 最小权限原则，只开放必要端口
3. **SSL/TLS**: 强制HTTPS，自动重定向HTTP
4. **密码管理**: 数据库密码存储在AWS Secrets Manager
5. **加密**: RDS实例启用存储加密

## 下一步

1. 运行基础设施脚本
2. 配置DNS和SSL证书
3. 部署应用到ECS
4. 配置监控和日志
5. 设置自动扩缩容

---

**注意**: 本指南基于ap-southeast-1区域。如需其他区域，请修改脚本中的AWS_REGION变量。