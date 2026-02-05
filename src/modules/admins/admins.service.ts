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
import { AuthIdentity } from '../auth/auth.entity';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,

    @InjectRepository(AuthIdentity)
    private readonly identityRepo: Repository<AuthIdentity>,

    @InjectRepository(AdminInvite)
    private readonly inviteRepo: Repository<AdminInvite>,

    private readonly emailService: EmailService,
  ) {}

  async save(admin: Admin) {
    return this.adminRepo.save(admin);
  }
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

    const inviteLink = `${process.env.FRONTEND_URL}/set-password?token=${token}&actor=admin&type=invite`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'You’ve been invited to Ops360',
      html: adminInviteTemplate({
        inviterEmail: inviter.email,
        inviteLink,
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

    // 1️⃣ Create or fetch identity
    let identity = await this.identityRepo.findOne({
      where: { email: invite.email },
    });

    if (!identity) {
      identity = this.identityRepo.create({
        email: invite.email,
        status: 'ACTIVE',
      });
    }

    identity.passwordHash = await bcrypt.hash(password, 10);
    await this.identityRepo.save(identity);

    // 2️⃣ Create admin linked to identity
    const admin = this.adminRepo.create({
      email: invite.email,
      authIdentity: identity,
      role: AdminRole.ADMIN,
      status: AdminStatus.ACTIVE,
    });

    await this.adminRepo.save(admin);

    // 3️⃣ Mark invite as used
    invite.used = true;
    await this.inviteRepo.save(invite);

    return {
      success: true,
      message:
        'Your admin account has been successfully set up. You can now log in.',
    };
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

  async findAll() {
    const items = await this.adminRepo.find({});

    return {
      success: true,
      items,
    };
  }

  async findByAuthIdentityId(authIdentityId: number) {
    return this.adminRepo.findOne({
      where: {
        authIdentity: { id: authIdentityId },
        status: AdminStatus.ACTIVE,
      },
      relations: ['authIdentity'],
    });
  }
}
