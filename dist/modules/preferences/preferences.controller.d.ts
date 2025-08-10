import { PreferencesService } from './preferences.service';
export declare class PreferencesController {
    private readonly prefs;
    constructor(prefs: PreferencesService);
    get(userId: string): Promise<{
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
    save(body: {
        user_id: string;
        form_data: any;
    }): Promise<{
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
    update(userId: string, updates: any): Promise<{
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
    remove(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    complete(userId: string): Promise<{
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
    asForm(userId: string): Promise<{
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
