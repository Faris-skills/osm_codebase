import { Test, TestingModule } from '@nestjs/testing';
import { ApiService } from './api.service';
import { OverpassService } from 'src/overpass/overpass.service';
import { OsmBoundariesService } from 'src/osm-boundaries/osm-boundaries.service';
import * as fs from 'fs';
import * as normalizeHelper from 'src/shared/normalize.helper';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('ApiService', () => {
  let service: ApiService;
  let overpassService: jest.Mocked<OverpassService>;
  let osmBoundariesService: jest.Mocked<OsmBoundariesService>;

  const mockOverpassService = {
    findPlaceDetails: jest.fn(),
  };

  const mockOsmBoundariesService = {
    searchByName: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiService,
        { provide: OverpassService, useValue: mockOverpassService },
        { provide: OsmBoundariesService, useValue: mockOsmBoundariesService },
      ],
    }).compile();

    service = module.get<ApiService>(ApiService);
    overpassService = module.get(OverpassService);
    osmBoundariesService = module.get(OsmBoundariesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get_place_list', () => {
    const cityName = 'Paris';
    const mockNormalizedResult = [{ id: 1, name: 'Paris' }];

    it('should return results from Overpass if available', async () => {
      // Setup: Overpass returns data
      overpassService.findPlaceDetails.mockResolvedValue({
        elements: [{ id: 1 }],
      } as any);

      const spyNormalize = jest
        .spyOn(normalizeHelper, 'normalizeOverpassResponse')
        .mockReturnValue(mockNormalizedResult as any);

      const result = await service.get_place_list(cityName);

      expect(result).toEqual(mockNormalizedResult);
      expect(overpassService.findPlaceDetails).toHaveBeenCalledWith(
        cityName,
        undefined,
      );
      // Ensure fallback was NOT called
      expect(osmBoundariesService.searchByName).not.toHaveBeenCalled();
      // Verify logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Result Source: overpass'),
      );

      spyNormalize.mockRestore();
    });

    it('should fallback to OSM Boundaries if Overpass returns empty results', async () => {
      // Setup: Overpass returns empty
      overpassService.findPlaceDetails.mockResolvedValue({
        elements: [],
      } as any);
      jest
        .spyOn(normalizeHelper, 'normalizeOverpassResponse')
        .mockReturnValue([]);

      // Setup: OSM Boundaries returns data
      osmBoundariesService.searchByName.mockResolvedValue([
        { osm_id: 123 },
      ] as any);
      jest
        .spyOn(normalizeHelper, 'normalizeOsmBoundariesResponse')
        .mockReturnValue(mockNormalizedResult as any);

      const result = await service.get_place_list(cityName);

      expect(result).toEqual(mockNormalizedResult);
      expect(overpassService.findPlaceDetails).toHaveBeenCalled();
      expect(osmBoundariesService.searchByName).toHaveBeenCalledWith(cityName);

      // Verify fallback logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Reason: overpass-empty'),
      );
    });

    it('should fallback to OSM Boundaries if Overpass service throws an error', async () => {
      // Setup: Overpass throws
      overpassService.findPlaceDetails.mockRejectedValue(
        new Error('Network Timeout'),
      );

      // Setup: OSM Boundaries returns data
      osmBoundariesService.searchByName.mockResolvedValue([
        { osm_id: 456 },
      ] as any);
      jest
        .spyOn(normalizeHelper, 'normalizeOsmBoundariesResponse')
        .mockReturnValue(mockNormalizedResult as any);

      const result = await service.get_place_list(cityName);

      expect(result).toEqual(mockNormalizedResult);
      expect(osmBoundariesService.searchByName).toHaveBeenCalled();

      // Verify error logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Reason: overpass-error'),
      );
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Error: Network Timeout'),
      );
    });
  });
});
