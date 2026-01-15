import { Controller, Get, Post, Body } from '@nestjs/common';
import { Public } from 'src/utils/decorator.public';
import { Roles } from 'src/utils/decorator.roles';
import { AdminRole } from '../admins/admins.entity';
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

  @Roles(AdminRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }
}
