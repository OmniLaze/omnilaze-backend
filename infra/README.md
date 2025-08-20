# AWS 基础设施管理

## 概述

本目录包含 OmniLaze 项目的 AWS 基础设施管理工具。所有功能已整合到单个脚本中，提供完整的基础设施生命周期管理。

## 🔧 主要工具

### `aws-infrastructure.sh` - 一体化基础设施管理工具

这个脚本整合了所有基础设施管理功能：

```bash
# 显示帮助信息
./infra/aws-infrastructure.sh help

# 创建完整的基础设施
./infra/aws-infrastructure.sh setup

# 验证基础设施状态
./infra/aws-infrastructure.sh validate

# 显示基础设施状态概览
./infra/aws-infrastructure.sh status

# 配置 HTTPS 监听器（需要 SSL 证书已验证）
./infra/aws-infrastructure.sh https

# ⚠️ 删除所有基础设施（不可逆）
./infra/aws-infrastructure.sh cleanup
```

## 🏗️ 网络架构

基于 AWS 最佳实践的三层网络架构：

- **VPC**: 10.0.0.0/16
- **公共子网**: 10.0.1.0/24 (1a), 10.0.2.0/24 (1c)
- **私有应用子网**: 10.0.10.0/24 (1a), 10.0.12.0/24 (1c) 
- **私有数据库子网**: 10.0.20.0/24 (1a), 10.0.21.0/24 (1c)

## 📋 创建的 AWS 资源

### 网络资源 (9个)
- 1个 VPC (10.0.0.0/16)
- 6个子网（2个公共，2个私有应用，2个私有数据库）
- 3个路由表（1个公共，2个私有）
- 1个 Internet Gateway
- 2个 NAT Gateway
- 2个弹性 IP

### 安全资源 (4个)
- 3个安全组（ALB、ECS、RDS）
- 1个 SSL 证书

### 计算和存储资源 (5个)
- 1个 Application Load Balancer
- 1个目标组
- 1个 ECS 集群
- 1个 RDS PostgreSQL 实例 (db.t3.micro)
- 1个 RDS 子网组

## 🚀 快速开始

### 1. 创建基础设施
```bash
./infra/aws-infrastructure.sh setup
```
**预期时间**: 15-20 分钟  
**输出**: 完整的资源创建摘要

### 2. 验证 SSL 证书
1. 从脚本输出获取 DNS 验证记录
2. 在 DNS 提供商处添加验证记录
3. 等待证书状态变为 "ISSUED"

### 3. 配置 HTTPS
```bash
./infra/aws-infrastructure.sh https
```

### 4. 配置域名解析
在 DNS 提供商处创建 CNAME 记录：
- **名称**: backend
- **值**: [ALB DNS 名称]

### 5. 验证部署
```bash
./infra/aws-infrastructure.sh validate
```

## 💰 费用估算

### 每月预估费用（ap-southeast-1 区域）
- **VPC & 子网**: 免费
- **NAT Gateway**: ~$45/月（2个 × $22.5）
- **Application Load Balancer**: ~$25/月
- **RDS db.t3.micro**: ~$15/月
- **弹性 IP**: ~$7/月（2个 × $3.5）
- **SSL 证书**: 免费
- **数据传输**: ~$10/月（预估）

**总计**: ~$102/月

## 🔒 安全最佳实践

1. **网络隔离**: 
   - 数据库位于私有子网，无互联网访问
   - 应用位于私有子网，通过 NAT Gateway 访问互联网

2. **安全组规则**:
   - ALB: 仅开放 80/443 端口
   - ECS: 仅接受来自 ALB 的 3000 端口流量
   - RDS: 仅接受来自 ECS 的 5432 端口流量

3. **加密和证书**:
   - SSL/TLS 强制 HTTPS
   - RDS 存储加密
   - 数据库密码复杂化

4. **访问控制**:
   - 最小权限原则
   - 资源标签管理
   - IAM 角色分离

## 🔧 环境配置

### 默认配置
```bash
AWS_REGION="ap-southeast-1"
AWS_ACCOUNT_ID="442729101249"
PROJECT_NAME="omnilaze"
DOMAIN_NAME="backend.omnilaze.co"
```

### 自定义配置
```bash
# 使用不同区域
export AWS_REGION="us-east-1"
./infra/aws-infrastructure.sh setup

# 使用不同项目名称
export PROJECT_NAME="my-project"
./infra/aws-infrastructure.sh setup
```

## 🐛 故障排除

### 常见问题

1. **权限不足**
   ```bash
   # 检查当前用户权限
   aws sts get-caller-identity
   # 确保具有 EC2、RDS、ELB、ACM、ECS 的完整权限
   ```

2. **资源已存在冲突**
   ```bash
   # 检查现有资源
   ./infra/aws-infrastructure.sh status
   # 如需重新创建，先清理
   ./infra/aws-infrastructure.sh cleanup
   ```

3. **SSL 证书验证失败**
   ```bash
   # 检查证书状态
   aws acm list-certificates --region ap-southeast-1
   # 检查 DNS 记录是否正确添加
   ```

4. **RDS 创建超时**
   ```bash
   # RDS 创建通常需要 10-15 分钟
   # 检查子网组和安全组配置
   aws rds describe-db-instances --db-instance-identifier omnilaze-postgres
   ```

### 调试命令
```bash
# 查看详细状态
./infra/aws-infrastructure.sh status

# 验证所有组件
./infra/aws-infrastructure.sh validate

# 检查特定资源
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=omnilaze"
aws rds describe-db-instances --db-instance-identifier omnilaze-postgres
aws elbv2 describe-load-balancers --names omnilaze-alb
```

## 📊 监控和维护

### 健康检查
```bash
# 定期运行验证
./infra/aws-infrastructure.sh validate

# 检查 ALB 目标健康状态
aws elbv2 describe-target-health --target-group-arn [TARGET_GROUP_ARN]

# 检查 RDS 指标
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=omnilaze-postgres
```

### 备份策略
- **RDS 自动备份**: 保留 7 天
- **快照策略**: 建议每日快照
- **配置备份**: 定期导出基础设施配置

## 🗑️ 资源清理

### 完整清理
```bash
# ⚠️ 这将删除所有数据，操作不可逆
./infra/aws-infrastructure.sh cleanup
```

### 选择性清理
如需保留数据但停止计费资源：
```bash
# 停止 ECS 服务
aws ecs update-service --cluster omnilaze-cluster --service omnilaze-service --desired-count 0

# 停止 RDS 实例（最多停止 7 天）
aws rds stop-db-instance --db-instance-identifier omnilaze-postgres
```

## 📝 更新日志

- **v2.0**: 整合所有功能到单个脚本
- **v1.x**: 分离的多个脚本（已废弃）

## 🔗 相关文档

- [AWS ECS 最佳实践](https://docs.aws.amazon.com/ecs/latest/bestpracticesguide/)
- [AWS RDS 安全最佳实践](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Application Load Balancer 用户指南](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

---

💡 **提示**: 使用 `./infra/aws-infrastructure.sh help` 查看所有可用命令和选项。