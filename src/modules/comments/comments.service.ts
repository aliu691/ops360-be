import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Comment } from './comments.entity';
import { PipelineDeal } from '../pipeline/pipeline-deal.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { AdminsService } from '../admins/admins.service';
import { commentNotificationTemplate } from '../email/templates/comment.template';

type Actor = {
  type: 'ADMIN' | 'USER';
  id: number;
};

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,

    @InjectRepository(PipelineDeal)
    private pipelineRepo: Repository<PipelineDeal>,

    private emailService: EmailService,
    private usersService: UsersService,
    private adminsService: AdminsService,
  ) {}

  //Helper
  async resolveActor(actor: Actor): Promise<{
    email: string;
    name: string;
  }> {
    if (actor.type === 'USER') {
      const user = await this.usersService.findByIdOrFail(actor.id);

      return {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      };
    }

    if (actor.type === 'ADMIN') {
      const admin = await this.adminsService.findByIdOrFail(actor.id);

      return {
        email: admin.email,
        name: this.formatAdminName(admin.email),
      };
    }

    throw new Error('Unknown actor type');
  }

  formatAdminName(email: string) {
    const name = email.split('@')[0]; // "aliu"
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /* =========================
     CREATE COMMENT
  ========================= */
  async create(opportunityId: number, dto: CreateCommentDto, actor: Actor) {
    const deal = await this.pipelineRepo.findOne({
      where: { id: opportunityId },
      relations: ['salesOwner', 'preSalesOwners'],
    });

    if (!deal) throw new NotFoundException('Deal not found');

    // 🔐 Permission
    if (
      actor.type !== 'ADMIN' &&
      !(
        actor.type === 'USER' &&
        (actor.id === deal.salesOwnerId ||
          deal.preSalesOwners?.some((p) => p.id === actor.id))
      )
    ) {
      throw new ForbiddenException(
        'You are not allowed to comment on this opportunity',
      );
    }

    const comment = this.commentRepo.create({
      pipelineDealId: opportunityId,
      userId: actor.id,
      content: dto.content,
    });

    await this.commentRepo.save(comment);

    await this.notifyStakeholders(deal, comment, actor, false);

    return comment;
  }

  /* =========================
     UPDATE COMMENT
  ========================= */
  async update(commentId: number, dto: UpdateCommentDto, actor: Actor) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: [
        'pipelineDeal',
        'pipelineDeal.salesOwner',
        'pipelineDeal.preSalesOwners',
      ],
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // 🔐 Permission
    if (actor.type !== 'ADMIN' && comment.userId !== actor.id) {
      throw new ForbiddenException();
    }

    if (comment.content.trim() === dto.content.trim()) {
      return comment;
    }

    comment.content = dto.content;
    comment.isEdited = true;

    await this.commentRepo.save(comment);

    await this.notifyStakeholders(comment.pipelineDeal, comment, actor, true);

    return comment;
  }

  /* =========================
     GET COMMENTS
  ========================= */
  async getByOpportunity(opportunityId: number) {
    return this.commentRepo.find({
      where: { pipelineDealId: opportunityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /* =========================
     EMAIL NOTIFICATION
  ========================= */
  async notifyStakeholders(
    deal: PipelineDeal,
    comment: Comment,
    actor: Actor,
    isEdit = false,
  ) {
    const sender = await this.resolveActor(actor);

    /* =========================
     DEFAULT RECEIVER (ALWAYS)
  ========================= */
    const superAdminEmail = process.env.ZEPTO_FROM_EMAIL!;

    /* =========================
     TO LIST
  ========================= */
    const to = [superAdminEmail];

    // add sales owner IF not sender
    if (deal.salesOwner?.email && deal.salesOwner.email !== sender.email) {
      to.push(deal.salesOwner.email);
    }

    /* =========================
     CC LIST (PRE-SALES)
  ========================= */
    const cc = (deal.preSalesOwners ?? [])
      .map((p) => p.email)
      .filter((email) => email && email !== sender.email);

    /* =========================
     DEDUPLICATION
  ========================= */
    const uniqueTo = [...new Set(to)];
    const uniqueCc = [...new Set(cc)];

    /* =========================
     SEND EMAIL
  ========================= */
    await this.emailService.sendEmail({
      to: uniqueTo,
      cc: uniqueCc,
      subject: isEdit
        ? `Comment Updated — ${deal.organizationName}`
        : `New Comment — ${deal.organizationName}`,

      html: commentNotificationTemplate({
        senderName: sender.name,
        senderEmail: sender.email,
        dealName: deal.dealName,
        organizationName: deal.organizationName,
        content: comment.content,
        isEdit,
      }),

      replyTo: sender.email,
    });
  }
}
