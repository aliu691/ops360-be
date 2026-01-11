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
import { EmailService } from '../email/email.service';
import { adminInviteTemplate } from '../email/templates/admin-invite.template';
import { AdminPasswordReset } from './admins_password_resets.entity';
import { passwordResetTemplate } from '../email/templates/password-reset.template';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,

    @InjectRepository(AdminInvite)
    private readonly inviteRepo: Repository<AdminInvite>,

    @InjectRepository(AdminPasswordReset)
    private readonly resetRepo: Repository<AdminPasswordReset>,

    private readonly emailService: EmailService,
  ) {}

  /* --------------------------------
       INVITE ADMIN (SUPER_ADMIN only)
    -------------------------------- */
  async inviteAdmin(email: string, inviter: Admin) {
    const existingAdmin = await this.adminRepo.findOne({
      where: { email },
    });

    if (existingAdmin) {
      throw new BadRequestException('Admin already exists');
    }

    const token = randomUUID();

    const invite = this.inviteRepo.create({
      email,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    await this.inviteRepo.save(invite);

    await this.emailService.sendEmail({
      to: email,
      subject: 'You’ve been invited to Ops360',
      html: adminInviteTemplate({
        inviterEmail: inviter.email,
        inviteLink: `${process.env.FRONTEND_URL}/accept-invite?token=${token}&type=invite`,
      }),
    });

    return {
      success: true,
      message: 'Admin invitation sent successfully',
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

    return {
      success: true,
      message:
        'Your admin account has been successfully set up. You can now log in.',
    };
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

  /* --------------------------------
       REQUEST PASSWORD RESET
    -------------------------------- */

  async requestPasswordReset(email: string) {
    const admin = await this.adminRepo.findOne({ where: { email } });

    // 🚫 Do NOT reveal if user exists
    if (!admin) {
      return {
        success: true,
        message: 'If this email exists, a reset link has been sent.',
      };
    }

    const token = randomUUID();

    const reset = this.resetRepo.create({
      email,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
    });

    await this.resetRepo.save(reset);

    await this.emailService.sendEmail({
      to: email,
      subject: 'Reset your Ops360 password',
      html: passwordResetTemplate({
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${token}&type=reset`,
      }),
    });

    return {
      success: true,
      message: 'If this email exists, a reset link has been sent.',
    };
  }

  /* --------------------------------
       RESET PASSWORD
    -------------------------------- */

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.resetRepo.findOne({ where: { token } });

    if (!reset || reset.used) {
      throw new BadRequestException('Invalid or used reset token');
    }

    if (reset.expiresAt < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    const admin = await this.adminRepo.findOne({
      where: { email: reset.email },
    });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminRepo.save(admin);

    reset.used = true;
    await this.resetRepo.save(reset);

    return {
      success: true,
      message: 'Password reset successful. You can now log in.',
    };
  }

  async findAll() {
    const items = await this.adminRepo.find({});

    return {
      success: true,
      items,
    };
  }
}
