import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealStage } from './deal-stage.entity';
import { DealStagesService } from './deal-stages.service';
import { DealStagesController } from './deal-stages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DealStage])],
  providers: [DealStagesService],
  controllers: [DealStagesController],
  exports: [DealStagesService], // used by pipeline + upload
})
export class DealStagesModule {}
