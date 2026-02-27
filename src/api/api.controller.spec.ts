import { Test, TestingModule } from '@nestjs/testing';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { PlaceResult } from './types/place-boundary.type';

describe('ApiController', () => {
  let controller: ApiController;
  let apiService: jest.Mocked<ApiService>;

  const mockPlaceResults: PlaceResult[] = [
    {
      osm_type: 'relation',
      osm_id: 7444,
      osm_uid: 'R7444',
      name: 'Paris',
      name_en: 'Paris',
      admin_level: '4',
      boundary: 'administrative',
      parent_ids: ['R119714'],
      raw_tags: { population: '2148271' },
      source: 'overpass',
    },
  ];

  const mockApiService = {
    get_place_list: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiController],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService,
        },
      ],
    }).compile();

    controller = module.get<ApiController>(ApiController);
    apiService = module.get(ApiService) as jest.Mocked<ApiService>;
  });

  describe('search', () => {
    it('should call api_service.get_place_list with correct params and return PlaceResult[]', async () => {
      const dto = { name: 'Paris', timeout: 30 };
      apiService.get_place_list.mockResolvedValue(mockPlaceResults);

      const result = await controller.search(dto);

      expect(apiService.get_place_list).toHaveBeenCalledWith('Paris', 30);

      // Verify the structure matches our typed mock
      expect(result).toEqual(mockPlaceResults);
      expect(result[0].osm_uid).toBe('R7444');
      expect(result[0].source).toBe('overpass');
    });

    it('should handle search with only the required name param', async () => {
      const dto = { name: 'Lyon' };
      apiService.get_place_list.mockResolvedValue([]);

      await controller.search(dto as any);

      expect(apiService.get_place_list).toHaveBeenCalledWith('Lyon', undefined);
    });
  });
});
