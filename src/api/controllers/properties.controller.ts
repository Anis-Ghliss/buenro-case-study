import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PersistenceService } from '../../common/persistence/persistence.service';
import { PropertyDto, PaginatedPropertiesResponseDto } from '../dto/property.dto';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  private readonly logger = new Logger(PropertiesController.name);

  constructor(private readonly persistenceService: PersistenceService) {}

  @Get()
  @ApiOperation({ summary: 'Get properties with filters and pagination' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'priceSegment', required: false, type: String, enum: ['low', 'medium', 'high'] })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiResponse({ 
    status: 200, 
    description: 'Filtered properties returned with pagination',
    type: PaginatedPropertiesResponseDto
  })
  async getFiltered(
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('isAvailable') isAvailable?: string,
    @Query('priceSegment') priceSegment?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('source') source?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<PaginatedPropertiesResponseDto> {
    // Build dynamic filter
    const filter: any = {};
    if (city) filter.city = city;
    if (country) filter.country = country;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (priceSegment) filter.priceSegment = priceSegment;
    if (source) filter.source = source;
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    this.logger.debug('Filtering properties with criteria:', { filter, page: pageNum, limit: limitNum });

    const [data, total] = await Promise.all([
      this.persistenceService.findWithFilter(filter, skip, limitNum),
      this.persistenceService.countWithFilter(filter),
    ]);

    return {
      data: data as unknown as PropertyDto[],
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
} 