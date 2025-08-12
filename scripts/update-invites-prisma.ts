#!/usr/bin/env node

/**
 * 使用Prisma执行邀请码更新
 * 通过原始SQL更新邀请码最大使用次数并创建新邀请码
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateInviteCodes() {
  try {
    console.log('🔗 连接到数据库...');
    
    // 检查当前邀请码状态
    console.log('\n📋 检查当前邀请码状态...');
    const currentCodes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('当前邀请码状态:');
    console.table(currentCodes.map(code => ({
      code: code.code,
      max_uses: code.maxUses,
      current_uses: code.currentUses,
      remaining_uses: code.maxUses - code.currentUses,
      created_at: code.createdAt.toISOString().split('T')[0]
    })));

    // 更新现有邀请码的最大使用次数
    console.log('\n🔄 更新现有邀请码最大使用次数到1000...');
    const updateResult = await prisma.inviteCode.updateMany({
      where: {
        code: {
          in: ['1234', 'WELCOME', 'LANDE', 'OMNILAZE', 'ADVX2025']
        }
      },
      data: {
        maxUses: 1000
      }
    });
    console.log(`✅ 已更新 ${updateResult.count} 个邀请码`);

    // 创建新邀请码 'laze' 或更新如果已存在
    console.log('\n➕ 处理邀请码 "laze"...');
    try {
      const existingLaze = await prisma.inviteCode.findUnique({
        where: { code: 'laze' }
      });

      if (existingLaze) {
        console.log('⚠️ 邀请码 "laze" 已存在，更新其最大使用次数...');
        await prisma.inviteCode.update({
          where: { code: 'laze' },
          data: { maxUses: 1000 }
        });
        console.log('✅ 邀请码 "laze" 已更新');
      } else {
        await prisma.inviteCode.create({
          data: {
            code: 'laze',
            inviteType: 'system',
            maxUses: 1000,
            currentUses: 0,
            createdBy: 'admin'
          }
        });
        console.log('✅ 新邀请码 "laze" 创建成功');
      }
    } catch (err) {
      console.error('❌ 处理邀请码 "laze" 时出错:', err);
    }

    // 检查更新后的状态
    console.log('\n📋 更新后的邀请码状态:');
    const finalCodes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.table(finalCodes.map(code => ({
      code: code.code,
      max_uses: code.maxUses,
      current_uses: code.currentUses,
      remaining_uses: code.maxUses - code.currentUses,
      created_at: code.createdAt.toISOString().split('T')[0]
    })));

    console.log('\n🎉 邀请码更新完成！');
    console.log('\n📊 摘要:');
    console.log(`• 总邀请码数量: ${finalCodes.length}`);
    console.log(`• 可用使用次数: ${finalCodes.reduce((sum, code) => sum + (code.maxUses - code.currentUses), 0)}`);

  } catch (error) {
    console.error('❌ 执行失败:', error);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('\n💡 解决方案:');
      console.log('1. 确保 DATABASE_URL 环境变量正确');
      console.log('2. 检查网络连接');
      console.log('3. 验证数据库服务状态');
    }
  } finally {
    await prisma.$disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  updateInviteCodes().catch(console.error);
}