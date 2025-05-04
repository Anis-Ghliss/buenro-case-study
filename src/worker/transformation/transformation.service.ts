import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CANONICAL_FIELDS } from 'src/common/dictionaries/canonical-fields.dictionary';
import { UnifiedData, UnifiedSchema } from '../../common/schemas/unified.schema';
import { ErrorHandlingService } from '../../common/services/error-handling.service';
import { SourceConfigService } from '../../config/source-config.service';

@Injectable()
export class TransformationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sourceConfigService: SourceConfigService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {}

  private validateSourceData(sourceName: string, data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sourceConfig = this.sourceConfigService.getSourceConfig(sourceName);

    for (const [targetField, sourceField] of Object.entries(sourceConfig.mapping)) {
      if (sourceField.includes('.')) {
        const value = sourceField.split('.').reduce((obj, key) => obj?.[key], data);
        if (value === undefined) {
          errors.push(`Missing nested field: ${sourceField} for target field: ${targetField}`);
        }
      } else if (data[sourceField] === undefined) {
        errors.push(`Missing field: ${sourceField} for target field: ${targetField}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private transformValue(fieldName: string, value: any, fullObject?: any): any {
    const fieldDefinition = CANONICAL_FIELDS[fieldName];
    if (!fieldDefinition) {
      return value; 
    }

    try {
      return fieldDefinition.transform ? 
        fieldDefinition.transform(value, fullObject) : 
        value;
    } catch (error) {
      this.errorHandlingService.handleWarning(
        `Error transforming field ${fieldName}: ${error.message}`,
        'TransformationService.transformValue',
        { fieldName, value }
      );
      return fieldDefinition.defaultValue;
    }
  }

  private getPathPrefixes(path: string): string[] {
    const parts = path.split('.');
    const prefixes: string[] = [];
    
    for (let i = 1; i < parts.length; i++) {
      prefixes.push(parts.slice(0, i).join('.'));
    }
    
    return prefixes;
  }

  private getFieldsToExclude(mappedPaths: string[]): Set<string> {
    const fieldsToExclude = new Set<string>();
    
    mappedPaths.forEach(path => {
      fieldsToExclude.add(path);
      
      this.getPathPrefixes(path).forEach(prefix => {
        fieldsToExclude.add(prefix);
      });
    });
    
    return fieldsToExclude;
  }

  private extractUnmappedFields(data: any, mappedPaths: string[]): Record<string, any> {
    const fieldsToExclude = this.getFieldsToExclude(mappedPaths);
    const unmappedFields: Record<string, any> = {};
    
    Object.entries(data).forEach(([field, value]) => {
      if (!fieldsToExclude.has(field)) {
        unmappedFields[field] = value;
      }
    });
    
    return unmappedFields;
  }

  transform(sourceName: string, data: any): UnifiedData | null {
    try {
      const sourceConfig = this.sourceConfigService.getSourceConfig(sourceName);
      
      const validation = this.validateSourceData(sourceName, data);
      if (!validation.isValid) {
        this.errorHandlingService.handleWarning(
          `Data validation failed for source ${sourceName}. Missing fields: ${validation.errors.join(', ')}`,
          'TransformationService.transform',
          { sourceName, errors: validation.errors }
        );
        return null;
      }

      const transformed: any = {
        source: sourceName,
        other: {},
      };

      const mappedSourcePaths = Object.values(sourceConfig.mapping);
      
      for (const [targetField, sourceField] of Object.entries(sourceConfig.mapping)) {
        if (sourceField.includes('.')) {
          const value = sourceField.split('.').reduce((obj, key) => obj?.[key], data);
          transformed[targetField] = this.transformValue(targetField, value, data);
        } else {
          transformed[targetField] = this.transformValue(targetField, data[sourceField], data);
        }
      }

      transformed.other = this.extractUnmappedFields(data, mappedSourcePaths);

      const result = UnifiedSchema.safeParse(transformed);
      if (!result.success) {
        this.errorHandlingService.handleError(
          new Error('Schema validation failed'),
          'TransformationService.transform',
          { sourceName, error: result.error.format() }
        );
        return null;
      }

      return result.data;
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'TransformationService.transform',
        { sourceName }
      );
      return null;
    }
  }

  transformBatch(sourceName: string, data: any[]): UnifiedData[] {
    const transformedData = data
      .map(item => this.transform(sourceName, item))
      .filter((item): item is UnifiedData => item !== null);

    if (transformedData.length < data.length) {
      this.errorHandlingService.handleWarning(
        `Transformation completed with partial success. Processed ${data.length} records, successfully transformed ${transformedData.length} records.`,
        'TransformationService.transformBatch',
        { sourceName, total: data.length, successful: transformedData.length }
      );
    }

    return transformedData;
  }
}