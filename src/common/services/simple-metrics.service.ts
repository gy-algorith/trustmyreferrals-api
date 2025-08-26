import { Injectable } from '@nestjs/common';

@Injectable()
export class SimpleMetricsService {
  private requestCount = 0;
  private errorCount = 0;
  private successCount = 0;
  private startTime = Date.now();

  /**
   * 요청 기록
   */
  recordRequest(): void {
    this.requestCount++;
  }

  /**
   * 에러 기록
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * 성공 기록
   */
  recordSuccess(): void {
    this.successCount++;
  }

  /**
   * 현재 통계 가져오기
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    
    return {
      uptime: {
        milliseconds: uptime,
        hours: Math.round(uptimeHours * 100) / 100
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        success: this.successCount
      },
      errorRate: this.requestCount > 0 
        ? Math.round((this.errorCount / this.requestCount) * 10000) / 100 
        : 0,
      successRate: this.requestCount > 0 
        ? Math.round((this.successCount / this.requestCount) * 10000) / 100 
        : 0,
      averageRequestsPerHour: uptimeHours > 0 
        ? Math.round((this.requestCount / uptimeHours) * 100) / 100 
        : 0
    };
  }

  /**
   * 메트릭 초기화
   */
  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.successCount = 0;
    this.startTime = Date.now();
  }
}
