import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * Catch-all exception filter that:
 *  - returns a generic error message in production (no stack traces / Prisma error text)
 *  - still logs full detail server-side
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const expose = exception instanceof HttpException || !this.isProd;
    const detail =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as any)?.message ?? 'Internal server error';

    // Always log the full thing server-side.
    this.logger.error(
      `${req.method} ${req.url} → ${status}: ${
        typeof detail === 'string' ? detail : JSON.stringify(detail)
      }`,
      (exception as any)?.stack,
    );

    res.status(status).json(
      expose
        ? typeof detail === 'string'
          ? { statusCode: status, message: detail }
          : detail
        : { statusCode: status, message: 'Internal server error' },
    );
  }
}
