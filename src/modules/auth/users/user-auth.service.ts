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
import { UserPasswordReset } from './user-password-reset.entity';
import { userInvitationTemplate } from 'src/modules/email/templates/user-invitation.template';
import { AuthIdentity } from '../auth.entity';
import { AuthPasswordReset } from '../auth_password_resets';
import { UsersService } from 'src/modules/users/users.service';
import { AdminsService } from 'src/modules/admins/admins.service';

@Injectable()
export class UserAuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => AdminsService))
    private readonly adminsService: AdminsService,

    @InjectRepository(UserPasswordReset)
    private readonly resetRepo: Repository<UserPasswordReset>,

    @InjectRepository(AuthPasswordReset)
    private readonly newResetRepo: Repository<AuthPasswordReset>,

    @InjectRepository(AuthIdentity)
    private readonly identityRepo: Repository<AuthIdentity>,

    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /* =========================
     LOGIN
  ========================= */

  async login(email: string, password: string) {
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

    const admin = await this.adminsService.findByAuthIdentityId(identity.id);

    if (admin) {
      return {
        accessToken: this.jwtService.sign({
          sub: identity.id,
          type: 'ADMIN',
          role: admin.role,
          email: identity.email,
        }),
        actor: {
          type: 'ADMIN',
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      };
    }

    const user = await this.usersService.findByAuthIdentityId(identity.id);

    if (!user) {
      throw new UnauthorizedException('Account not linked');
    }

    return {
      accessToken: this.jwtService.sign({
        sub: identity.id,
        type: 'USER',
        department: user.department,
        email: identity.email,
        firstName: user.firstName,
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
    intent: 'INVITE' | 'RESET' = 'RESET',
  ) {
    let identity = await this.identityRepo.findOne({ where: { email } });

    if (!identity && intent === 'RESET') {
      console.log('[RESET] No identity found:', email);
      return {
        success: true,
        message: 'If this email exists, a reset link has been sent.',
      };
    }

    if (!identity && intent === 'INVITE') {
      identity = this.identityRepo.create({
        email,
        passwordHash: null,
        status: 'ACTIVE',
      });

      await this.identityRepo.save(identity);
      console.log('[INVITE] Created auth identity:', identity.id);
    }

    if (!identity) {
      throw new Error('AuthIdentity missing after resolution');
    }

    const token = randomUUID();

    const reset = this.newResetRepo.create({
      authIdentity: identity,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      used: false,
    });

    await this.newResetRepo.save(reset);

    const link = `${process.env.FRONTEND_URL}/set-password?token=${token}&type=${intent}`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject:
          intent === 'INVITE'
            ? 'You’ve been invited to Ops360'
            : 'Reset your Ops360 password',
        html:
          intent === 'INVITE'
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

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.newResetRepo.findOne({
      where: { token },
      relations: ['authIdentity'],
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hash = await bcrypt.hash(newPassword, 10);

    reset.authIdentity.passwordHash = hash;
    await this.identityRepo.save(reset.authIdentity);

    reset.used = true;
    await this.newResetRepo.save(reset);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }
}
