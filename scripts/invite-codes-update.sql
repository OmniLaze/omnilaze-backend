-- 邀请码批量更新SQL脚本
-- 将所有现有邀请码的最大使用次数更新为1000次，并添加新邀请码 'laze'

-- 查看当前邀请码状态
SELECT 
    code,
    max_uses,
    current_uses,
    (max_uses - current_uses) as remaining_uses,
    created_at
FROM invite_codes 
ORDER BY created_at DESC;

-- 更新现有邀请码的最大使用次数为1000
UPDATE invite_codes 
SET max_uses = 1000 
WHERE code IN ('1234', 'WELCOME', 'LANDE', 'OMNILAZE', 'ADVX2025');

-- 创建新邀请码 'laze' (如果不存在)
INSERT INTO invite_codes (id, code, invite_type, max_uses, current_uses, created_by, created_at)
VALUES (gen_random_uuid(), 'laze', 'system', 1000, 0, 'admin', NOW())
ON CONFLICT (code) 
DO UPDATE SET 
    max_uses = 1000,
    created_by = 'admin';

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