import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';

// 프로세스 레벨 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION');
  if (reason instanceof Error) {
    console.error('Error:', reason.message);
    console.error('Stack:', reason.stack);
  } else {
    console.error('Reason:', reason);
  }
  process.exit(1);
});

async function bootstrap() {
  // Winston 로거 설정
  const winstonLogger = WinstonModule.createLogger({
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json(),
    ),
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple(),
        ),
      }),
      new transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
      new transports.File({
        filename: 'logs/combined.log',
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  const configService = app.get(ConfigService);

  // 글로벌 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        // 유효성 검사 에러를 일관된 형식으로 변환
        const formattedErrors = errors.map(error => {
          const constraints = error.constraints;
          if (constraints) {
            // 첫 번째 제약 조건 메시지만 사용
            const firstConstraint = Object.values(constraints)[0];
            return {
              field: error.property,
              message: firstConstraint,
              value: error.value,
            };
          }
          return {
            field: error.property,
            message: 'Invalid value',
            value: error.value,
          };
        });

        return new BadRequestException({
          success: false,
          message: 'Input data is invalid',
          errors: formattedErrors,
        });
      },
    }),
  );

  // Webhook 엔드포인트를 위한 raw body parser
  app.use('/api/v1/webhook/stripe', (req, res, next) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.body = data;
      next();
    });
  });

  // CORS 설정 (화이트리스트/패턴 기반, credentials 안전 처리)
  const rawCorsOrigins = configService.get<string>('CORS_ORIGIN', '');
  const allowedOrigins = rawCorsOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (allowedOrigins.length === 0) {
    allowedOrigins.push('*');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // 서버-서버 호출 등 Origin이 없는 경우 허용
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true; // reflect origin (credentials OK via function form)
        if (allowed.startsWith('*.')) {
          const suffix = allowed.slice(1); // e.g. .example.com
          return origin.endsWith(suffix);
        }
        return origin === allowed;
      });

      return isAllowed
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    optionsSuccessStatus: 204,
  });

  // 글로벌 프리픽스 설정
  app.setGlobalPrefix('api/v1');

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Trust United API')
    .setDescription('Trust United 플랫폼 API 문서')
    .setVersion('0.1.1')
    .addBearerAuth()
    .addTag('auth', '인증 관련')
    .addTag('users', '사용자 관리')
    .addTag('profiles', '프로필 관리')
    .addTag('user-updates', '사용자 업데이트 및 활동 로그')
    .addTag('payments', '결제 및 구독 관리')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0'); // <- 추가
  await app.listen(port, host); // <- 핵심

  console.log(`🚀 Trust United API 서버가 포트 ${port}에서 실행 중입니다.`);
  console.log(`📚 Swagger 문서: http://localhost:${port}/api`);
}

bootstrap();
