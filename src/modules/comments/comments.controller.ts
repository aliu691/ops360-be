import { Controller, Post, Get, Patch, Param, Body, Req } from '@nestjs/common';

import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Post('pipeline/:id/comments')
  create(@Param('id') id: number, @Body() dto: CreateCommentDto, @Req() req) {
    return this.service.create(Number(id), dto, req.user);
  }

  @Get('pipeline/:id/comments')
  get(@Param('id') id: number) {
    return this.service.getByOpportunity(Number(id));
  }

  @Patch('comments/:id')
  update(@Param('id') id: number, @Body() dto: UpdateCommentDto, @Req() req) {
    return this.service.update(Number(id), dto, req.user);
  }
}
