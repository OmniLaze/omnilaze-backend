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
exports.PreferencesController = void 0;
const common_1 = require("@nestjs/common");
const preferences_service_1 = require("./preferences.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let PreferencesController = class PreferencesController {
    constructor(prefs) {
        this.prefs = prefs;
    }
    async get(currentUserId, userId) {
        // Users can only view their own preferences
        if (currentUserId !== userId) {
            throw new common_1.ForbiddenException('您无权查看其他用户的偏好设置');
        }
        const res = await this.prefs.getUserPreferences(userId);
        return res;
    }
    async save(userId, body) {
        // Use user ID from JWT, not from body
        return this.prefs.saveUserPreferences(userId, body.form_data);
    }
    async update(currentUserId, userId, updates) {
        // Users can only update their own preferences
        if (currentUserId !== userId) {
            throw new common_1.ForbiddenException('您无权修改其他用户的偏好设置');
        }
        return this.prefs.updateUserPreferences(userId, updates);
    }
    async remove(currentUserId, userId) {
        // Users can only delete their own preferences
        if (currentUserId !== userId) {
            throw new common_1.ForbiddenException('您无权删除其他用户的偏好设置');
        }
        return this.prefs.deleteUserPreferences(userId);
    }
    async complete(currentUserId, userId) {
        // Users can only check their own preferences completeness
        if (currentUserId !== userId) {
            throw new common_1.ForbiddenException('您无权查看其他用户的偏好设置');
        }
        return this.prefs.checkCompleteness(userId);
    }
    async asForm(currentUserId, userId) {
        // Users can only get their own form data
        if (currentUserId !== userId) {
            throw new common_1.ForbiddenException('您无权查看其他用户的偏好设置');
        }
        return this.prefs.getAsFormData(userId);
    }
};
exports.PreferencesController = PreferencesController;
__decorate([
    (0, common_1.Get)('/preferences/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('/preferences'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "save", null);
__decorate([
    (0, common_1.Put)('/preferences/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('/preferences/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('/preferences/:userId/complete'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)('/preferences/:userId/form-data'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "asForm", null);
exports.PreferencesController = PreferencesController = __decorate([
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [preferences_service_1.PreferencesService])
], PreferencesController);
//# sourceMappingURL=preferences.controller.js.map