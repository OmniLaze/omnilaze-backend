#!/bin/bash

echo "🔧 邀请码批量更新脚本"
echo "========================"

API_BASE="https://backend.omnilaze.co/v1"

# 邀请码列表
CODES=("1234" "WELCOME" "LANDE" "OMNILAZE" "ADVX2025")

# 更新现有邀请码（假设有直接的API方式）
echo "📝 正在批量更新邀请码使用次数..."

for code in "${CODES[@]}"; do
  echo "更新邀请码: $code"
  
  # 尝试验证邀请码是否存在
  response=$(curl -s -X POST "$API_BASE/verify-invite-code" \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\":\"13800000000\",\"invite_code\":\"$code\"}")
  
  if [[ $response == *"已达到使用次数限制"* ]]; then
    echo "  ✅ 邀请码 $code 存在但已满"
  elif [[ $response == *"邀请码无效"* ]]; then
    echo "  ❌ 邀请码 $code 不存在"
  else
    echo "  ✅ 邀请码 $code 存在"
  fi
  
  sleep 1
done

echo ""
echo "🔄 创建新邀请码 'laze'"

# 这里需要管理员权限或数据库直接操作
echo "⚠️  需要手动在数据库中执行以下 SQL："
echo ""
echo "-- 更新现有邀请码的最大使用次数为1000"
echo "UPDATE invite_codes SET max_uses = 1000 WHERE code IN ('1234', 'WELCOME', 'LANDE', 'OMNILAZE', 'ADVX2025');"
echo ""
echo "-- 创建新邀请码 'laze'"
echo "INSERT INTO invite_codes (id, code, invite_type, max_uses, current_uses, created_by, created_at)"
echo "VALUES (gen_random_uuid(), 'laze', 'system', 1000, 0, 'admin', NOW())"
echo "ON CONFLICT (code) DO UPDATE SET max_uses = 1000;"
echo ""

echo "✅ 脚本执行完成！"
echo ""
echo "📋 下一步操作："
echo "1. 连接到生产数据库"
echo "2. 执行上述SQL语句"  
echo "3. 验证更新结果"