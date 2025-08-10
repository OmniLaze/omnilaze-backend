"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../db/prisma.service");
let InvitesService = class InvitesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserInviteStats(userId) {
        if (!userId)
            return { success: false, message: '用户ID不能为空' };
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.userInviteCode)
            return { success: false, message: '用户邀请码不存在' };
        const code = await this.prisma.inviteCode.findUnique({ where: { code: user.userInviteCode } });
        const current = code?.currentUses || 0;
        const max = code?.maxUses || 2;
        const eligible = current >= max;
        const freeOrder = await this.prisma.order.findFirst({ where: { userId, budgetAmount: 0 } }).catch(() => null);
        return {
            success: true,
            user_invite_code: user.userInviteCode,
            current_uses: current,
            max_uses: max,
            remaining_uses: Math.max(0, max - current),
            eligible_for_free_drink: eligible,
            free_drink_claimed: !!freeOrder,
            free_drinks_remaining: null,
        };
    }
    async getInviteProgress(userId) {
        if (!userId)
            return { success: false, message: '用户ID不能为空' };
        const items = await this.prisma.invitation.findMany({ where: { inviterUserId: userId }, orderBy: { invitedAt: 'desc' } });
        const invitations = items.map((x) => ({ phone_number: x.inviteePhone, invited_at: x.invitedAt.toISOString(), masked_phone: x.inviteePhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }));
        return { success: true, invitations, total_invitations: invitations.length };
    }
    async claimFreeDrink(userId) {
        if (!userId)
            return { success: false, message: '用户ID不能为空' };
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return { success: false, message: '用户不存在' };
        const code = await this.prisma.inviteCode.findUnique({ where: { code: user.userInviteCode || '' } });
        if (!code || code.currentUses < code.maxUses)
            return { success: false, message: '邀请人数不足，无法领取免单' };
        const existing = await this.prisma.order.findFirst({ where: { userId, budgetAmount: 0 } });
        if (existing)
            return { success: false, message: '您已经领取过免单奶茶' };
        const order = await this.prisma.order.create({
            data: {
                orderNumber: `FREE${Date.now()}`,
                userId,
                phoneNumber: user.phoneNumber,
                status: 'completed',
                orderDate: new Date(),
                deliveryAddress: '',
                dietaryRestrictions: '[]',
                foodPreferences: '[]',
                budgetAmount: 0,
                budgetCurrency: 'CNY',
                metadata: { isFreeOrder: true, claimedAt: new Date().toISOString(), orderType: 'drink' },
            },
        });
        return { success: true, message: '免单领取成功！', free_order_id: order.id };
    }
    async freeDrinksRemaining() {
        // Optional: Implement global quota logic with a config table
        return { success: true, free_drinks_remaining: null, message: '未配置全局免单名额' };
    }
};
exports.InvitesService = InvitesService;
exports.InvitesService = InvitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvitesService);
//# sourceMappingURL=invites.service.js.map