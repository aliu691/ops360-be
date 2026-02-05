import { Controller, Get, Post, Body } from '@nestjs/common';

import { AdminRole } from '../admins/admins.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }
}
