import { Test, TestingModule } from '@nestjs/testing';
import { NominatimController } from './nominatim.controller';
import { NominatimService } from './nominatim.service';

describe('NominatimController', () => {
  let controller: NominatimController;

  const mockNominatimService = {
    search: jest.fn(),
    reverse: jest.fn(),
    getAdminLevels: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NominatimController],
      providers: [
        {
          provide: NominatimService,
          useValue: mockNominatimService,
        },
      ],
    }).compile();

    controller = module.get<NominatimController>(NominatimController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call search service', async () => {
    mockNominatimService.search.mockResolvedValue(['result']);

    const result = await controller.search({ q: 'test' });

    expect(result).toEqual(['result']);
    expect(mockNominatimService.search).toHaveBeenCalledWith('test');
  });

  it('should call reverse service', async () => {
    mockNominatimService.reverse.mockResolvedValue({});

    await controller.reverse({ lat: '1', lon: '2' });

    expect(mockNominatimService.reverse).toHaveBeenCalledWith('1', '2');
  });

  it('should call admin levels service', async () => {
    mockNominatimService.getAdminLevels.mockResolvedValue([]);

    await controller.adminLevels({ country: 'in' });

    expect(mockNominatimService.getAdminLevels).toHaveBeenCalledWith('in');
  });
});
