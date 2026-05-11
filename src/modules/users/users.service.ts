import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthIdentity } from '../auth/auth.entity';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(AuthIdentity)
    private readonly identityRepo: Repository<AuthIdentity>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userAuthService: AuthService,
  ) {}

  /* ---------------- CREATE ---------------- */

  async save(user: User) {
    return this.userRepo.save(user);
  }

  async create(dto: CreateUserDto) {
    /**
     * 1️⃣ Ensure auth identity exists
     */
    let identity = await this.identityRepo.findOne({
      where: { email: dto.email },
    });

    if (!identity) {
      identity = this.identityRepo.create({
        email: dto.email,
        passwordHash: null,
        status: 'ACTIVE',
      });

      await this.identityRepo.save(identity);
    }

    /**
     * 2️⃣ Create user linked to auth identity
     */
    const user = this.userRepo.create({
      ...dto,
      status: 'ACTIVE',
      authIdentity: identity,
    });

    await this.userRepo.save(user);

    /**
     * 3️⃣ Send invite (set password)
     */
    await this.userAuthService.requestPasswordReset(user.email, 'USER_INVITE');

    return {
      success: true,
      message: 'User created and invitation email sent',
      item: user,
    };
  }

  /* ---------------- READ ---------------- */

  async findAll() {
    const items = await this.userRepo.find({
      order: { firstName: 'ASC' },
    });

    return {
      success: true,
      items,
    };
  }

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      item: user,
    };
  }

  async findById(id: number) {
    return this.userRepo.findOne({
      where: { id },
    });
  }

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByName(firstName: string) {
    return this.userRepo.findOne({ where: { firstName } });
  }

  async findByAuthIdentityId(authIdentityId: number) {
    return this.userRepo.findOne({
      where: {
        authIdentity: { id: authIdentityId },
        status: 'ACTIVE',
      },
      relations: ['authIdentity'],
    });
  }

  /* ---------------- UPDATE ---------------- */

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, dto);
    await this.userRepo.save(user);

    return {
      success: true,
      message: 'User updated successfully',
      item: user,
    };
  }

  /* ---------------- DELETE (SOFT) ---------------- */

  async deactivate(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = 'INACTIVE';
    await this.userRepo.save(user);

    return {
      success: true,
      message: 'User deactivated successfully',
    };
  }
}
