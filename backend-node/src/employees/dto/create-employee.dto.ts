import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EmploymentStatus } from '../../common/enums/employment-status.enum';
import { Gender } from '../../common/enums/gender.enum';
import { Position } from '../../common/enums/position.enum';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Ayu Pratama' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: '1995-08-17', format: 'date' })
  @IsDateString({ strict: true })
  dateOfBirth: string;

  @ApiProperty({ example: 'ayu@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: Position })
  @IsEnum(Position)
  position: Position;

  @ApiPropertyOptional({ enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  @IsDateString({ strict: true })
  hiredAt: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  competencyIds?: string[];
}
