import { Test, TestingModule } from '@nestjs/testing';
import { OverpassService } from './overpass.service';

describe('OverpassService', () => {
  let service: OverpassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OverpassService],
    }).compile();

    service = module.get<OverpassService>(OverpassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
