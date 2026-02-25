import { AdminLevelMapService } from './admin-level-map.service';
import * as fs from 'fs';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

describe('AdminLevelMapService', () => {
  const mockJson = {
    in: { 4: 'State', 6: 'District' },
    us: { 4: 'State', 8: 'City' },
  };

  beforeEach(() => {
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockJson));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    const service = new AdminLevelMapService();
    expect(service).toBeDefined();
  });

  it('should return country levels', () => {
    const service = new AdminLevelMapService();
    expect(service.getCountryLevels('IN')).toEqual({
      4: 'State',
      6: 'District',
    });
  });

  it('should return correct level name', () => {
    const service = new AdminLevelMapService();
    expect(service.getLevelName('US', 4)).toBe('State');
    expect(service.getLevelName('US', 8)).toBe('City');
  });

  it('should return null for unknown level', () => {
    const service = new AdminLevelMapService();
    expect(service.getLevelName('US', 99)).toBeNull();
  });

  it('should return empty object for unknown country', () => {
    const service = new AdminLevelMapService();
    expect(service.getCountryLevels('XX')).toEqual({});
  });
});
