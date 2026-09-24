import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PagedResult } from '../common/interfaces/paged-result.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateEmployeeCompetencyGradeDto } from './dto/update-employee-competency-grade.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { EmployeeView } from './interfaces/employee-view.interface';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an employee and optional competency assignments' })
  create(@Body() input: CreateEmployeeDto): Promise<EmployeeView> {
    return this.employeesService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter employees' })
  findAll(@Query() query: EmployeeQueryDto): Promise<PagedResult<EmployeeView>> {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EmployeeView> {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateEmployeeDto,
  ): Promise<EmployeeView> {
    return this.employeesService.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.employeesService.remove(id);
  }

  @Put(':employeeId/competencies/:competencyId')
  @ApiOperation({ summary: 'Assign or update an employee competency proficiency' })
  assignCompetency(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('competencyId', ParseUUIDPipe) competencyId: string,
    @Body() input: UpdateEmployeeCompetencyGradeDto,
  ): Promise<EmployeeView> {
    return this.employeesService.assignCompetency(employeeId, competencyId, input.grade);
  }

  @Delete(':employeeId/competencies/:competencyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a competency and its certificate from an employee' })
  unassignCompetency(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('competencyId', ParseUUIDPipe) competencyId: string,
  ): Promise<void> {
    return this.employeesService.unassignCompetency(employeeId, competencyId);
  }

  @Post(':employeeId/competencies/:competencyId/certificate')
  @UseInterceptors(FileInterceptor('certificate'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['certificate'],
      properties: { certificate: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload or replace an authenticated certificate file' })
  uploadCertificate(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('competencyId', ParseUUIDPipe) competencyId: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
  ): Promise<EmployeeView> {
    return this.employeesService.uploadCertificate(employeeId, competencyId, file);
  }

  @Get(':employeeId/competencies/:competencyId/certificate')
  @ApiOperation({ summary: 'Download a certificate through an authenticated endpoint' })
  async downloadCertificate(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('competencyId', ParseUUIDPipe) competencyId: string,
  ): Promise<StreamableFile> {
    const certificate = await this.employeesService.downloadCertificate(employeeId, competencyId);
    const encodedName = encodeURIComponent(certificate.originalName).replaceAll("'", '%27');
    return new StreamableFile(certificate.stream, {
      type: certificate.mimeType,
      length: certificate.size,
      disposition: `attachment; filename*=UTF-8''${encodedName}`,
    });
  }
}
