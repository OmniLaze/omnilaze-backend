#!/bin/bash

echo "🚀 执行邀请码更新脚本"
echo "======================"

# 设置生产环境数据库URL（需要替换为实际值）
# 格式: postgresql://username:password@host:port/database
export DATABASE_URL="postgresql://omnilaze_user:your_production_password@omnilaze-postgres.czoamaem021x.ap-southeast-1.rds.amazonaws.com:5432/omnilaze"

echo "⚠️ 请确保设置了正确的数据库URL"
echo "当前 DATABASE_URL: $DATABASE_URL"
echo ""

read -p "是否继续执行？(y/N): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo ""
echo "🔄 执行更新脚本..."

# 运行TypeScript脚本
npx ts-node scripts/update-invites-prisma.ts

echo ""
echo "✅ 脚本执行完成！"