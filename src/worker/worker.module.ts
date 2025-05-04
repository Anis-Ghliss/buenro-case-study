import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Unified, UnifiedSchema } from '../common/persistence/schemas/unified.schema';
import { DataSourceService } from './data-source/data-source.service';
import { PersistenceService } from '../common/persistence/persistence.service';
import { IngestionService } from './ingestion/ingestion.service';
import configuration from '../config/configuration';
import { ConfigValidationService } from '../config/config-validation.service';
import { SourceConfigService } from '../config/source-config.service';
import { ErrorHandlingService } from '../common/services/error-handling.service';
import { TransformationService } from './transformation/transformation.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DATABASE,
        auth: {
          username: process.env.MONGODB_USERNAME,
          password: process.env.MONGODB_PASSWORD,
        },
        authSource: process.env.MONGODB_AUTH_SOURCE,
      }),
    }),
    MongooseModule.forFeature([
      { name: Unified.name, schema: UnifiedSchema },
    ]),
  ],
  providers: [
    DataSourceService,
    SourceConfigService,
    PersistenceService,
    IngestionService,
    TransformationService,
    ConfigValidationService,
    ErrorHandlingService,
  ],
})
export class WorkerModule {} 