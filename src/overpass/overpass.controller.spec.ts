import { Test, TestingModule } from '@nestjs/testing';
import { OverpassController } from './overpass.controller';

describe('OverpassController', () => {
  let controller: OverpassController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OverpassController],
    }).compile();

    controller = module.get<OverpassController>(OverpassController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
