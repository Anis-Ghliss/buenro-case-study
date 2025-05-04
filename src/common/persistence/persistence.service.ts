import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { Unified } from './schemas/unified.schema';
import { UnifiedData } from '../../common/schemas/unified.schema';
import { CANONICAL_FIELDS } from '../../common/dictionaries/canonical-fields.dictionary';

@Injectable()
export class PersistenceService {
  private readonly logger = new Logger(PersistenceService.name);

  constructor(
    @InjectModel(Unified.name)
    private readonly unifiedModel: Model<Unified & Document>,
  ) {}

  private async checkConnection(): Promise<void> {
    const state = this.unifiedModel.db.readyState;
    if (state !== 1) {
      throw new Error(`Database is not connected. Current state: ${state}`);
    }
  }

  async saveBatch(data: UnifiedData[]): Promise<void> {
    if (data.length === 0) return;

    try {
      await this.checkConnection();

      const existingIds = await this.unifiedModel
        .find({ id: { $in: data.map(item => String(item.id)) } })
        .select('id')
        .lean();

      const existingIdSet = new Set(existingIds.map(doc => doc.id));

      const newData = data.filter(item => !existingIdSet.has(String(item.id)));

      if (newData.length === 0) {
        this.logger.log('All documents already exist in the database');
        return;
      }

      const validatedData = newData.map(item => {
        const transformedItem: any = {
          source: item.source,
          other: item.other || {},
        };

        for (const [fieldName, definition] of Object.entries(CANONICAL_FIELDS)) {
          if (item[fieldName] !== undefined) {
            transformedItem[fieldName] = definition.transform 
              ? definition.transform(item[fieldName])
              : item[fieldName];
          } else if (definition.required) {
            this.logger.warn(`Missing required field ${fieldName} in item from source ${item.source}`);
            throw new Error(`Missing required field ${fieldName}`);
          }
        }

        return transformedItem;
      });

      let result;
      try {
        result = await this.unifiedModel.insertMany(validatedData, { ordered: false });
      } catch (error) {
        this.logger.error(`Error inserting data: ${error.message}`);
        if (error.writeErrors) {
          error.writeErrors.forEach((writeError: any) => {
            this.logger.error(`Write error: ${JSON.stringify(writeError)}`);
          });
        }
        throw error;
      }
      
      const skippedCount = data.length - newData.length;
      if (skippedCount > 0) {
        this.logger.log(`Skipped ${skippedCount} existing documents`);
      }

      if (result.length === newData.length) {
        this.logger.log(`Successfully saved ${result.length} new records`);
      } else {
        this.logger.warn(`Partial save: ${result.length} out of ${newData.length} records saved`);
      }
    } catch (error) {
      if (error.writeErrors) {
        this.logger.error(`Partial failure: ${error.writeErrors.length} records failed to save`);
        error.writeErrors.forEach((writeError: any) => {
          this.logger.error(`Error saving record: ${writeError.errmsg}`);
        });
      } else {
        this.logger.error(`Error saving batch: ${error.message}`);
      }
      throw error;
    }
  }

  async getBySource(source: string): Promise<(Unified & Document)[]> {
    await this.checkConnection();
    return this.unifiedModel.find({ source }).exec();
  }

  async getByCity(city: string): Promise<(Unified & Document)[]> {
    await this.checkConnection();
    return this.unifiedModel.find({ city }).exec();
  }

  async getAvailableInCity(city: string): Promise<(Unified & Document)[]> {
    await this.checkConnection();
    return this.unifiedModel.find({ city, isAvailable: true }).exec();
  }

  async resetDatabase(): Promise<void> {
    try {
      await this.checkConnection();
      await this.unifiedModel.deleteMany({});
      this.logger.log('Database reset successful');
    } catch (error) {
      this.logger.error(`Error resetting database: ${error.message}`);
      throw error;
    }
  }

  async findWithFilter(filter: any, skip: number = 0, limit: number = 10): Promise<Unified[]> {
    try {
      await this.checkConnection();
      return await this.unifiedModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Error finding documents with filter:', error);
      throw error;
    }
  }

  async countWithFilter(filter: any): Promise<number> {
    try {
      await this.checkConnection();
      return await this.unifiedModel.countDocuments(filter).exec();
    } catch (error) {
      this.logger.error('Error counting documents with filter:', error);
      throw error;
    }
  }
} 