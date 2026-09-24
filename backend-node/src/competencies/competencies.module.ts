import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetenciesController } from './competencies.controller';
import { CompetenciesService } from './competencies.service';
import { Competency } from './entities/competency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Competency])],
  controllers: [CompetenciesController],
  providers: [CompetenciesService],
  exports: [CompetenciesService],
})
export class CompetenciesModule {}
