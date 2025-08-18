import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetUserInviteStatsDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user_123456'
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export class ClaimFreeDrinkDto {
  @ApiProperty({
    description: 'User ID claiming free drink',
    example: 'user_123456'
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export class UpdateInviteCodeDto {
  @ApiProperty({
    description: 'Invite code to update',
    example: 'WELCOME'
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Maximum number of uses',
    example: 1000,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  max_uses: number;
}

export class CreateInviteCodeDto {
  @ApiProperty({
    description: 'New invite code',
    example: 'NEWCODE2024'
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Maximum number of uses',
    example: 100,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  max_uses: number;

  @ApiPropertyOptional({
    description: 'Description of the invite code',
    example: 'New Year 2024 promotion code'
  })
  @IsString()
  @IsOptional()
  description?: string;
}