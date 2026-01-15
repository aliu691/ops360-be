import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './departments.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  async findAll() {
    return {
      success: true,
      items: await this.deptRepo.find({ order: { name: 'ASC' } }),
    };
  }

  async create(dto: CreateDepartmentDto) {
    const exists = await this.deptRepo.findOne({
      where: { key: dto.key.toUpperCase() },
    });

    if (exists) {
      throw new BadRequestException('Department already exists');
    }

    const department = this.deptRepo.create({
      key: dto.key.toUpperCase(),
      name: dto.name,
    });

    await this.deptRepo.save(department);

    return {
      success: true,
      message: 'Department created successfully',
      item: department,
    };
  }
}
