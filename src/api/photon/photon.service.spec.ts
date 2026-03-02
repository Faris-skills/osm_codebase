import { Test, TestingModule } from '@nestjs/testing';
import { PhotonService } from './photon.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LoggerService } from 'src/shared/logger/logger.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PhotonService', () => {
  let service: PhotonService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://mock-photon-url.com'),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockFeatures = [
    {
      properties: {
        name: 'Berlin',
        country: 'Germany',
        osm_id: 123,
      },
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotonService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<PhotonService>(PhotonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================
  // CONSTRUCTOR FAILURE
  // ============================

  it('should throw if PHOTON_URL is missing', () => {
    mockConfigService.get.mockReturnValueOnce(undefined);

    expect(() => {
      new PhotonService(
        mockConfigService as any,
        mockLoggerService as any,
        mockCacheManager as any,
      );
    }).toThrow('Undefined env: PHOTON_URL');
  });

  // ============================
  // CACHE HIT
  // ============================

  it('should return cached data and log cache-hit', async () => {
    mockCacheManager.get.mockResolvedValueOnce(mockFeatures);

    const result = await service.search('Berlin');

    expect(result).toEqual(mockFeatures);
    expect(mockCacheManager.get).toHaveBeenCalledWith('photon:search:berlin:5');
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(mockLoggerService.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cache-hit' }),
    );
  });

  // ============================
  // SUCCESS (CACHE MISS)
  // ============================

  it('should fetch from API, cache the result, and log success', async () => {
    mockCacheManager.get.mockResolvedValueOnce(null);
    mockedAxios.get.mockResolvedValueOnce({
      data: { features: mockFeatures },
    });

    const result = await service.search('  New York  ', 10);

    // Verify key normalization (lowercase and trimmed)
    expect(mockCacheManager.get).toHaveBeenCalledWith(
      'photon:search:new york:10',
    );

    expect(mockedAxios.get).toHaveBeenCalledWith('http://mock-photon-url.com', {
      params: { q: '  New York  ', limit: 10 },
    });

    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'photon:search:new york:10',
      mockFeatures,
      3600,
    );

    expect(result).toEqual(mockFeatures);
    expect(mockLoggerService.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
    );
  });

  // ============================
  // ERROR HANDLING
  // ============================

  it('should throw HttpException and log error when axios fails', async () => {
    mockCacheManager.get.mockResolvedValueOnce(null);
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

    await expect(service.search('Paris')).rejects.toThrow(HttpException);

    expect(mockLoggerService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error: 'Network Error',
      }),
    );

    try {
      await service.search('Paris');
    } catch (error: any) {
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.message).toBe('Photon search failed');
    }
  });

  it('should handle empty response features from API', async () => {
    mockCacheManager.get.mockResolvedValueOnce(null);
    mockedAxios.get.mockResolvedValueOnce({ data: {} });

    const result = await service.search('Unknown Place');

    expect(result).toEqual([]);
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      expect.any(String),
      [],
      3600,
    );
  });
});
