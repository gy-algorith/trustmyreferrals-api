import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '상세 헬스 체크' })
  @ApiResponse({ status: 200, description: '모든 서비스가 정상적으로 작동 중입니다.' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
