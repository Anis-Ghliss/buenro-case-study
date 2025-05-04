import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, SourceConfig } from './configuration';

@Injectable()
export class SourceConfigService {
  constructor(private readonly configService: ConfigService) {}

  getSourceConfig(sourceName: string): SourceConfig {
    const config = this.configService.get<AppConfig>('app');
    const sourceConfig = config.sources.find(s => s.name === sourceName);
    if (!sourceConfig) {
      throw new Error(`Source configuration not found for ${sourceName}`);
    }
    return sourceConfig;
  }

  getAllSourceConfigs(): SourceConfig[] {
    const config = this.configService.get<AppConfig>('app');
    return config.sources || [];
  }
} 