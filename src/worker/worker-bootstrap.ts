import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { ConfigValidationService } from '../config/config-validation.service';
import { IngestionService } from './ingestion/ingestion.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const configValidationService = app.get(ConfigValidationService);
  const ingestionService = app.get(IngestionService);

  configValidationService.validateConfig();
  
  await ingestionService.startIngestion();
}

bootstrap().catch(error => {
  console.error('Worker failed to start:', error);
  process.exit(1);
}); 