import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PersistenceService } from '../../common/persistence/persistence.service';
import { AppConfig, SourceConfig } from '../../config/configuration';
import { DataSourceService } from '../data-source/data-source.service';
import { Unified } from '../../common/persistence/schemas/unified.schema';
import { UnifiedData } from '../../common/schemas/unified.schema';
import { SourceConfigService } from '../../config/source-config.service';
import { ErrorHandlingService } from '../../common/services/error-handling.service';
import { TransformationService } from '../transformation/transformation.service';
import { performance } from 'perf_hooks';

@Injectable()
export class IngestionService {
  private isIngestionRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSourceService: DataSourceService,
    private readonly transformationService: TransformationService,
    private readonly persistenceService: PersistenceService,
    private readonly sourceConfigService: SourceConfigService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {}

  async startIngestion(): Promise<void> {
    if (this.isIngestionRunning) {
      this.errorHandlingService.handleInfo(
        'Ingestion is already running',
        'IngestionService.startIngestion',
      );
      return;
    }

    this.isIngestionRunning = true;

    this.processSourcesInBackground().catch((error) => {
      this.errorHandlingService.handleError(
        error,
        'IngestionService.startIngestion',
        { error: 'Background ingestion failed' },
      );
      this.isIngestionRunning = false;
    });
  }

  private async processSourcesInBackground(): Promise<void> {
    
    try {
      const sources = this.sourceConfigService.getAllSourceConfigs();

      if (!sources || sources.length === 0) {
        this.errorHandlingService.handleInfo(
          'No sources configured in sources.yaml',
          'IngestionService.processSourcesInBackground',
        );
        return;
      }

      this.errorHandlingService.handleInfo(
        `Found ${sources.length} sources to process`,
        'IngestionService.processSourcesInBackground',
      );

      for (const source of sources) {
        try {
          await this.processSource(source);
        } catch (error) {
          this.errorHandlingService.handleError(
            error,
            'IngestionService.processSourcesInBackground',
            { sourceName: source.name },
          );
          continue;
        }
      }
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'IngestionService.processSourcesInBackground',
        { error: 'Auto ingestion failed' },
      );
    } finally {
      this.isIngestionRunning = false;
      // const end = performance.now();
      // const durationSeconds = ((end - start) / 1000).toFixed(2);

      // this.errorHandlingService.handleInfo(
      //   `Ingestion completed in ${durationSeconds} seconds`,
      //   'IngestionService.processSourcesInBackground',
      // );

      // this.isIngestionRunning = false;
    }
  }

  private async processSource(source: SourceConfig): Promise<void> {
    this.errorHandlingService.handleInfo(
      `Processing source: ${source.name}`,
      'IngestionService.processSource',
    );

    const fileKey = source.bucketUrl.split('/').pop();
    if (!fileKey) {
      this.errorHandlingService.handleWarning(
        `No file key found in bucketUrl for source ${source.name}`,
        'IngestionService.processSource',
        { sourceName: source.name },
      );
      return;
    }

    try {
      await this.ingestFromSource(source.name, fileKey);
      this.errorHandlingService.handleInfo(
        `Successfully processed source ${source.name}`,
        'IngestionService.processSource',
      );
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'IngestionService.processSource',
        { sourceName: source.name },
      );
    }
  }

  async ingestFromSource(sourceName: string, fileKey: string): Promise<void> {
    try {
      const sourceConfig = this.sourceConfigService.getSourceConfig(sourceName);
      const config = this.configService.get<AppConfig>('app');

      this.errorHandlingService.handleInfo(
        `Starting ingestion from ${sourceName} for file ${fileKey}`,
        'IngestionService.ingestFromSource',
      );

      const stream = await this.dataSourceService.getObjectStream(
        sourceName,
        fileKey,
      );

      for await (const batch of this.dataSourceService.processStream(
        stream,
        config.batchSize,
      )) {
        const transformedData = this.transformationService.transformBatch(
          sourceName,
          batch,
        );

        if (transformedData.length > 0) {
          await this.persistenceService.saveBatch(transformedData);
        }
      }

      this.errorHandlingService.handleInfo(
        `Completed ingestion from ${sourceName} for file ${fileKey}`,
        'IngestionService.ingestFromSource',
      );
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'IngestionService.ingestFromSource',
        { sourceName, fileKey },
      );
      throw error;
    }
  }

  async ingestData(sourceName: string): Promise<void> {
    try {
      this.errorHandlingService.handleInfo(
        `Starting ingestion for source: ${sourceName}`,
        'IngestionService.ingestData',
      );

      const sourceConfig = this.dataSourceService.getSourceConfig(sourceName);
      const stream = await this.dataSourceService.getObjectStream(
        sourceName,
        sourceConfig.prefix,
      );

      for await (const batch of this.dataSourceService.processStream(
        stream,
        100,
      )) {
        const transformedData = batch.map((item) =>
          this.transformData(item, sourceConfig.mapping),
        );
        await this.persistenceService.saveBatch(
          transformedData as UnifiedData[],
        );
      }

      this.errorHandlingService.handleInfo(
        `Completed ingestion for source: ${sourceName}`,
        'IngestionService.ingestData',
      );
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'IngestionService.ingestData',
        { sourceName },
      );
      throw error;
    }
  }

  private transformData(data: any, mapping: Record<string, string>): Unified {
    const transformed: any = {};

    for (const [canonicalField, sourceField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        transformed[canonicalField] = data[sourceField];
      }
    }

    return transformed as Unified;
  }
}
