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
let PreferencesController = class PreferencesController {
    constructor(prefs) {
        this.prefs = prefs;
    }
    async get(userId) {
        const res = await this.prefs.getUserPreferences(userId);
        return res;
    }
    async save(body) {
        return this.prefs.saveUserPreferences(body.user_id, body.form_data);
    }
    async update(userId, updates) {
        return this.prefs.updateUserPreferences(userId, updates);
    }
    async remove(userId) {
        return this.prefs.deleteUserPreferences(userId);
    }
    async complete(userId) {
        return this.prefs.checkCompleteness(userId);
    }
    async asForm(userId) {
        return this.prefs.getAsFormData(userId);
    }
};
exports.PreferencesController = PreferencesController;
__decorate([
    (0, common_1.Get)('/preferences/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('/preferences'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "save", null);
__decorate([
    (0, common_1.Put)('/preferences/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('/preferences/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('/preferences/:userId/complete'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)('/preferences/:userId/form-data'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "asForm", null);
exports.PreferencesController = PreferencesController = __decorate([
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [preferences_service_1.PreferencesService])
], PreferencesController);
//# sourceMappingURL=preferences.controller.js.map