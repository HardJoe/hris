import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';
import { Competency } from '../competencies/entities/competency.entity';
import { CertificateStorageService } from './certificate-storage.service';
import { EmployeeCompetency } from './entities/employee-competency.entity';
import { Employee } from './entities/employee.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeCompetency, Competency]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: memoryStorage(),
        limits: { files: 1, fileSize: config.getOrThrow<number>('MAX_UPLOAD_BYTES') },
      }),
    }),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, CertificateStorageService],
})
export class EmployeesModule {}
