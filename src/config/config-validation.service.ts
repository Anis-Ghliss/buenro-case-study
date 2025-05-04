import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private readonly configService: ConfigService) {}

  validateConfig(): void {
    const config = this.configService.get<AppConfig>('app');
    const errors: string[] = [];

    if (!config.mongo.uri) {
      errors.push('MONGODB_URI is required');
    }
    if (!config.mongo.database) {
      errors.push('MONGODB_DATABASE is required');
    }

    if (config.mongo.uri.includes('@')) {
      if (!config.mongo.username) {
        errors.push('MONGODB_USERNAME is required when using authentication');
      }
      if (!config.mongo.password) {
        errors.push('MONGODB_PASSWORD is required when using authentication');
      }
    }

    if (process.env.NODE_ENV === 'production') {
      if (!config.s3.region) {
        errors.push('AWS_REGION is required in production');
      }
      if (!config.s3.accessKeyId) {
        errors.push('AWS_ACCESS_KEY_ID is required in production');
      }
      if (!config.s3.secretAccessKey) {
        errors.push('AWS_SECRET_ACCESS_KEY is required in production');
      }
    }

    if (errors.length > 0) {
      const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('Configuration validation successful');
  }
} 