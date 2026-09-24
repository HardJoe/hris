import { NotFoundException } from '@nestjs/common';
import { CompetenciesService } from '../src/competencies/competencies.service';

describe('CompetenciesService', () => {
  const builder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };
  const repository = {
    create: jest.fn((input: { name: string }) => ({ ...input })),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => builder),
    findOneBy: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
  const service = new CompetenciesService(repository as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a competency through the repository', async () => {
    repository.save.mockResolvedValue({ id: 'competency-1', name: 'ReactJS' });

    await expect(service.create({ name: 'ReactJS' })).resolves.toEqual({ id: 'competency-1', name: 'ReactJS' });
    expect(repository.create).toHaveBeenCalledWith({ name: 'ReactJS' });
  });

  it('filters and paginates competency results', async () => {
    builder.getManyAndCount.mockResolvedValue([[{ id: '1', name: 'ReactJS' }], 3]);

    await expect(service.findAll({ page: 2, limit: 1, search: 'React' })).resolves.toEqual({
      items: [{ id: '1', name: 'ReactJS' }],
      meta: { page: 2, limit: 1, totalItems: 3, totalPages: 3 },
    });
    expect(builder.andWhere).toHaveBeenCalledWith('competency.name ILIKE :search', { search: '%React%' });
    expect(builder.skip).toHaveBeenCalledWith(1);
  });

  it('rejects a missing competency for read, update, and delete operations', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('missing', { name: 'Node.js' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and removes an existing competency', async () => {
    const competency = { id: 'competency-1', name: 'React' };
    repository.findOneBy.mockResolvedValue(competency);
    repository.save.mockResolvedValue({ ...competency, name: 'ReactJS' });

    await expect(service.update(competency.id, { name: 'ReactJS' })).resolves.toMatchObject({ name: 'ReactJS' });
    await service.remove(competency.id);
    expect(repository.merge).toHaveBeenCalledWith(competency, { name: 'ReactJS' });
    expect(repository.remove).toHaveBeenCalledWith(competency);
  });
});
