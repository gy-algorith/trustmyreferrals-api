import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../services/logging.service';
import { SimpleMetricsService } from '../services/simple-metrics.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly loggingService: LoggingService,
    private readonly metricsService: SimpleMetricsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const requestId = this.generateRequestId();

    // attach requestId to req/res for downstream usage
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // 요청 시작 로깅 - 간소화
    this.loggingService.info(`🚀 ${method} ${originalUrl}`, {
      requestId,
      ip,
      userAgent: req.get('user-agent') || '',
    });

    // 메트릭 기록
    this.metricsService.recordRequest();

    // 응답 완료 시 로깅
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const userId = req.user
        ? (req.user as any).id || 'anonymous'
        : 'anonymous';

      // 성공/실패 메트릭 기록
      if (statusCode >= 400) {
        this.metricsService.recordError();
      } else if (statusCode >= 200 && statusCode < 300) {
        this.metricsService.recordSuccess();
      }

      // 응답 완료 로깅 - 간소화
      const logLevel = statusCode >= 400 ? 'warn' : 'info';
      const emoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
      
      this.loggingService[logLevel](
        `${emoji} ${method} ${originalUrl} - ${statusCode} (${duration}ms)`,
        {
          requestId,
          statusCode,
          duration,
          userId,
        },
      );

      // 에러 응답 상세 로깅 (에러일 때만)
      if (statusCode >= 400) {
        this.loggingService.warn(
          `🚨 Error: ${method} ${originalUrl} - ${statusCode}`,
          {
            requestId,
            statusCode,
            duration,
            userId,
            errorType: this.getErrorType(statusCode),
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            body: req.body ? this.sanitizeBody(req.body) : undefined,
          },
        );
      }

      // 느린 요청 로깅 (1초 이상일 때만)
      if (duration > 1000) {
        this.loggingService.warn(
          `🐌 Slow: ${method} ${originalUrl} - ${duration}ms`,
          {
            requestId,
            duration,
            threshold: 1000,
          },
        );
      }

      // 활동 로그 저장 (인증된 사용자만)
      if (userId !== 'anonymous') {
        this.loggingService
          .logActivity(userId, 'API_REQUEST', {
            requestId,
            method,
            path: originalUrl,
            statusCode,
            duration,
            ip,
          })
          .catch((err) => {
            this.loggingService.error('Failed to save activity log', {
              requestId,
              error: err.message,
            });
          });
      }
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    // 민감한 정보 제거
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 500) return 'SERVER_ERROR';
    if (statusCode >= 400) return 'CLIENT_ERROR';
    if (statusCode >= 300) return 'REDIRECT';
    return 'SUCCESS';
  }
}
