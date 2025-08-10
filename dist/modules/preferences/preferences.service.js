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
exports.PreferencesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../db/prisma.service");
let PreferencesService = class PreferencesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserPreferences(userId) {
        if (!userId)
            return { success: false, message: '用户ID不能为空' };
        const p = await this.prisma.userPreferences.findUnique({ where: { userId } });
        if (!p)
            return { success: true, has_preferences: false, message: '用户暂无保存的偏好设置' };
        return {
            success: true,
            has_preferences: true,
            preferences: {
                default_address: p.defaultAddress,
                default_food_type: JSON.parse(p.defaultFoodType || '[]'),
                default_allergies: JSON.parse(p.defaultAllergies || '[]'),
                default_preferences: JSON.parse(p.defaultPreferences || '[]'),
                default_budget: p.defaultBudget,
                other_allergy_text: p.otherAllergyText,
                other_preference_text: p.otherPreferenceText,
                address_suggestion: p.addressSuggestion ? JSON.parse(p.addressSuggestion) : null,
            },
        };
    }
    async saveUserPreferences(userId, formData) {
        if (!userId)
            return { success: false, message: '用户ID不能为空' };
        if (!formData?.address)
            return { success: false, message: '配送地址不能为空' };
        const data = {
            userId,
            defaultAddress: formData.address || '',
            defaultFoodType: JSON.stringify(formData.selectedFoodType || []),
            defaultAllergies: JSON.stringify(formData.selectedAllergies || []),
            defaultPreferences: JSON.stringify(formData.selectedPreferences || []),
            defaultBudget: formData.budget || '',
            otherAllergyText: formData.otherAllergyText || '',
            otherPreferenceText: formData.otherPreferenceText || '',
            addressSuggestion: formData.selectedAddressSuggestion ? JSON.stringify(formData.selectedAddressSuggestion) : '',
            updatedAt: new Date(),
            createdAt: new Date(),
        };
        const existing = await this.prisma.userPreferences.findUnique({ where: { userId } });
        if (existing) {
            await this.prisma.userPreferences.update({ where: { userId }, data });
        }
        else {
            await this.prisma.userPreferences.create({ data });
        }
        return await this.getUserPreferences(userId);
    }
    async updateUserPreferences(userId, updates) {
        const existing = await this.prisma.userPreferences.findUnique({ where: { userId } });
        if (!existing)
            return { success: false, message: '用户偏好不存在' };
        const convert = (k, v) => (['defaultFoodType', 'defaultAllergies', 'defaultPreferences', 'addressSuggestion'].includes(k) ? JSON.stringify(v) : v);
        const data = {};
        Object.entries(updates || {}).forEach(([k, v]) => {
            if (v !== null && v !== undefined)
                data[k] = convert(k, v);
        });
        data.updatedAt = new Date();
        await this.prisma.userPreferences.update({ where: { userId }, data });
        return await this.getUserPreferences(userId);
    }
    async deleteUserPreferences(userId) {
        const existing = await this.prisma.userPreferences.findUnique({ where: { userId } });
        if (!existing)
            return { success: false, message: '用户偏好不存在' };
        await this.prisma.userPreferences.delete({ where: { userId } });
        return { success: true, message: '偏好设置删除成功' };
    }
    async checkCompleteness(userId) {
        const r = await this.getUserPreferences(userId);
        if (!r.success || !r.has_preferences)
            return { success: true, has_preferences: false, is_complete: false, can_quick_order: false, message: '用户暂无保存的偏好设置' };
        const p = r.preferences;
        const isComplete = !!(p.default_address && p.default_budget && Array.isArray(p.default_food_type) && p.default_food_type.length > 0);
        return { success: true, has_preferences: true, is_complete: isComplete, can_quick_order: isComplete, preferences: p };
    }
    async getAsFormData(userId) {
        const r = await this.getUserPreferences(userId);
        if (!r.success || !r.has_preferences)
            return { success: true, has_preferences: false, form_data: { address: '', selectedFoodType: [], selectedAllergies: [], selectedPreferences: [], budget: '', otherAllergyText: '', otherPreferenceText: '', selectedAddressSuggestion: null } };
        const p = r.preferences;
        const form = {
            address: p.default_address || '',
            selectedFoodType: p.default_food_type || [],
            selectedAllergies: p.default_allergies || [],
            selectedPreferences: p.default_preferences || [],
            budget: p.default_budget || '',
            otherAllergyText: p.other_allergy_text || '',
            otherPreferenceText: p.other_preference_text || '',
            selectedAddressSuggestion: p.address_suggestion || null,
        };
        const canQuick = !!(form.address && form.budget && Array.isArray(form.selectedFoodType) && form.selectedFoodType.length > 0);
        return { success: true, has_preferences: true, form_data: form, can_quick_order: canQuick };
    }
};
exports.PreferencesService = PreferencesService;
exports.PreferencesService = PreferencesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PreferencesService);
//# sourceMappingURL=preferences.service.js.map