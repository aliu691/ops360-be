// auth/user-auth.service.ts
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/modules/email/email.service';
import { passwordResetTemplate } from 'src/modules/email/templates/password-reset.template';
import { randomUUID } from 'crypto';
import { userInvitationTemplate } from 'src/modules/email/templates/user-invitation.template';
import { UsersService } from 'src/modules/users/users.service';
import { AdminsService } from 'src/modules/admins/admins.service';
import {
  Admin,
  AdminRole,
  AdminStatus,
} from 'src/modules/admins/admins.entity';
import { AuthPasswordReset } from './auth_password_resets';
import { AuthIdentity } from './auth.entity';
import { AuditAction } from '../audit-logs/audit-actions';
import { AuditService } from '../audit-logs/audit.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => AdminsService))
    private readonly adminsService: AdminsService,

    @InjectRepository(AuthPasswordReset)
    private readonly resetRepo: Repository<AuthPasswordReset>,

    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,

    @InjectRepository(AuthIdentity)
    private readonly identityRepo: Repository<AuthIdentity>,

    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  /* =========================
     LOGIN
  ========================= */

  async login(email: string, password: string, req?: any) {
    const identity = await this.identityRepo.findOne({
      where: { email, status: 'ACTIVE' },
    });

    if (!identity || !identity.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, identity.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 🔐 ADMIN
    const admin = await this.adminsService.findByAuthIdentityId(identity.id);
    if (admin) {
      await this.auditService.log({
        req,
        actorType: 'ADMIN',
        actorId: admin.id,
        action: AuditAction.LOGIN,
        entity: 'AUTH',
        metadata: {
          email: admin.email,
          role: admin.role,
        },
      });

      return {
        accessToken: this.jwtService.sign({
          sub: admin.id, // ✅ admins.id
          type: 'ADMIN',
          role: admin.role,
        }),
        actor: {
          type: 'ADMIN',
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      };
    }

    // 👤 USER
    const user = await this.usersService.findByAuthIdentityId(identity.id);
    if (!user) {
      throw new UnauthorizedException('Account not linked');
    }

    await this.auditService.log({
      req,
      actorType: 'USER',
      actorId: user.id,
      action: AuditAction.LOGIN,
      entity: 'AUTH',
      metadata: {
        email: user.email,
        department: user.department,
      },
    });

    return {
      accessToken: this.jwtService.sign({
        sub: user.id, // ✅ users.id (THIS IS THE FIX)
        type: 'USER',
      }),
      actor: {
        type: 'USER',
        id: user.id,
        email: user.email,
        department: user.department,
        repName: user.firstName,
      },
    };
  }

  /* =========================
     REQUEST PASSWORD RESET / SETUP
  ========================= */

  async requestPasswordReset(
    email: string,
    intent: 'RESET' | 'USER_INVITE' = 'RESET',
  ) {
    let identity = await this.identityRepo.findOne({ where: { email } });

    if (!identity && intent === 'RESET') {
      return { success: true };
    }

    if (!identity && intent === 'USER_INVITE') {
      identity = this.identityRepo.create({
        email,
        passwordHash: null,
        status: 'ACTIVE',
      });
      await this.identityRepo.save(identity);
    }

    const token = randomUUID();

    if (!identity) {
      throw new Error('AuthIdentity must exist before creating reset token');
    }

    await this.resetRepo.save(
      this.resetRepo.create({
        authIdentity: { id: identity.id }, // ✅ correct
        token,
        intent: 'USER_INVITE',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        used: false,
      }),
    );

    const link = `${process.env.FRONTEND_URL}/set-password?token=${token}`;

    try {
      await this.emailService.sendEmail({
        to: [email],
        subject:
          intent === 'USER_INVITE'
            ? 'You’ve been invited to Ops360'
            : 'Reset your Ops360 password',
        html:
          intent === 'USER_INVITE'
            ? userInvitationTemplate({ inviteLink: link })
            : passwordResetTemplate({ resetLink: link }),
      });
    } catch (err) {}

    return {
      success: true,
      message: 'If this email exists, a reset link has been sent.',
    };
  }

  /* =========================
     RESET PASSWORD
  ========================= */

  async setPassword(token: string, newPassword: string) {
    const reset = await this.resetRepo.findOne({
      where: { token },
      relations: ['authIdentity'],
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired link');
    }

    // 1️⃣ Set password
    reset.authIdentity.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.identityRepo.save(reset.authIdentity);

    // 2️⃣ Finalize account based on intent
    if (reset.intent === 'ADMIN_INVITE') {
      const existingAdmin = await this.adminRepo.findOne({
        where: { authIdentity: { id: reset.authIdentity.id } },
      });

      if (!existingAdmin) {
        await this.adminRepo.save(
          this.adminRepo.create({
            email: reset.authIdentity.email,
            authIdentity: reset.authIdentity,
            role: AdminRole.ADMIN,
            status: AdminStatus.ACTIVE,
          }),
        );
      }
    }

    // USER_INVITE needs nothing extra
    // RESET needs nothing extra

    // 3️⃣ Mark token used
    reset.used = true;
    await this.resetRepo.save(reset);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }
}
