import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Form data containing order details',
    example: {
      address: '北京市朝阳区某某街道123号',
      deliveryTime: 'ASAP',
      allergies: ['peanuts', 'shellfish'],
      preferences: ['spicy', 'vegetarian'],
      budget: 50,
      foodType: ['chinese', 'drink']
    }
  })
  @IsObject()
  @IsNotEmpty()
  form_data: any;
}

export class SubmitOrderDto {
  @ApiProperty({
    description: 'Order ID to submit',
    example: 'ord_1234567890'
  })
  @IsString()
  @IsNotEmpty()
  order_id!: string;
}

export class OrderFeedbackDto {
  @ApiProperty({
    description: 'Order ID for feedback',
    example: 'ord_1234567890'
  })
  @IsString()
  @IsNotEmpty()
  order_id!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  @IsString()
  @IsNotEmpty()
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional feedback text',
    example: '食物很好吃，送达及时'
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class ImportArrivalImageDto {
  @ApiProperty({
    description: 'Image URL for arrival photo',
    example: 'https://example.com/image.jpg'
  })
  @IsString()
  @IsNotEmpty()
  image_url!: string;

  @ApiPropertyOptional({
    description: 'Source of the image',
    example: 'delivery_app'
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when image was taken',
    example: '2024-01-01T12:00:00Z'
  })
  @IsString()
  @IsOptional()
  taken_at?: string;
}

export class ImportArrivalImageByNumberDto extends ImportArrivalImageDto {
  @ApiProperty({
    description: 'Order number',
    example: 'ORD20240101001'
  })
  @IsString()
  @IsNotEmpty()
  order_number!: string;
}

export class VoiceFeedbackDto {
  @ApiPropertyOptional({
    description: 'Duration of audio in seconds',
    example: '30'
  })
  @IsString()
  @IsOptional()
  duration_sec?: string;

  @ApiPropertyOptional({
    description: 'Transcript of the voice feedback',
    example: '服务很好，下次还会再来'
  })
  @IsString()
  @IsOptional()
  transcript?: string;
}