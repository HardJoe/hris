import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competency } from '../competencies/entities/competency.entity';
import { Employee } from '../employees/entities/employee.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Competency])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
