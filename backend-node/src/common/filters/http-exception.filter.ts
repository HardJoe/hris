import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface PostgresDriverError extends Error {
  code?: string;
  constraint?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(normalized.status).json({
      error: {
        statusCode: normalized.status,
        code: normalized.code,
        message: normalized.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  private normalize(exception: unknown): {
    status: number;
    code: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const fallback = exception.message;
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: string | string[] }).message
          : typeof body === 'string'
            ? body
            : fallback;
      return { status: exception.getStatus(), code: exception.name, message };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as PostgresDriverError;
      if (driverError.code === '23505') {
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_RESOURCE',
          message: 'A resource with the same unique value already exists',
        };
      }
      if (driverError.code === '23503') {
        return {
          status: HttpStatus.CONFLICT,
          code: 'RESOURCE_IN_USE',
          message: 'The resource is still referenced by another resource',
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}
