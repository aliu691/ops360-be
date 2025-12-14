import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../meetings/meetings.entity';
import { FiltersController } from './filters.controller';
import { FiltersService } from './filters.service';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting])],
  controllers: [FiltersController],
  providers: [FiltersService],
})
export class FiltersModule {}
