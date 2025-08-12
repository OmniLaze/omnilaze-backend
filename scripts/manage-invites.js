#!/usr/bin/env node

/**
 * 邀请码管理脚本
 * 通过生产环境API管理邀请码
 */

const https = require('https');

const API_BASE = 'https://backend.omnilaze.co/v1';

// 发送HTTP请求的辅助函数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'backend.omnilaze.co',
      port: 443,
      path: `/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'InviteManager/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (err) {
          resolve({ status: res.statusCode, data: { raw: body } });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 获取所有邀请码
async function getAllInviteCodes() {
  try {
    const response = await makeRequest('GET', '/admin/invite-codes');
    if (response.status === 200) {
      return response.data;
    } else {
      console.error('获取邀请码失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('请求失败:', error.message);
    return null;
  }
}

// 更新邀请码最大使用次数
async function updateInviteCode(code, maxUses) {
  try {
    const response = await makeRequest('POST', '/admin/update-invite-code', {
      code: code,
      max_uses: maxUses
    });
    
    if (response.status === 200) {
      console.log(`✅ 邀请码 ${code} 已更新到 ${maxUses} 次`);
      return true;
    } else {
      console.error(`❌ 更新邀请码 ${code} 失败:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`❌ 更新邀请码 ${code} 时出错:`, error.message);
    return false;
  }
}

// 创建新邀请码
async function createInviteCode(code, maxUses) {
  try {
    const response = await makeRequest('POST', '/admin/create-invite-code', {
      code: code,
      max_uses: maxUses,
      description: `Created by script - ${new Date().toISOString()}`
    });
    
    if (response.status === 200) {
      console.log(`✅ 新邀请码 ${code} 已创建，可使用 ${maxUses} 次`);
      return true;
    } else {
      console.error(`❌ 创建邀请码 ${code} 失败:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`❌ 创建邀请码 ${code} 时出错:`, error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🔧 开始管理邀请码...\n');

  // 获取当前邀请码
  console.log('📋 获取当前邀请码状态...');
  const currentCodes = await getAllInviteCodes();
  
  if (!currentCodes) {
    console.log('⚠️ 无法获取当前邀请码，可能需要先创建管理员API端点');
    console.log('📝 继续手动操作...\n');
  } else {
    console.log('当前邀请码:', currentCodes);
    console.log();
  }

  // 预定义的邀请码列表
  const inviteCodesToUpdate = ['1234', 'WELCOME', 'LANDE', 'OMNILAZE', 'ADVX2025'];
  const targetMaxUses = 1000;

  console.log(`🔄 更新现有邀请码到 ${targetMaxUses} 次使用...`);
  for (const code of inviteCodesToUpdate) {
    await updateInviteCode(code, targetMaxUses);
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms 延迟
  }

  console.log('\n➕ 创建新邀请码 "laze"...');
  await createInviteCode('laze', targetMaxUses);

  console.log('\n✅ 邀请码管理完成！');
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getAllInviteCodes,
  updateInviteCode,
  createInviteCode
};