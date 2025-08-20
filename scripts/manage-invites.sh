#!/usr/bin/env bash
set -eo pipefail

# ====== OmniLaze 邀请码管理工具 ======
# 整合了所有邀请码相关的管理功能

# 配置变量
API_BASE=${API_BASE:-"https://backend.omnilaze.co/v1"}
DATABASE_URL=${DATABASE_URL:-""}
SYSTEM_API_KEY=${SYSTEM_API_KEY:-""}

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
    echo "🎫 OmniLaze 邀请码管理工具"
    echo ""
    echo "使用方法:"
    echo "  $0 list                     # 列出所有邀请码状态"
    echo "  $0 create <code> [uses]     # 创建新邀请码（默认 1000 次使用）"
    echo "  $0 update <code> <uses>     # 更新邀请码最大使用次数"
    echo "  $0 check <code>             # 检查特定邀请码状态"
    echo "  $0 batch-update             # 批量更新默认邀请码"
    echo "  $0 stats                    # 显示邀请码统计信息"
    echo "  $0 sql                      # 生成批量更新的 SQL 脚本"
    echo ""
    echo "环境变量:"
    echo "  API_BASE          # API 基础 URL (默认: https://backend.omnilaze.co/v1)"
    echo "  SYSTEM_API_KEY    # 系统 API 密钥（用于管理员操作）"
    echo "  DATABASE_URL      # 数据库连接 URL（用于直接数据库操作）"
    echo ""
    echo "示例:"
    echo "  $0 list"
    echo "  $0 create NEWCODE 500"
    echo "  $0 update 1234 2000"
    echo "  $0 check WELCOME"
    echo ""
}

# 检查必要的环境变量
check_prerequisites() {
    if [ -z "$SYSTEM_API_KEY" ] && [ -z "$DATABASE_URL" ]; then
        log_error "需要设置 SYSTEM_API_KEY 或 DATABASE_URL 环境变量"
        log_info "SYSTEM_API_KEY: 用于 API 管理"
        log_info "DATABASE_URL: 用于直接数据库管理"
        exit 1
    fi
}

# 发送 HTTP 请求（如果可用的话使用 curl，否则使用 node）
make_api_request() {
    local method=$1
    local path=$2
    local data=${3:-""}
    
    if command -v curl &> /dev/null; then
        local curl_args=("-s" "-X" "$method")
        
        if [ -n "$SYSTEM_API_KEY" ]; then
            curl_args+=("-H" "X-System-Key: $SYSTEM_API_KEY")
        fi
        
        if [ -n "$data" ]; then
            curl_args+=("-H" "Content-Type: application/json" "-d" "$data")
        fi
        
        curl "${curl_args[@]}" "$API_BASE$path"
    else
        log_error "curl 命令未找到，无法进行 API 请求"
        return 1
    fi
}

# 使用 Prisma 执行数据库查询（如果可用）
run_prisma_query() {
    local query=$1
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL 未设置，无法执行数据库查询"
        return 1
    fi
    
    if command -v npx &> /dev/null && [ -f "node_modules/.bin/prisma" ]; then
        echo "$query" | npx prisma db execute --stdin
    else
        log_error "Prisma 未找到，无法执行数据库查询"
        log_info "请确保已运行 npm install 并且 Prisma 可用"
        return 1
    fi
}

# 列出所有邀请码
list_invites() {
    log_info "获取邀请码列表..."
    
    # 尝试 API 方式
    if [ -n "$SYSTEM_API_KEY" ]; then
        local response
        response=$(make_api_request "GET" "/admin/invites" 2>/dev/null || echo "")
        
        if [ -n "$response" ] && [[ "$response" != *"error"* ]] && [[ "$response" != *"Error"* ]]; then
            echo "$response" | jq -r '.[] | "\(.code)\t\(.maxUses)\t\(.currentUses)\t\(.maxUses - .currentUses)"' 2>/dev/null || echo "$response"
            return 0
        fi
    fi
    
    # 回退到数据库方式
    if [ -n "$DATABASE_URL" ]; then
        local query="SELECT code, max_uses, current_uses, (max_uses - current_uses) as remaining FROM invite_codes ORDER BY created_at DESC;"
        echo -e "邀请码\t\t最大使用次数\t当前使用次数\t剩余次数"
        echo -e "-------\t\t--------\t--------\t------"
        run_prisma_query "$query" 2>/dev/null || {
            log_warn "Prisma 查询失败，显示 SQL 语句："
            echo "$query"
        }
    else
        log_error "无可用的查询方法"
    fi
}

# 创建邀请码
create_invite() {
    local code=$1
    local max_uses=${2:-1000}
    
    if [ -z "$code" ]; then
        log_error "请提供邀请码"
        return 1
    fi
    
    log_info "创建邀请码: $code (最大使用次数: $max_uses)"
    
    # 尝试 API 方式
    if [ -n "$SYSTEM_API_KEY" ]; then
        local data="{\"code\":\"$code\",\"maxUses\":$max_uses,\"inviteType\":\"system\"}"
        local response
        response=$(make_api_request "POST" "/admin/invites" "$data" 2>/dev/null || echo "")
        
        if [ -n "$response" ] && [[ "$response" != *"error"* ]] && [[ "$response" != *"Error"* ]]; then
            log_success "邀请码创建成功: $code"
            return 0
        else
            log_warn "API 创建失败: $response"
        fi
    fi
    
    # 回退到数据库方式
    if [ -n "$DATABASE_URL" ]; then
        local query="INSERT INTO invite_codes (id, code, invite_type, max_uses, current_uses, created_by, created_at) VALUES (gen_random_uuid(), '$code', 'system', $max_uses, 0, 'admin', NOW()) ON CONFLICT (code) DO UPDATE SET max_uses = $max_uses;"
        
        if run_prisma_query "$query"; then
            log_success "邀请码创建成功: $code"
        else
            log_error "数据库创建失败"
            return 1
        fi
    else
        log_error "无可用的创建方法"
        return 1
    fi
}

# 更新邀请码使用次数
update_invite() {
    local code=$1
    local max_uses=$2
    
    if [ -z "$code" ] || [ -z "$max_uses" ]; then
        log_error "请提供邀请码和最大使用次数"
        return 1
    fi
    
    log_info "更新邀请码: $code (最大使用次数: $max_uses)"
    
    # 尝试 API 方式
    if [ -n "$SYSTEM_API_KEY" ]; then
        local data="{\"maxUses\":$max_uses}"
        local response
        response=$(make_api_request "PUT" "/admin/invites/$code" "$data" 2>/dev/null || echo "")
        
        if [ -n "$response" ] && [[ "$response" != *"error"* ]] && [[ "$response" != *"Error"* ]]; then
            log_success "邀请码更新成功: $code"
            return 0
        else
            log_warn "API 更新失败: $response"
        fi
    fi
    
    # 回退到数据库方式
    if [ -n "$DATABASE_URL" ]; then
        local query="UPDATE invite_codes SET max_uses = $max_uses WHERE code = '$code';"
        
        if run_prisma_query "$query"; then
            log_success "邀请码更新成功: $code"
        else
            log_error "数据库更新失败"
            return 1
        fi
    else
        log_error "无可用的更新方法"
        return 1
    fi
}

# 检查特定邀请码
check_invite() {
    local code=$1
    
    if [ -z "$code" ]; then
        log_error "请提供邀请码"
        return 1
    fi
    
    log_info "检查邀请码: $code"
    
    # 尝试验证邀请码（模拟用户注册检查）
    local data="{\"phone_number\":\"13800000000\",\"invite_code\":\"$code\"}"
    local response
    response=$(make_api_request "POST" "/verify-invite-code" "$data" 2>/dev/null || echo "")
    
    if [[ "$response" == *"已达到使用次数限制"* ]]; then
        log_warn "邀请码 $code 已达到使用限制"
    elif [[ "$response" == *"邀请码无效"* ]] || [[ "$response" == *"Invalid invite code"* ]]; then
        log_error "邀请码 $code 不存在或无效"
    elif [[ "$response" == *"success"* ]] || [[ "$response" == *"valid"* ]]; then
        log_success "邀请码 $code 有效且可用"
    else
        log_info "邀请码 $code 响应: $response"
    fi
}

# 批量更新默认邀请码
batch_update() {
    log_info "批量更新默认邀请码..."
    
    local default_codes=("1234" "WELCOME" "LANDE" "OMNILAZE" "ADVX2025")
    local max_uses=1000
    
    for code in "${default_codes[@]}"; do
        log_info "更新邀请码: $code"
        update_invite "$code" "$max_uses"
        sleep 0.5
    done
    
    # 创建新邀请码 'laze'
    log_info "创建新邀请码: laze"
    create_invite "laze" "$max_uses"
    
    log_success "批量更新完成！"
}

# 显示统计信息
show_stats() {
    log_info "邀请码统计信息..."
    
    if [ -n "$DATABASE_URL" ]; then
        local query="SELECT COUNT(*) as total_codes, SUM(max_uses) as total_max_uses, SUM(current_uses) as total_used, SUM(max_uses - current_uses) as total_available FROM invite_codes;"
        
        echo "统计信息："
        echo "----------"
        run_prisma_query "$query" || {
            log_warn "Prisma 查询失败，显示 SQL 语句："
            echo "$query"
        }
    else
        log_warn "需要 DATABASE_URL 来显示详细统计"
        
        # 尝试通过 API 获取基本统计
        if [ -n "$SYSTEM_API_KEY" ]; then
            local response
            response=$(make_api_request "GET" "/admin/invites/stats" 2>/dev/null || echo "")
            if [ -n "$response" ]; then
                echo "$response"
            fi
        fi
    fi
}

# 生成 SQL 脚本
generate_sql() {
    log_info "生成邀请码管理 SQL 脚本..."
    
    cat > invite-management.sql << 'EOF'
-- OmniLaze 邀请码管理 SQL 脚本
-- 生成时间: $(date)

-- 查看当前邀请码状态
SELECT 
    code,
    max_uses,
    current_uses,
    (max_uses - current_uses) as remaining_uses,
    invite_type,
    created_at,
    created_by
FROM invite_codes 
ORDER BY created_at DESC;

-- 更新默认邀请码的最大使用次数为 1000
UPDATE invite_codes 
SET max_uses = 1000 
WHERE code IN ('1234', 'WELCOME', 'LANDE', 'OMNILAZE', 'ADVX2025');

-- 创建新邀请码 'laze' (如果不存在则创建，如果存在则更新)
INSERT INTO invite_codes (id, code, invite_type, max_uses, current_uses, created_by, created_at)
VALUES (gen_random_uuid(), 'laze', 'system', 1000, 0, 'admin', NOW())
ON CONFLICT (code) 
DO UPDATE SET 
    max_uses = 1000,
    created_by = 'admin',
    updated_at = NOW();

-- 验证更新结果
SELECT 
    code,
    max_uses,
    current_uses,
    (max_uses - current_uses) as remaining_uses,
    created_at
FROM invite_codes 
ORDER BY created_at DESC;

-- 统计信息
SELECT 
    COUNT(*) as total_codes,
    SUM(max_uses) as total_max_uses,
    SUM(current_uses) as total_used,
    SUM(max_uses - current_uses) as total_available
FROM invite_codes;

-- 查找使用率高的邀请码
SELECT 
    code,
    max_uses,
    current_uses,
    ROUND((current_uses::float / max_uses::float) * 100, 2) as usage_percentage
FROM invite_codes 
WHERE max_uses > 0
ORDER BY usage_percentage DESC;
EOF
    
    log_success "SQL 脚本已生成: invite-management.sql"
    log_info "使用方法："
    echo "  psql \$DATABASE_URL -f invite-management.sql"
    echo "  或在数据库管理工具中执行脚本内容"
}

# 主逻辑
case "${1:-""}" in
    "list"|"ls")
        list_invites
        ;;
    "create")
        create_invite "$2" "$3"
        ;;
    "update")
        update_invite "$2" "$3"
        ;;
    "check")
        check_invite "$2"
        ;;
    "batch-update"|"batch")
        batch_update
        ;;
    "stats")
        show_stats
        ;;
    "sql")
        generate_sql
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