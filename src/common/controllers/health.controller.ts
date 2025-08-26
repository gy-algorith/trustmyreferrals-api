import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from '../dto/api-response.dto';
import { SimpleMetricsService } from '../services/simple-metrics.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
    private metricsService: SimpleMetricsService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'System health check' })
  @ApiResponse({ status: 200, type: ApiResponseDto, description: 'System status information' })
  async check(): Promise<ApiResponseDto<any>> {
    const diskStoragePath = this.configService.get<string>(
      'DISK_STORAGE_PATH',
      '/',
    );
    const diskThreshold =
      this.configService.get<number>('DISK_THRESHOLD_GB', 1) *
      1024 *
      1024 *
      1024; // GB to bytes
    const memoryThreshold =
      this.configService.get<number>('MEMORY_THRESHOLD_MB', 200) * 1024 * 1024; // MB to bytes

    const result = await this.health.check([
      // Check database connection
      () => this.db.pingCheck('database'),

      // Check memory usage
      () => this.memory.checkHeap('memory_heap', memoryThreshold),
      () => this.memory.checkRSS('memory_rss', memoryThreshold),

      // Check disk space
      () =>
        this.disk.checkStorage('disk', {
          path: diskStoragePath,
          threshold: diskThreshold,
        }),
    ]);
    return { success: true, data: result };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get simple application metrics' })
  @ApiResponse({ status: 200, type: ApiResponseDto, description: 'Application metrics' })
  async getMetrics(): Promise<ApiResponseDto<any>> {
    const metrics = this.metricsService.getStats();
    return { success: true, data: metrics };
  }
}
