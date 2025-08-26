import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { CommonModule } from '../common/common.module';
import { UserUpdatesModule } from '../user-updates/user-updates.module';
import { DeckModule } from '../deck/deck.module';

@Module({
  imports: [
    UsersModule,
    ProfilesModule,
    CommonModule, // EmailService를 포함한 CommonModule 추가
    UserUpdatesModule, // UserUpdatesService를 포함한 UserUpdatesModule 추가
    DeckModule, // DeckService를 포함한 DeckModule 추가
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
