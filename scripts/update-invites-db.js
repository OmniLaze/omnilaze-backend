#!/usr/bin/env node

/**
 * 直接数据库操作脚本
 * 更新邀请码最大使用次数并创建新邀请码
 */

const { Client } = require('pg');

// 生产数据库连接配置
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://omnilaze_user:your_password@omnilaze-postgres.czoamaem021x.ap-southeast-1.rds.amazonaws.com:5432/omnilaze';

async function updateInviteCodes() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // 对于AWS RDS，通常需要这个设置
    }
  });

  try {
    console.log('🔗 连接到数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 检查当前邀请码状态
    console.log('\n📋 检查当前邀请码状态...');
    const currentStatus = await client.query(`
      SELECT code, max_uses, current_uses, (max_uses - current_uses) as remaining_uses 
      FROM invite_codes 
      ORDER BY created_at DESC
    `);
    
    console.log('当前邀请码状态:');
    console.table(currentStatus.rows);

    // 更新现有邀请码的最大使用次数
    console.log('\n🔄 更新现有邀请码最大使用次数到1000...');
    const updateResult = await client.query(`
      UPDATE invite_codes 
      SET max_uses = 1000 
      WHERE code IN ('1234', 'WELCOME', 'LANDE', 'OMNILAZE', 'ADVX2025')
    `);
    console.log(`✅ 已更新 ${updateResult.rowCount} 个邀请码`);

    // 创建新邀请码 'laze' 
    console.log('\n➕ 创建新邀请码 "laze"...');
    try {
      const insertResult = await client.query(`
        INSERT INTO invite_codes (id, code, invite_type, max_uses, current_uses, created_by, created_at)
        VALUES (gen_random_uuid(), 'laze', 'system', 1000, 0, 'admin', NOW())
      `);
      console.log('✅ 新邀请码 "laze" 创建成功');
    } catch (err) {
      if (err.code === '23505') { // Unique constraint violation
        console.log('⚠️ 邀请码 "laze" 已存在，更新其最大使用次数...');
        await client.query(`
          UPDATE invite_codes SET max_uses = 1000 WHERE code = 'laze'
        `);
        console.log('✅ 邀请码 "laze" 已更新');
      } else {
        throw err;
      }
    }

    // 检查更新后的状态
    console.log('\n📋 更新后的邀请码状态:');
    const finalStatus = await client.query(`
      SELECT code, max_uses, current_uses, (max_uses - current_uses) as remaining_uses 
      FROM invite_codes 
      ORDER BY created_at DESC
    `);
    console.table(finalStatus.rows);

    console.log('\n🎉 邀请码更新完成！');

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 解决方案:');
      console.log('1. 确保数据库连接字符串正确');
      console.log('2. 检查网络连接和防火墙设置');
      console.log('3. 验证数据库凭据');
    }
  } finally {
    try {
      await client.end();
      console.log('🔌 数据库连接已关闭');
    } catch (err) {
      // 忽略关闭连接时的错误
    }
  }
}

// 运行脚本
if (require.main === module) {
  updateInviteCodes().catch(console.error);
}

module.exports = { updateInviteCodes };