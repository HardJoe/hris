import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PagedResult } from '../common/interfaces/paged-result.interface';
import { CompetencyQueryDto } from './dto/competency-query.dto';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { Competency } from './entities/competency.entity';

@Injectable()
export class CompetenciesService {
  constructor(
    @InjectRepository(Competency)
    private readonly competenciesRepository: Repository<Competency>,
  ) {}

  async create(input: CreateCompetencyDto): Promise<Competency> {
    return this.competenciesRepository.save(this.competenciesRepository.create(input));
  }

  async findAll(query: CompetencyQueryDto): Promise<PagedResult<Competency>> {
    const builder = this.competenciesRepository.createQueryBuilder('competency');

    if (query.search) {
      builder.andWhere('competency.name ILIKE :search', { search: `%${query.search}%` });
    }

    const [items, totalItems] = await builder
      .orderBy('competency.name', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<Competency> {
    const competency = await this.competenciesRepository.findOneBy({ id });
    if (!competency) {
      throw new NotFoundException('Competency not found');
    }
    return competency;
  }

  async update(id: string, input: UpdateCompetencyDto): Promise<Competency> {
    const competency = await this.findOne(id);
    this.competenciesRepository.merge(competency, input);
    return this.competenciesRepository.save(competency);
  }

  async remove(id: string): Promise<void> {
    const competency = await this.findOne(id);
    await this.competenciesRepository.remove(competency);
  }
}
