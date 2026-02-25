import { Test, TestingModule } from '@nestjs/testing';
import { AdminLevelMapService } from './admin-level-map.service';

describe('AdminLevelMapServiceService', () => {
  let service: AdminLevelMapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminLevelMapService],
    }).compile();

    service = module.get<AdminLevelMapService>(AdminLevelMapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
