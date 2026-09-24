import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Grade } from '../../common/enums/grade.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CompetencyQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(Grade)
  grade?: Grade;
}
