import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
console.log('Worker bootstrap started');

import { ConfigValidationService } from '../config/config-validation.service';
import { IngestionService } from './ingestion/ingestion.service';

console.log('Worker bootstrap started');

async function bootstrap() {
  try {
    console.log('Starting worker 1...');
    const app = await NestFactory.createApplicationContext(WorkerModule);
    console.log('Starting worker 2 ...');
    const configValidationService = app.get(ConfigValidationService);
    console.log('Starting worker 3...');
    const ingestionService = app.get(IngestionService);
    console.log('Starting worker 4...');
    console.log('Worker started');
    configValidationService.validateConfig();

    await ingestionService.startIngestion();
  } catch (error) {
    console.error('Worker failed to start:', error);
  }
}

bootstrap();
