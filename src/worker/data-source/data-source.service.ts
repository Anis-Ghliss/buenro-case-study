import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { AppConfig, SourceConfig } from '../../config/configuration';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { Transform } from 'stream';
import axios from 'axios';

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<AppConfig>('app');

    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      endpoint: config.s3.endpoint,
    });
  }

  getSourceConfig(sourceName: string): SourceConfig {
    const config = this.configService.get<AppConfig>('app');
    this.logger.debug(
      `Available sources: ${JSON.stringify(
        config.sources.map((s) => ({
          name: s.name,
          bucket: s.bucket,
          prefix: s.prefix,
          bucketUrl: s.bucketUrl,
        })),
      )}`,
    );

    const sourceConfig = config.sources.find((s) => s.name === sourceName);
    if (!sourceConfig) {
      throw new Error(`Source configuration not found for ${sourceName}`);
    }

    this.logger.debug(
      `Using source configuration: ${JSON.stringify({
        name: sourceConfig.name,
        bucket: sourceConfig.bucket,
        prefix: sourceConfig.prefix,
        bucketUrl: sourceConfig.bucketUrl,
      })}`,
    );

    return sourceConfig;
  }

  async getObjectStream(
    sourceName: string,
    fileKey: string,
  ): Promise<Readable> {
    try {
      const sourceConfig = this.getSourceConfig(sourceName);

      if (sourceConfig.bucketUrl.startsWith('http')) {
        this.logger.debug('Fetching from HTTP URL:', {
          url: sourceConfig.bucketUrl,
        });
        const response = await axios.get(sourceConfig.bucketUrl, {
          responseType: 'stream',
        });
        return response.data;
      }

      const fullKey = `${sourceConfig.prefix}${fileKey}`;
      this.logger.debug('Fetching object from S3:', {
        bucket: sourceConfig.bucket,
        key: fullKey,
      });

      const command = new GetObjectCommand({
        Bucket: sourceConfig.bucket,
        Key: fullKey,
      });

      const response = await this.s3Client.send(command);
      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Error getting object: ${error.message}`);
      throw error;
    }
  }

  createStreamPipeline(stream: Readable, batchSize: number) {
    return chain([
      stream,
      parser(),
      streamArray(),
      new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          callback(null, chunk.value);
        },
      }),
    ]);
  }

  async *processStream(stream: Readable, batchSize: number) {
    const pipeline = this.createStreamPipeline(stream, batchSize);
    let buffer: any[] = [];

    for await (const data of pipeline) {
      try {
        buffer.push(data);

        if (buffer.length >= batchSize) {
          yield buffer;
          buffer = [];
        }
      } catch (error) {
        this.logger.error(`Error processing chunk: ${error.message}`);
        continue;
      }
    }

    if (buffer.length > 0) {
      yield buffer;
    }
  }
}
