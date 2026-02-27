import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OsmBoundariesService } from './osm-boundaries.service';
import type { Cache } from 'cache-manager';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OsmBoundariesService', () => {
  let service: OsmBoundariesService;
  let cacheManager: Cache;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://fake-api.com'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OsmBoundariesService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OsmBoundariesService>(OsmBoundariesService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  describe('searchByName', () => {
    const name = 'Paris';
    const cacheKey = 'osm-boundaries:paris';

    it('should return cached data if available', async () => {
      const cachedData = [{ id: 1 }];
      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.searchByName(name);

      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should call API and cache result if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const apiResponse = {
        status: 200,
        data: [{ id: 123 }],
      };

      mockedAxios.get.mockResolvedValue(apiResponse as any);

      const result = await service.searchByName(name);

      expect(mockedAxios.get).toHaveBeenCalledWith('http://fake-api.com', {
        params: { filterNameEn: name },
      });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        apiResponse.data,
        24 * 60 * 60 * 1000,
      );

      expect(result).toEqual(apiResponse.data);
    });

    it('should cache empty array results', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: [],
      } as any);

      const result = await service.searchByName(name);

      expect(result).toEqual([]);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should throw HttpException on API error', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      mockedAxios.get.mockRejectedValue({
        message: 'API failed',
        response: { status: 500 },
      });

      await expect(service.searchByName(name)).rejects.toBeInstanceOf(
        HttpException,
      );

      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });
});
