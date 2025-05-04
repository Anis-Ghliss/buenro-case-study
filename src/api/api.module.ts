import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertiesController } from './controllers/properties.controller';
import configuration from '../config/configuration';
import { Unified, UnifiedSchema } from '../common/persistence/schemas/unified.schema';
import { PersistenceService } from '../common/persistence/persistence.service';

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
  controllers: [PropertiesController],
  providers: [PersistenceService],
})
export class ApiModule {}
