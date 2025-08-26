import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../services/logging.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>() as any;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as any)
        : { message: (exception as any)?.message || 'Internal server error' };

    const stack = (exception as any)?.stack;
    const requestId = request?.requestId;

    // 상세 에러 로깅 (Python stacktrace 스타일과 유사하게 스택 포함)
    this.loggingService.error('Unhandled Exception', {
      requestId,
      endpoint: `${request.method} ${request.originalUrl}`,
      statusCode: status,
      error: errorResponse,
      message: (exception as any)?.message,
      name: (exception as any)?.name,
      stack,
      timestamp: new Date().toISOString(),
      request: {
        method: request.method,
        path: request.originalUrl,
        ip: request.ip,
        userAgent: request.get?.('user-agent'),
        query: request.query,
        body: this.sanitizeBody(request.body),
        headers: this.sanitizeHeaders(request.headers),
      },
    });

    // 콘솔에 핵심 에러 정보만 출력 (개발/디버깅용)
    console.error('🚨 UNHANDLED EXCEPTION');
    console.error('Request:', `${request.method} ${request.originalUrl}`);
    console.error('Status:', status);
    console.error('Error:', (exception as any)?.name || 'Unknown');
    console.error('Message:', (exception as any)?.message || 'No message');
    
    // 데이터베이스 에러 특별 처리
    if ((exception as any)?.code) {
      console.error('🗄️ DB Error Code:', (exception as any).code);
      if ((exception as any)?.detail) {
        console.error('Detail:', (exception as any).detail);
      }
    }
    
    // 스택 트레이스는 한 번만 출력
    if (stack) {
      console.error('📚 Stack Trace:');
      console.error(stack);
    }
    
    console.error('---\n');

    response.status(status).json({
      statusCode: status,
      message:
        (errorResponse && (errorResponse.message || errorResponse.error)) ||
        'Internal server error',
      error: errorResponse.error || (exception as any)?.name || 'Error',
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private sanitizeHeaders(headers: any) {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }

  private sanitizeBody(body: any) {
    if (!body) return body;
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }
}


