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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitesController = void 0;
const common_1 = require("@nestjs/common");
const invites_service_1 = require("./invites.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const system_key_guard_1 = require("../../common/guards/system-key.guard");
let InvitesController = class InvitesController {
    constructor(invites) {
        this.invites = invites;
    }
    async stats(userId) {
        return this.invites.getUserInviteStats(userId);
    }
    async progress(userId) {
        return this.invites.getInviteProgress(userId);
    }
    async claim(body) {
        return this.invites.claimFreeDrink(body.user_id);
    }
    async remaining() {
        return this.invites.freeDrinksRemaining();
    }
    // 管理员API端点 - 使用SystemKeyGuard或JwtAuthGuard+AdminGuard
    async getAllInviteCodes() {
        return this.invites.getAllInviteCodes();
    }
    async updateInviteCode(body) {
        return this.invites.updateInviteCodeMaxUses(body.code, body.max_uses);
    }
    async createInviteCode(body) {
        return this.invites.createInviteCode(body.code, body.max_uses, body.description);
    }
    // 批量更新邀请码 (一键更新到1000次使用)
    async batchUpdateInvites() {
        return this.invites.batchUpdateInvites();
    }
};
exports.InvitesController = InvitesController;
__decorate([
    (0, common_1.Get)('/get-user-invite-stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('/get-invite-progress'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "progress", null);
__decorate([
    (0, common_1.Post)('/claim-free-drink'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "claim", null);
__decorate([
    (0, common_1.Get)('/free-drinks-remaining'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "remaining", null);
__decorate([
    (0, common_1.Get)('/admin/invite-codes'),
    (0, common_1.UseGuards)(system_key_guard_1.SystemKeyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "getAllInviteCodes", null);
__decorate([
    (0, common_1.Post)('/admin/update-invite-code'),
    (0, common_1.UseGuards)(system_key_guard_1.SystemKeyGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "updateInviteCode", null);
__decorate([
    (0, common_1.Post)('/admin/create-invite-code'),
    (0, common_1.UseGuards)(system_key_guard_1.SystemKeyGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "createInviteCode", null);
__decorate([
    (0, common_1.Post)('/admin/batch-update-invites'),
    (0, common_1.UseGuards)(system_key_guard_1.SystemKeyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "batchUpdateInvites", null);
exports.InvitesController = InvitesController = __decorate([
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [invites_service_1.InvitesService])
], InvitesController);
//# sourceMappingURL=invites.controller.js.map