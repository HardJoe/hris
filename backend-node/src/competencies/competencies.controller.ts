import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PagedResult } from '../common/interfaces/paged-result.interface';
import { CompetenciesService } from './competencies.service';
import { CompetencyQueryDto } from './dto/competency-query.dto';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { Competency } from './entities/competency.entity';

@ApiTags('Competencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('competencies')
export class CompetenciesController {
  constructor(private readonly competenciesService: CompetenciesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a competency' })
  create(@Body() input: CreateCompetencyDto): Promise<Competency> {
    return this.competenciesService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter competencies' })
  findAll(@Query() query: CompetencyQueryDto): Promise<PagedResult<Competency>> {
    return this.competenciesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Competency> {
    return this.competenciesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCompetencyDto,
  ): Promise<Competency> {
    return this.competenciesService.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.competenciesService.remove(id);
  }
}
