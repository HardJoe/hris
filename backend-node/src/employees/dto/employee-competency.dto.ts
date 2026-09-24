import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { Grade } from '../../common/enums/grade.enum';

export class EmployeeCompetencyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  competencyId: string;

  @ApiProperty({ enum: Grade, example: Grade.A })
  @IsEnum(Grade)
  grade: Grade;
}
