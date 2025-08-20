# Task Definitions 文件夹

此文件夹包含所有 ECS Task Definition 相关文件的组织结构。

## 文件说明

### `template.json`
**用途**: Task Definition 模板文件，使用 SSM Parameter Store secrets
**特点**: 
- 只使用 `secrets` 引用 SSM 参数，不包含硬编码的环境变量
- 包含占位符 (PLACEHOLDER_IMAGE_URI, REGION, ACCOUNT_ID, ENVIRONMENT)
- 由 `scripts/generate-task-definition.sh` 使用

### `production-current.json` 
**用途**: 当前生产环境 Task Definition 的备份参考
**特点**:
- 包含实际的环境变量和 secrets 配置
- 用于对比和回滚参考
- 包含具体的镜像 URI 和配置值

## 使用方法

### 生成新的 Task Definition
```bash
./scripts/generate-task-definition.sh <IMAGE_URI>
```

### 管理 SSM 参数
```bash
./scripts/manage-ssm-config.sh list
./scripts/manage-ssm-config.sh set PARAM_NAME "value" [SecureString]
```

### 部署新版本
```bash
./deploy-v2.sh  # 使用新的 SSM-only 模式
```

## 架构优势

1. **配置分离**: 环境变量存储在 SSM Parameter Store，代码和配置完全分离
2. **版本控制简化**: Task Definition 只在代码变更时创建新版本
3. **安全性**: 敏感信息使用 SSM SecureString 加密存储
4. **可维护性**: 配置修改无需重新部署应用

## 历史文件清理

以下过时的文件已被删除：
- `clean-task-def.json`
- `current-task-def-full.json` 
- `current-task-def-production.json`
- `current-task-def.json`
- `final-task-def.json`
- `new-task-definition.json`
- `updated-task-def.json`
- `working-task-def.json`

这些文件包含硬编码的环境变量，不符合新的 SSM Parameter Store 架构。