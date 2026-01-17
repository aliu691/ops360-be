import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineDeal } from './pipeline-deal.entity';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { DealStagesModule } from '../deal-stages/deal-stages.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineDeal]),
    DealStagesModule,
    UsersModule,
  ],
  providers: [PipelineService],
  controllers: [PipelineController],
  exports: [PipelineService],
})
export class PipelineModule {}
