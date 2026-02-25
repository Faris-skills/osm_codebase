import { Test, TestingModule } from '@nestjs/testing';
import { NominatimController } from './nominatim.controller';

describe('NominatimController', () => {
  let controller: NominatimController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NominatimController],
    }).compile();

    controller = module.get<NominatimController>(NominatimController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
