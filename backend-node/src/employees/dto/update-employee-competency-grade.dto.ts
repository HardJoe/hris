import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Grade } from '../../common/enums/grade.enum';

export class UpdateEmployeeCompetencyGradeDto {
  @ApiProperty({ enum: Grade, example: Grade.A })
  @IsEnum(Grade)
  grade: Grade;
}
