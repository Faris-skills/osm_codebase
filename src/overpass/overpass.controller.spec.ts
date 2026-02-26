import { Test, TestingModule } from '@nestjs/testing';
import { OverpassController } from './overpass.controller';
import { OverpassService } from './overpass.service';
import { OverpassResponse } from './types/response-types.types';

describe('OverpassController', () => {
  let controller: OverpassController;
  let service: OverpassService;

  const mockResponse: OverpassResponse = {
    elements: [],
    version: 0.6,
    generator: 'mock',
    osm3s: { timestamp_osm_base: '', copyright: '' },
  };

  const mockService = {
    findNodesByTagsInBBox: jest.fn().mockResolvedValue(mockResponse),
    findNodesByTagsInArea: jest.fn().mockResolvedValue(mockResponse),
    postcodesByCity: jest.fn().mockResolvedValue(mockResponse),
    custom: jest.fn().mockResolvedValue(mockResponse),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OverpassController],
      providers: [
        {
          provide: OverpassService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<OverpassController>(OverpassController);
    service = module.get<OverpassService>(OverpassService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('bbox', () => {
    it('should call service.findNodesByTagsInBBox with correct params', async () => {
      const dto = {
        tags: { amenity: 'cafe' },
        bbox: [1, 2, 3, 4],
        timeout: 100,
      };
      const result = await controller.bbox(dto as any);
      expect(service.findNodesByTagsInBBox).toHaveBeenCalledWith(
        dto.tags,
        dto.bbox,
        dto.timeout,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('area', () => {
    it('should call service.findNodesByTagsInArea with correct params', async () => {
      const dto = {
        tags: { name: 'Paris' },
        areaName: 'Paris',
        adminLevel: 8,
        timeout: 200,
      };
      const result = await controller.area(dto as any);
      expect(service.findNodesByTagsInArea).toHaveBeenCalledWith(
        dto.tags,
        dto.areaName,
        {
          adminLevel: dto.adminLevel,
          timeout: dto.timeout,
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('postcodes', () => {
    it('should call service.postcodesByCity with correct params', async () => {
      const dto = { name: 'Paris', adminLevel: 8, timeout: 200 };
      const result = await controller.postcodes(dto as any);
      expect(service.postcodesByCity).toHaveBeenCalledWith(dto.name, {
        adminLevel: dto.adminLevel,
        timeout: dto.timeout,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('get-count', () => {
    it('should call service.countNumberOfPoints with correct params', async () => {
      const dto = {
        tags: { amenity: 'pharmacy' },
        areaName: 'Paris',
        adminLevel: 8,
        timeout: 200,
      };
      const result = await controller.area(dto as any);
      expect(service.findNodesByTagsInArea).toHaveBeenCalledWith(
        dto.tags,
        dto.areaName,
        {
          adminLevel: dto.adminLevel,
          timeout: dto.timeout,
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('custom', () => {
    it('should call service.custom with correct query', async () => {
      const dto = { query: '[out:json];node(1);out;' };
      const result = await controller.custom(dto as any);
      expect(service.custom).toHaveBeenCalledWith(dto.query);
      expect(result).toEqual(mockResponse);
    });
  });
});
