import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

import { Admin, AdminRole, AdminStatus } from './admins.entity';
import { AdminInvite } from './admins_invites.entity';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,

    @InjectRepository(AdminInvite)
    private readonly inviteRepo: Repository<AdminInvite>,
  ) {}

  /* --------------------------------
       INVITE ADMIN (SUPER_ADMIN only)
    -------------------------------- */
  async inviteAdmin(email: string) {
    const existingAdmin = await this.adminRepo.findOne({ where: { email } });
    if (existingAdmin) {
      throw new BadRequestException('Admin already exists');
    }

    const token = randomUUID();

    const invite = this.inviteRepo.create({
      email,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
    });

    await this.inviteRepo.save(invite);

    return {
      success: true,
      token, // later this goes into email
    };
  }

  /* --------------------------------
       ACCEPT INVITE
    -------------------------------- */
  async acceptInvite(token: string, password: string) {
    const invite = await this.inviteRepo.findOne({ where: { token } });

    if (!invite || invite.used) {
      throw new BadRequestException('Invalid or used invite');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = this.adminRepo.create({
      email: invite.email,
      passwordHash,
      role: AdminRole.ADMIN,
    });

    await this.adminRepo.save(admin);

    invite.used = true;
    await this.inviteRepo.save(invite);

    return { success: true };
  }

  /* --------------------------------
       LOGIN
    -------------------------------- */
  async validateLogin(email: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { email } });

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      throw new BadRequestException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      throw new BadRequestException('Invalid credentials');
    }

    return admin;
  }

  /* --------------------------------
       SUPER ADMIN CHECK
    -------------------------------- */
  async ensureSingleSuperAdmin() {
    const existing = await this.adminRepo.findOne({
      where: { role: AdminRole.SUPER_ADMIN },
    });

    if (existing) {
      throw new ForbiddenException('SUPER_ADMIN already exists');
    }
  }
  /* --------------------------------
       FIND BY EMAIL
    -------------------------------- */

  async findByEmail(email: string) {
    return this.adminRepo.findOne({
      where: { email },
    });
  }

  /* --------------------------------
       FIND BY ID
    -------------------------------- */

  async findById(id: number): Promise<Admin> {
    const admin = await this.adminRepo.findOne({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
  }
}
