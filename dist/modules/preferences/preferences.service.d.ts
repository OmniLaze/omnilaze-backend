import { PrismaService } from '../../db/prisma.service';
export declare class PreferencesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getUserPreferences(userId: string): Promise<{
        success: boolean;
        message: string;
        has_preferences?: undefined;
        preferences?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        message: string;
        preferences?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        preferences: {
            default_address: string;
            default_food_type: any;
            default_allergies: any;
            default_preferences: any;
            default_budget: string;
            other_allergy_text: string;
            other_preference_text: string;
            address_suggestion: any;
        };
        message?: undefined;
    }>;
    saveUserPreferences(userId: string, formData: any): Promise<{
        success: boolean;
        message: string;
        has_preferences?: undefined;
        preferences?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        message: string;
        preferences?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        preferences: {
            default_address: string;
            default_food_type: any;
            default_allergies: any;
            default_preferences: any;
            default_budget: string;
            other_allergy_text: string;
            other_preference_text: string;
            address_suggestion: any;
        };
        message?: undefined;
    }>;
    updateUserPreferences(userId: string, updates: any): Promise<{
        success: boolean;
        message: string;
        has_preferences?: undefined;
        preferences?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        message: string;
        preferences?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        preferences: {
            default_address: string;
            default_food_type: any;
            default_allergies: any;
            default_preferences: any;
            default_budget: string;
            other_allergy_text: string;
            other_preference_text: string;
            address_suggestion: any;
        };
        message?: undefined;
    }>;
    deleteUserPreferences(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    checkCompleteness(userId: string): Promise<{
        success: boolean;
        has_preferences: boolean;
        is_complete: boolean;
        can_quick_order: boolean;
        message: string;
        preferences?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        is_complete: boolean;
        can_quick_order: boolean;
        preferences: any;
        message?: undefined;
    }>;
    getAsFormData(userId: string): Promise<{
        success: boolean;
        has_preferences: boolean;
        form_data: {
            address: string;
            selectedFoodType: never[];
            selectedAllergies: never[];
            selectedPreferences: never[];
            budget: string;
            otherAllergyText: string;
            otherPreferenceText: string;
            selectedAddressSuggestion: null;
        };
        can_quick_order?: undefined;
    } | {
        success: boolean;
        has_preferences: boolean;
        form_data: {
            address: any;
            selectedFoodType: any;
            selectedAllergies: any;
            selectedPreferences: any;
            budget: any;
            otherAllergyText: any;
            otherPreferenceText: any;
            selectedAddressSuggestion: any;
        };
        can_quick_order: boolean;
    }>;
}
