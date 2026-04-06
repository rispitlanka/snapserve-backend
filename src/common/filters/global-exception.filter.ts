import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { mapPrismaKnownRequestError } from '../utils/prisma-error-mapper';

/**
 * Central API error handling: preserves Nest HttpExceptions, maps Prisma
 * errors to specific messages, and avoids opaque 500s for plain Error throws.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        response.status(status).json(res);
        return;
      }
      response.status(status).json({
        statusCode: status,
        message: res,
        error: HttpStatus[status] ?? 'Error',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const body = mapPrismaKnownRequestError(exception);
      response.status(body.statusCode).json(body);
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Invalid data for database operation: ${exception.message}`,
        error: 'Bad Request',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: `Database is unavailable: ${exception.message}`,
        error: 'Service Unavailable',
      });
      return;
    }

    const message =
      exception instanceof Error
        ? exception.message
        : `Unexpected error: ${String(exception)}`;

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Server error: ${message}`,
      error: 'Internal Server Error',
    });
  }
}
