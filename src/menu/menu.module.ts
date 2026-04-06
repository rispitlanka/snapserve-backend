import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController],
  providers: [MenuService, CloudinaryService],
})
export class MenuModule {}
