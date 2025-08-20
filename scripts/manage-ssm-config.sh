#!/usr/bin/env bash
set -eo pipefail

# ====== SSM 参数管理脚本 ======
REGION=${AWS_REGION:-"ap-southeast-1"}
ENV=${ENVIRONMENT:-"prod"}
PREFIX="/omnilaze/${ENV}"

# 显示使用说明
show_help() {
    echo "🔧 SSM 参数管理工具"
    echo ""
    echo "使用方法:"
    echo "  $0 list                           # 列出所有参数"
    echo "  $0 get <参数名>                   # 获取单个参数值"
    echo "  $0 set <参数名> <值> [类型]       # 设置参数 (类型: String|SecureString)"
    echo "  $0 delete <参数名>                # 删除参数"
    echo "  $0 export                         # 导出所有参数为环境变量格式"
    echo "  $0 backup                         # 备份所有参数到文件"
    echo "  $0 restore <备份文件>             # 从备份文件恢复参数"
    echo ""
    echo "环境变量:"
    echo "  AWS_REGION=ap-southeast-1         # AWS 区域"
    echo "  ENVIRONMENT=prod                   # 环境名称 (prod/dev/test)"
    echo ""
    echo "示例:"
    echo "  $0 list"
    echo "  $0 get DATABASE_URL"
    echo "  $0 set JWT_SECRET my-secret SecureString"
    echo "  $0 delete OLD_PARAM"
}

# 列出所有参数
list_params() {
    echo "📋 列出所有 SSM 参数 - 环境: $ENV, 区域: $REGION"
    aws ssm get-parameters-by-path \
        --region "$REGION" \
        --path "$PREFIX" \
        --recursive \
        --query "Parameters[*].{Name:Name,Type:Type,LastModified:LastModifiedDate}" \
        --output table
}

# 获取单个参数
get_param() {
    local param_name=$1
    if [ -z "$param_name" ]; then
        echo "❌ 请提供参数名"
        exit 1
    fi
    
    local full_name="$PREFIX/$param_name"
    echo "🔍 获取参数: $full_name"
    
    local value=$(aws ssm get-parameter \
        --region "$REGION" \
        --name "$full_name" \
        --with-decryption \
        --query "Parameter.Value" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$value" ]; then
        echo "❌ 参数不存在: $param_name"
        exit 1
    fi
    
    echo "✅ $param_name = $value"
}

# 设置参数
set_param() {
    local param_name=$1
    local param_value=$2
    local param_type=${3:-"String"}
    
    if [ -z "$param_name" ] || [ -z "$param_value" ]; then
        echo "❌ 请提供参数名和值"
        exit 1
    fi
    
    local full_name="$PREFIX/$param_name"
    echo "📝 设置参数: $full_name (类型: $param_type)"
    
    aws ssm put-parameter \
        --region "$REGION" \
        --name "$full_name" \
        --value "$param_value" \
        --type "$param_type" \
        --overwrite \
        --description "OmniLaze $ENV environment variable: $param_name" >/dev/null
    
    echo "✅ 参数设置成功: $param_name"
}

# 删除参数
delete_param() {
    local param_name=$1
    if [ -z "$param_name" ]; then
        echo "❌ 请提供参数名"
        exit 1
    fi
    
    local full_name="$PREFIX/$param_name"
    echo "🗑️  删除参数: $full_name"
    
    aws ssm delete-parameter \
        --region "$REGION" \
        --name "$full_name" >/dev/null
    
    echo "✅ 参数删除成功: $param_name"
}

# 导出参数为环境变量格式
export_params() {
    echo "📤 导出 SSM 参数为环境变量 - 环境: $ENV"
    echo "# Generated at $(date)"
    echo "# Environment: $ENV, Region: $REGION"
    echo ""
    
    aws ssm get-parameters-by-path \
        --region "$REGION" \
        --path "$PREFIX" \
        --recursive \
        --with-decryption \
        --query "Parameters[*].[Name,Value]" \
        --output text | while read -r name value; do
        # 提取参数名（去掉前缀）
        param_name=$(echo "$name" | sed "s|^$PREFIX/||")
        echo "export $param_name=\"$value\""
    done
}

# 备份参数到文件
backup_params() {
    local backup_file="ssm-backup-${ENV}-$(date +%Y%m%d-%H%M%S).json"
    echo "💾 备份 SSM 参数到文件: $backup_file"
    
    aws ssm get-parameters-by-path \
        --region "$REGION" \
        --path "$PREFIX" \
        --recursive \
        --with-decryption \
        --output json > "$backup_file"
    
    echo "✅ 备份完成: $backup_file"
    echo "📊 备份统计:"
    jq '.Parameters | length' "$backup_file" | xargs echo "  参数数量:"
    ls -lh "$backup_file" | awk '{print "  文件大小: " $5}'
}

# 从备份文件恢复参数
restore_params() {
    local backup_file=$1
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        echo "❌ 请提供有效的备份文件路径"
        exit 1
    fi
    
    echo "🔄 从备份文件恢复参数: $backup_file"
    echo "⚠️  这将覆盖现有参数，按 Ctrl+C 取消，按任意键继续..."
    read -n 1
    
    local count=0
    jq -r '.Parameters[] | @base64' "$backup_file" | while read -r param; do
        local name=$(echo "$param" | base64 -d | jq -r '.Name')
        local value=$(echo "$param" | base64 -d | jq -r '.Value')
        local type=$(echo "$param" | base64 -d | jq -r '.Type')
        
        echo "  恢复: $name"
        aws ssm put-parameter \
            --region "$REGION" \
            --name "$name" \
            --value "$value" \
            --type "$type" \
            --overwrite >/dev/null
        
        ((count++))
    done
    
    echo "✅ 恢复完成，共恢复 $count 个参数"
}

# 主逻辑
case ${1:-""} in
    "list"|"ls")
        list_params
        ;;
    "get")
        get_param "$2"
        ;;
    "set")
        set_param "$2" "$3" "$4"
        ;;
    "delete"|"del"|"rm")
        delete_param "$2"
        ;;
    "export")
        export_params
        ;;
    "backup")
        backup_params
        ;;
    "restore")
        restore_params "$2"
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo "❌ 未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac