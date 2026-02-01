import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /* ---------------- CREATE ---------------- */

  async create(dto: CreateUserDto) {
    const user = this.userRepo.create({
      ...dto,
      // authRole: 'USER',
      status: 'ACTIVE',
    });

    await this.userRepo.save(user);

    return {
      success: true,
      message: 'User created successfully',
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

  async findByName(firstName: string) {
    return this.userRepo.findOne({ where: { firstName } });
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
