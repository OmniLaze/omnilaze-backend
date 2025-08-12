// 备用方案：使用传统阿里云短信API的实现
// 如果当前的号码认证服务(dypnsapi)权限有问题，可以切换到这个版本

import Dysmsapi from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

// 传统短信服务客户端创建
private createSmsClient(): Dysmsapi {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: 'dysmsapi.aliyuncs.com',
  });
  return new Dysmsapi(config);
}

// 使用传统SMS API发送验证码
async sendVerificationCodeTraditional(phoneNumber: string) {
  try {
    const client = this.createSmsClient();
    const code = Math.random().toString().slice(2, 8); // 生成6位验证码
    
    const sendSmsRequest = new Dysmsapi.SendSmsRequest({
      phoneNumbers: phoneNumber,
      signName: process.env.ALIYUN_SMS_SIGN_NAME,
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
      templateParam: JSON.stringify({ code: code }),
    });

    const response = await client.sendSms(sendSmsRequest);
    
    if (response.body.code === 'OK') {
      // 存储验证码用于验证（这里应该存储到Redis或数据库）
      // 临时存储在内存中（生产环境不推荐）
      global[`sms_${phoneNumber}`] = { code, expires: Date.now() + 300000 }; // 5分钟过期
      
      return {
        success: true,
        message: '验证码发送成功',
        data: { sent: true }
      };
    } else {
      return {
        success: false,
        message: `短信发送失败: ${response.body.message}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `短信发送异常: ${error.message}`
    };
  }
}