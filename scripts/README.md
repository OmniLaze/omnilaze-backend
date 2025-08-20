# Scripts 目录

本目录包含 OmniLaze 后端的所有管理和部署脚本。

## 📁 脚本概览

### 🏗️ 部署和基础设施
- **`generate-task-definition.sh`** - ECS Task Definition 生成工具
- **`setup-ssm-config.sh`** - 初始化 SSM Parameter Store 配置
- **`migrate-to-ssm.sh`** - 从旧配置迁移到 SSM 的工具

### ⚙️ 配置管理
- **`manage-ssm-config.sh`** - SSM Parameter Store 参数管理工具

### 🎫 邀请码管理
- **`manage-invites.sh`** - 一体化邀请码管理工具

## 🚀 使用方法

### 部署相关

#### 生成 Task Definition
```bash
# 生成新的 Task Definition
./scripts/generate-task-definition.sh <IMAGE_URI>

# 示例
./scripts/generate-task-definition.sh 442729101249.dkr.ecr.ap-southeast-1.amazonaws.com/omnilaze-backend:latest
```

#### SSM 配置管理
```bash
# 列出所有 SSM 参数
./scripts/manage-ssm-config.sh list

# 获取特定参数值
./scripts/manage-ssm-config.sh get DATABASE_URL

# 设置参数
./scripts/manage-ssm-config.sh set JWT_SECRET "new-secret" SecureString

# 导出所有参数为环境变量格式
./scripts/manage-ssm-config.sh export

# 备份参数
./scripts/manage-ssm-config.sh backup

# 从备份恢复
./scripts/manage-ssm-config.sh restore backup-file.json
```

#### 配置迁移
```bash
# 从 Task Definition 环境变量迁移到 SSM
./scripts/migrate-to-ssm.sh

# 初始设置 SSM 参数
./scripts/setup-ssm-config.sh
```

### 邀请码管理

```bash
# 列出所有邀请码
./scripts/manage-invites.sh list

# 创建新邀请码
./scripts/manage-invites.sh create NEWCODE 1000

# 更新邀请码使用次数
./scripts/manage-invites.sh update 1234 2000

# 检查邀请码状态
./scripts/manage-invites.sh check WELCOME

# 批量更新默认邀请码
./scripts/manage-invites.sh batch-update

# 显示统计信息
./scripts/manage-invites.sh stats

# 生成管理 SQL 脚本
./scripts/manage-invites.sh sql
```

## 🔧 环境变量配置

### 通用配置
```bash
# AWS 相关
export AWS_REGION="ap-southeast-1"
export ENVIRONMENT="prod"  # 或 "dev", "test"

# 数据库
export DATABASE_URL="postgresql://..."

# API 访问
export SYSTEM_API_KEY="your-system-api-key"
```

### SSM 配置管理
```bash
# 设置环境（影响参数路径前缀）
export ENVIRONMENT="prod"  # 参数路径: /omnilaze/prod/
export ENVIRONMENT="dev"   # 参数路径: /omnilaze/dev/
```

### 邀请码管理
```bash
# API 管理方式（推荐）
export SYSTEM_API_KEY="your-system-api-key"
export API_BASE="https://backend.omnilaze.co/v1"

# 数据库直接管理方式
export DATABASE_URL="postgresql://..."
```

## 📋 最佳实践

### 生产环境操作
1. **备份先行**: 修改生产配置前先备份
   ```bash
   ./scripts/manage-ssm-config.sh backup
   ```

2. **逐步验证**: 修改配置后验证应用状态
   ```bash
   # 检查服务健康状态
   curl https://backend.omnilaze.co/v1/health
   ```

3. **权限控制**: 使用 SYSTEM_API_KEY 而非直接数据库访问

### 开发环境操作
1. **环境隔离**: 使用不同的 ENVIRONMENT 值
   ```bash
   export ENVIRONMENT="dev"
   ./scripts/manage-ssm-config.sh list
   ```

2. **本地测试**: 先在开发环境测试脚本

## 🔒 安全注意事项

### SSM Parameter Store
- ✅ 敏感信息使用 `SecureString` 类型
- ✅ 参数按环境分离 (`/omnilaze/prod/`, `/omnilaze/dev/`)
- ✅ 定期备份参数配置

### 邀请码管理
- ✅ 优先使用 API 方式（需要 SYSTEM_API_KEY）
- ⚠️ 直接数据库访问仅限紧急情况
- ✅ 操作前先检查现有状态

### 部署操作
- ✅ Task Definition 使用模板生成，避免硬编码
- ✅ 镜像 URI 通过参数传递
- ✅ 所有环境变量通过 SSM 管理

## 🐛 故障排除

### 常见问题

#### SSM 参数访问失败
```bash
# 检查 AWS 权限
aws sts get-caller-identity

# 检查参数是否存在
aws ssm get-parameters-by-path --path "/omnilaze/prod" --recursive
```

#### 邀请码 API 调用失败
```bash
# 检查 API 密钥
curl -H "X-System-Key: $SYSTEM_API_KEY" https://backend.omnilaze.co/v1/admin/invites

# 检查服务状态
curl https://backend.omnilaze.co/v1/health
```

#### Task Definition 生成失败
```bash
# 检查模板文件
ls -la task-definitions/template.json

# 检查 AWS CLI 配置
aws configure list
```

### 调试模式
大部分脚本支持详细输出，可以通过以下方式调试：

```bash
# 设置调试模式
set -x

# 或使用 bash -x 运行脚本
bash -x ./scripts/manage-ssm-config.sh list
```

## 📈 监控和日志

### 脚本执行日志
脚本输出使用彩色标识：
- 🔵 信息 (蓝色)
- 🟢 成功 (绿色) 
- 🟡 警告 (黄色)
- 🔴 错误 (红色)

### 操作审计
- SSM Parameter Store 有内置的修改历史
- 数据库操作建议记录到日志文件
- API 操作会在服务端记录访问日志

## 📝 更新历史

### v2.0 - 脚本整合版本
- ✅ 整合邀请码管理功能到单个脚本
- ✅ 改进的 SSM 参数管理工具
- ✅ 删除冗余和过时的脚本
- ✅ 统一的配置管理模式

### v1.x - 分离脚本版本（已废弃）
- ❌ 多个分散的邀请码管理脚本
- ❌ 不一致的配置管理方式
- ❌ 大量冗余代码

---

💡 **提示**: 使用脚本的 `help` 命令查看详细使用说明，例如：`./scripts/manage-invites.sh help`