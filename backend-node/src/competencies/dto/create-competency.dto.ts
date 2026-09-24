import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCompetencyDto {
  @ApiProperty({ example: 'Spring Boot' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
