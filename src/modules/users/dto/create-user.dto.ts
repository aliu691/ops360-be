import { IsEmail, IsInt, IsString, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  department: string;

  @IsInt()
  @Min(0)
  yearlyTarget: number;
}
