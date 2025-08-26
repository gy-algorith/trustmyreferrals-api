import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, transports, Logger } from 'winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from 'src/entities/activity-log.entity';

@Injectable()
export class LoggingService {
  private logger: Logger;

  constructor(
    private configService: ConfigService,
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {
    const logDir = this.configService.get<string>('LOG_DIR', 'logs');
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
    const isProduction = environment === 'production';

    // 로그 포맷 설정
    const logFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.splat(),
      format.json(),
    );

    // 콘솔 출력 포맷 설정 (개발 환경에서는 더 읽기 쉬운 형태로)
    const consoleFormat = isProduction
      ? logFormat
      : format.combine(
          format.colorize(),
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          format.printf((info) => {
            const { timestamp, level, message, stack, ...meta } = info as any;
            const metaString = Object.keys(meta).length
              ? `\n${JSON.stringify(meta, null, 2)}`
              : '';
            const stackString = stack ? `\n${stack}` : '';
            return `${timestamp} ${level}: ${message}${metaString}${stackString}`;
          }),
        );

    // 로거 설정
    this.logger = createLogger({
      level: isProduction ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: { service: 'trust-api' },
      transports: [
        // 콘솔 출력
        new transports.Console({
          format: consoleFormat,
        }),
        // 로그 파일 생성 (info 레벨)
        new transports.File({
          filename: `${logDir}/application.log`,
          level: 'info',
        }),
        // 에러 로그 파일 생성
        new transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
        }),
      ],
    });

    // 프로덕션 환경이 아닌 경우 디버그 레벨 로그 파일 추가
    if (!isProduction) {
      this.logger.add(
        new transports.File({
          filename: `${logDir}/debug.log`,
          level: 'debug',
        }),
      );
    }
  }

  /**
   * 일반 로그 기록
   */
  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }

  /**
   * 디버그 로그
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * 정보 로그
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * 경고 로그
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * 에러 로그
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * 에러 스택 트레이스를 상세히 분석하고 로깅
   */
  logDetailedError(error: Error, context?: string, additionalInfo?: any) {
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      additionalInfo,
      timestamp: new Date().toISOString(),
    };

    // 스택 트레이스 분석
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const relevantStack = stackLines
        .filter(line => 
          line.includes('src/') || 
          line.includes('node_modules/') ||
          line.includes('at ')
        )
        .slice(0, 10); // 상위 10줄만

      errorDetails['parsedStack'] = relevantStack;
    }

    // 데이터베이스 에러 특별 처리
    if ((error as any).code) {
      errorDetails['databaseError'] = {
        code: (error as any).code,
        sql: (error as any).sql,
        parameters: (error as any).parameters,
      };
    }

    // 콘솔에 상세 출력
    console.error('🔍 DETAILED ERROR ANALYSIS:');
    console.error('Context:', context || 'Unknown');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    
    if (errorDetails['parsedStack']) {
      console.error('📚 Relevant Stack Trace:');
      errorDetails['parsedStack'].forEach((line, index) => {
        console.error(`  ${index + 1}. ${line.trim()}`);
      });
    }
    
    if (errorDetails['databaseError']) {
      console.error('🗄️ Database Error Details:');
      console.error('  Code:', errorDetails['databaseError'].code);
      if (errorDetails['databaseError'].sql) {
        console.error('  SQL:', errorDetails['databaseError'].sql);
      }
      if (errorDetails['databaseError'].parameters) {
        console.error('  Parameters:', errorDetails['databaseError'].parameters);
      }
    }
    
    console.error('🚨 END OF ERROR ANALYSIS\n');

    // Winston 로거로도 기록
    this.error('Detailed Error Analysis', errorDetails);
  }

  /**
   * 사용자 활동 로그 기록 (데이터베이스)
   */
  async logActivity(
    userId: string,
    action: string,
    details?: any,
  ): Promise<ActivityLog> {
    const activityLog = this.activityLogRepository.create({
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
    });

    // 로그 파일에도 기록
    this.info(`User ${userId} performed ${action}`, {
      userId,
      action,
      details,
    });

    return this.activityLogRepository.save(activityLog);
  }

  /**
   * 관리자용 활동 로그 조회
   */
  async getActivityLogs(
    page = 1,
    limit = 10,
    userId?: string,
    action?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    const queryBuilder =
      this.activityLogRepository.createQueryBuilder('activity_log');

    // 필터 적용
    if (userId) {
      queryBuilder.andWhere('activity_log.userId = :userId', { userId });
    }

    if (action) {
      queryBuilder.andWhere('activity_log.action = :action', { action });
    }

    if (startDate) {
      queryBuilder.andWhere('activity_log.timestamp >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('activity_log.timestamp <= :endDate', { endDate });
    }

    // 페이지네이션 및 정렬
    const [logs, total] = await queryBuilder
      .orderBy('activity_log.timestamp', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }
}
