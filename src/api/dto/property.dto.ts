import { ApiProperty } from '@nestjs/swagger';

export class PropertyDto {
  @ApiProperty({ description: 'Unique identifier of the property' })
  id: string;

  @ApiProperty({ description: 'Name of the property', required: false })
  name?: string;

  @ApiProperty({ description: 'City where the property is located' })
  city: string;

  @ApiProperty({ description: 'Country where the property is located', required: false })
  country?: string;

  @ApiProperty({ description: 'Whether the property is currently available' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Price per night for the property' })
  pricePerNight: number;

  @ApiProperty({ description: 'Price segment category (low, medium, high)', required: false })
  priceSegment?: string;

  @ApiProperty({ description: 'Additional property information', required: false })
  other?: Record<string, any>;

  @ApiProperty({ description: 'Source of the property data' })
  source: string;
}

export class PaginatedPropertiesResponseDto {
  @ApiProperty({ type: [PropertyDto], description: 'List of properties' })
  data: PropertyDto[];

  @ApiProperty({ description: 'Total number of properties matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
} 