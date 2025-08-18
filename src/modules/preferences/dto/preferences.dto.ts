import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SavePreferencesDto {
  @ApiProperty({
    description: 'Form data containing user preferences',
    example: {
      address: '北京市朝阳区某某街道123号',
      selectedFoodType: ['chinese', 'western'],
      selectedAllergies: ['peanuts'],
      selectedPreferences: ['spicy', 'low-salt'],
      budget: '50',
      otherAllergyText: '海鲜过敏',
      otherPreferenceText: '喜欢清淡口味',
      selectedAddressSuggestion: { formatted_address: '推荐地址' }
    }
  })
  @IsObject()
  @IsNotEmpty()
  form_data: any;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Default address',
    example: '北京市朝阳区某某街道123号'
  })
  @IsString()
  @IsOptional()
  defaultAddress?: string;

  @ApiPropertyOptional({
    description: 'Default food types (JSON array)',
    example: ['chinese', 'western']
  })
  @IsOptional()
  defaultFoodType?: string[];

  @ApiPropertyOptional({
    description: 'Default allergies (JSON array)',
    example: ['peanuts', 'shellfish']
  })
  @IsOptional()
  defaultAllergies?: string[];

  @ApiPropertyOptional({
    description: 'Default preferences (JSON array)',
    example: ['spicy', 'vegetarian']
  })
  @IsOptional()
  defaultPreferences?: string[];

  @ApiPropertyOptional({
    description: 'Default budget',
    example: '50'
  })
  @IsString()
  @IsOptional()
  defaultBudget?: string;

  @ApiPropertyOptional({
    description: 'Additional allergy text',
    example: '对海鲜过敏'
  })
  @IsString()
  @IsOptional()
  otherAllergyText?: string;

  @ApiPropertyOptional({
    description: 'Additional preference text',
    example: '喜欢清淡口味'
  })
  @IsString()
  @IsOptional()
  otherPreferenceText?: string;
}