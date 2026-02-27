import { Test, TestingModule } from '@nestjs/testing';
import { OsmBoundariesController } from './osm-boundaries.controller';
import { OsmBoundariesService } from './osm-boundaries.service';
import { HttpException } from '@nestjs/common';

describe('OsmBoundariesController', () => {
  let controller: OsmBoundariesController;
  let service: OsmBoundariesService;

  const mockOsmBoundariesService = {
    searchByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OsmBoundariesController],
      providers: [
        {
          provide: OsmBoundariesService,
          useValue: mockOsmBoundariesService,
        },
      ],
    }).compile();

    controller = module.get<OsmBoundariesController>(OsmBoundariesController);
    service = module.get<OsmBoundariesService>(OsmBoundariesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    const mockQuery = { name: 'Paris' };
    const mockResult = [{ id: 1, name: 'Paris Boundary' }];

    it('should call service.searchByName with correct name', async () => {
      mockOsmBoundariesService.searchByName.mockResolvedValue(mockResult);

      const result = await controller.search(mockQuery as any);

      expect(service.searchByName).toHaveBeenCalledWith('Paris');
      expect(result).toEqual(mockResult);
    });

    it('should return empty array if service returns empty array', async () => {
      mockOsmBoundariesService.searchByName.mockResolvedValue([]);

      const result = await controller.search(mockQuery as any);

      expect(result).toEqual([]);
    });

    it('should propagate HttpException from service', async () => {
      mockOsmBoundariesService.searchByName.mockRejectedValue(
        new HttpException('Failed', 500),
      );

      await expect(controller.search(mockQuery as any)).rejects.toThrow(
        HttpException,
      );

      expect(service.searchByName).toHaveBeenCalledWith('Paris');
    });
  });
});
