import { Test, TestingModule } from '@nestjs/testing';
import { OverpassService } from './overpass.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    appendFile: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OverpassService', () => {
  let service: OverpassService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://mock-overpass'),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverpassService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<OverpassService>(OverpassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================
  // CONSTRUCTOR FAILURE
  // ============================

  it('should throw if OVERPASS_URL missing', () => {
    mockConfigService.get.mockReturnValueOnce(undefined);

    expect(() => {
      new OverpassService(mockConfigService as any, mockCacheManager as any);
    }).toThrow('Undefined env: OVERPASS_URL');
  });

  // ============================
  // SUCCESS CASE
  // ============================

  it('should return data from axios and cache it', async () => {
    mockCacheManager.get.mockResolvedValue(null);

    mockedAxios.post.mockResolvedValueOnce({
      data: { elements: [] },
    });

    const result = await service.custom('[out:json];node;out;');

    expect(result).toEqual({ elements: [] });
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockCacheManager.set).not.toHaveBeenCalled(); // custom() has no cacheKey
  });

  // ============================
  // CACHE HIT
  // ============================

  it('should return cached value when present', async () => {
    mockCacheManager.get.mockResolvedValueOnce({ cached: true });

    const result = await service.findNodesByTagsInBBox(
      { amenity: 'school' },
      [1, 2, 3, 4],
    );

    expect(result).toEqual({ cached: true });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  // ============================
  // OVERPASS RUNTIME ERROR (remark)
  // ============================

  it('should throw BadRequestException when Overpass returns remark', async () => {
    mockCacheManager.get.mockResolvedValue(null);

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        remark: 'runtime error: out of memory',
      },
    });

    await expect(service.custom('[out:json];node;out;')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  // ============================
  // HTTP ERROR
  // ============================

  it('should throw InternalServerErrorException on HTTP error', async () => {
    mockCacheManager.get.mockResolvedValue(null);

    mockedAxios.post.mockRejectedValueOnce({
      response: {
        statusText: 'Bad Gateway',
      },
    });

    await expect(service.custom('[out:json];node;out;')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  // ============================
  // NETWORK ERROR
  // ============================

  it('should throw InternalServerErrorException on network error', async () => {
    mockCacheManager.get.mockResolvedValue(null);

    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));

    await expect(service.custom('[out:json];node;out;')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  // ============================
  // findNodesByTagsInArea
  // ============================

  describe('findNodesByTagsInArea', () => {
    it('should generate a specific query when only name tag is provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { elements: [] } });

      await service.findNodesByTagsInArea({ name: 'Paris' }, 'France');

      const calledQuery = mockedAxios.post.mock.calls[0][1];
      // Verify it uses the regex "~" and "i" flag for name/brand search logic
      expect(calledQuery).toContain('node["name"~"Paris", i](area.a)');
      expect(calledQuery).toContain('area["name"="France"]');
    });

    it('should use provided adminLevel in the area query', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { elements: [] } });

      await service.findNodesByTagsInArea({ amenity: 'cafe' }, 'Berlin', {
        adminLevel: 8,
      });

      const calledQuery = mockedAxios.post.mock.calls[0][1];
      expect(calledQuery).toContain('["admin_level"="8"]');
      expect(calledQuery).not.toContain('["admin_level"="6"]'); // Should not contain defaults
    });

    it('should cache the result with a specific area key', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { elements: ['some-data'] },
      });

      await service.findNodesByTagsInArea({ shop: 'bakery' }, 'London');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('area:London:shop:bakery'),
        { elements: ['some-data'] },
        3600,
      );
    });
  });

  // ============================
  // postcodesByCity
  // ============================

  describe('postcodesByCity', () => {
    it('should request addr:postcode for a given city', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { elements: [] } });

      await service.postcodesByCity('Lyon');

      const calledQuery = mockedAxios.post.mock.calls[0][1];
      expect(calledQuery).toContain('nwr(area.a)["addr:postcode"]');
      expect(calledQuery).toContain('out center tags');
    });
  });

  // ============================
  // countNumberOfPoints
  // ============================

  describe('countNumberOfPoints', () => {
    it('should generate a query ending with out count', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { count: 10 } });

      const result = await service.countNumberOfPoints(
        { amenity: 'pharmacy' },
        'Dublin',
      );

      const calledQuery = mockedAxios.post.mock.calls[0][1];
      expect(calledQuery).toContain('out count;');
      expect(result).toEqual({ count: 10 });
    });
  });

  // ============================
  // Runtime Error Mapping (Hint logic)
  // ============================

  describe('RunQuery Error Mapping', () => {
    it('should provide a memory-specific hint when Overpass fails with out of memory', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { remark: 'runtime error: out of memory' },
      });

      try {
        await service.custom('query');
      } catch (e: any) {
        expect(e.response.hint).toContain('exceeded Overpass memory limits');
      }
    });

    it('should provide a timeout-specific hint when Overpass times out', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { remark: 'runtime error: query timeout' },
      });

      try {
        await service.custom('query');
      } catch (e: any) {
        expect(e.response.hint).toContain('Query timed out');
      }
    });
  });
});
