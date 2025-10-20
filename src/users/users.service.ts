import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '../common/enums/user-role.enum';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByEmailAndRole(email: string, role: UserRole): Promise<User | null> {
    // 데이터베이스 레벨에서 이메일과 역할을 모두 필터링
    return this.usersRepository.findOne({ 
      where: { email, role } 
    });
  }

  async findByResetToken(resetToken: string, role?: UserRole): Promise<User | null> {
    // 통합된 비밀번호 재설정 토큰으로 검색
    return this.usersRepository.findOne({ 
      where: { passwordResetToken: resetToken }
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    // Check if user already exists with this email
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }

    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    user.status = status;
    return this.usersRepository.save(user);
  }

  async updateSubscriptionPurchased(userId: string, subscriptionPurchased: boolean): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.subscriptionPurchased = subscriptionPurchased;
    await this.usersRepository.save(user);
  }

  /**
   * 사용자의 refresh 토큰을 업데이트
   * @param userId 사용자 ID
   * @param refreshToken 새로운 refresh 토큰 (null이면 제거)
   */
  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (refreshToken === null) {
      user.clearRefreshToken();
    } else {
      user.setRefreshToken(refreshToken);
    }
    
    await this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }
}
