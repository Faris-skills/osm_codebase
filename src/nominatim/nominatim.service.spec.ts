import { Test, TestingModule } from '@nestjs/testing';
import { NominatimService } from './nominatim.service';
import { ConfigService } from '@nestjs/config';
import { AdminLevelMapService } from './admin-level-map.service/admin-level-map.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Placex } from './entities/placex.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NominatimService', () => {
  let service: NominatimService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8080'),
  };

  const mockAdminLevelMapService = {
    getLevelName: jest.fn(),
  };

  const mockPlacexRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NominatimService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: AdminLevelMapService,
          useValue: mockAdminLevelMapService,
        },
        {
          provide: getRepositoryToken(Placex),
          useValue: mockPlacexRepo,
        },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<NominatimService>(NominatimService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================
  // SEARCH
  // =========================

  it('should return search results', async () => {
    mockCache.get.mockResolvedValue(null);

    mockedAxios.get.mockResolvedValue({
      data: [{ display_name: 'Test Place' }],
    });

    const result = await service.search('Test Place');

    expect(result).toEqual([{ display_name: 'Test Place' }]);
    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should throw on search error', async () => {
    mockCache.get.mockResolvedValue(null);

    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    await expect(service.search('fail')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  // =========================
  // REVERSE
  // =========================

  it('should return reverse results', async () => {
    mockCache.get.mockResolvedValue(null);

    mockedAxios.get.mockResolvedValue({
      data: { display_name: 'Reverse Place' },
    });

    const result = await service.reverse('12.97', '77.59');

    expect(result).toEqual({ display_name: 'Reverse Place' });
    expect(mockedAxios.get).toHaveBeenCalled();
  });

  // =========================
  // ADMIN LEVELS SUCCESS
  // =========================

  it('should return admin levels', async () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ admin_level: 4 }, { admin_level: 6 }]),
    };

    mockPlacexRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    mockAdminLevelMapService.getLevelName
      .mockReturnValueOnce('State')
      .mockReturnValueOnce('District');

    const result = await service.getAdminLevels('in');

    expect(result).toEqual([
      { level: 4, name: 'State' },
      { level: 6, name: 'District' },
    ]);
  });

  // =========================
  // ADMIN LEVELS ERROR
  // =========================

  it('should handle admin level query error', async () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockRejectedValue(new Error('DB failure')),
    };

    mockPlacexRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    await expect(service.getAdminLevels('in')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
