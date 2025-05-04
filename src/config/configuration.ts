import { registerAs } from '@nestjs/config';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export interface MongoConfig {
  uri: string;
  database: string;
  username?: string;
  password?: string;
  authSource?: string;
}

export interface SourceConfig {
  name: string;
  bucket: string;
  prefix: string;
  bucketUrl: string;
  mapping: Record<string, string>;
}

export interface AppConfig {
  s3: S3Config;
  mongo: MongoConfig;
  sources: SourceConfig[];
  batchSize: number;
}

export default registerAs('app', () => {
  const configPath = path.join(process.cwd(), 'config', 'sources.yaml');
  const sourcesConfig = fs.existsSync(configPath)
    ? yaml.parse(fs.readFileSync(configPath, 'utf8'))
    : [];

  return {
    s3: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    mongo: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'data-ingestion',
      username: process.env.MONGODB_USERNAME,
      password: process.env.MONGODB_PASSWORD,
      authSource: process.env.MONGODB_AUTH_SOURCE,
    },
    sources: sourcesConfig,
    batchSize: parseInt(process.env.BATCH_SIZE || '1000', 10),
  } as AppConfig;
}); 