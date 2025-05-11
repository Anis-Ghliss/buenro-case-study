import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger(ErrorHandlingService.name);

  handleError(
    error: Error,
    context: string,
    additionalInfo?: Record<string, any>,
  ): void {
    const errorMessage = `Error in ${context}: ${error.message}`;
    const logData = {
      error: error.message,
      stack: error.stack,
      ...additionalInfo,
    };

    this.logger.error(errorMessage, logData);
  }

  handleWarning(
    message: string,
    context: string,
    additionalInfo?: Record<string, any>,
  ): void {
    const warningMessage = `Warning in ${context}: ${message}`;
    this.logger.warn(warningMessage, additionalInfo);
  }

  handleInfo(
    message: string,
    context: string,
    additionalInfo?: Record<string, any>,
  ): void {
    const infoMessage = `Info in ${context}: ${message}`;
    this.logger.log(infoMessage, additionalInfo);
  }
}
