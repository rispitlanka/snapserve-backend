import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { AddIngredientDto } from './dto/add-ingredient.dto';
import { AddAddonToMenuItemDto } from './dto/add-addon-to-menu-item.dto';
import { CreateAddonDto } from './dto/create-addon.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CloudinaryService } from './cloudinary.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import {
  hasUpdateMenuItemPayload,
  parseCreateMenuItemFromDataField,
  parseUpdateMenuItemFromDataField,
} from './menu-item-form.util';
import { MenuService } from './menu.service';

const MENU_ITEM_IMAGE_FIELD = 'image';

const menuItemImageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(
        new BadRequestException(
          `Upload rejected: "${file.originalname}" is not an image (received MIME type ${file.mimetype}).`,
        ),
      );
      return;
    }
    cb(null, true);
  },
};

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @ApiOperation({
    summary:
      'Add or update ingredient for a menu item (ingredientId = inventory item id; unit must match inventory unit)',
  })
  @Post('items/:id/ingredients')
  addIngredientToMenuItem(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddIngredientDto,
  ) {
    return this.menuService.addIngredientToMenuItem(actor, id, dto);
  }

  @ApiOperation({
    summary:
      'Add or update ingredient for an addon on this menu item (addon must be attached first)',
  })
  @Post('items/:id/addons/:addonId/ingredients')
  addIngredientToMenuItemAddon(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('addonId') addonId: string,
    @Body() dto: AddIngredientDto,
  ) {
    return this.menuService.addIngredientToMenuItemAddon(
      actor,
      id,
      addonId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Add or update addon price for a menu item' })
  @Post('items/:id/addons')
  addAddonToItem(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddAddonToMenuItemDto,
  ) {
    return this.menuService.addAddonToMenuItem(
      actor,
      id,
      dto.id,
      dto.addonsPrice,
    );
  }

  @ApiOperation({
    summary: 'Create menu item',
    description:
      'Send multipart/form-data: field "data" (JSON string of CreateMenuItemDto, including required id) and optional field "image" (file). If "image" is sent, it is uploaded to Cloudinary and overrides menuImage in "data".',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'string',
          description:
            'JSON string: id (required), name, categoryId, menuType, cost, optional kotEnabled, menuImage (URL), varients, addons, status.',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Optional image file (PNG, JPEG, WebP, etc.)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor(MENU_ITEM_IMAGE_FIELD, menuItemImageMulterOptions),
  )
  @Post('items')
  async createMenuItem(
    @CurrentUser() actor: AuthUser,
    @Body('data') dataJson: string,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const dto = parseCreateMenuItemFromDataField(dataJson);
    if (image) {
      dto.menuImage = await this.cloudinaryService.uploadMenuImage(image);
    }
    return this.menuService.createMenuItem(actor, dto);
  }

  @ApiOperation({ summary: 'Get all menu items' })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get('items')
  listMenuItems(@CurrentUser() actor: AuthUser) {
    return this.menuService.listMenuItems(actor);
  }

  @ApiOperation({
    summary: 'Update menu item',
    description:
      'Send multipart/form-data: optional "data" (JSON string of UpdateMenuItemDto) and/or optional "image" file. At least one of data or image is required.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description:
            'JSON string of fields to update (name, categoryId, menuType, cost, menuImage URL, varients, addons, status, etc.).',
        },
        image: {
          type: 'string',
          format: 'binary',
          description:
            'Optional new image file; uploaded to Cloudinary and stored as imageUrl.',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor(MENU_ITEM_IMAGE_FIELD, menuItemImageMulterOptions),
  )
  @Patch('items/:id')
  async updateMenuItem(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body('data') dataJson: string | undefined,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const hasData =
      dataJson !== undefined &&
      dataJson !== null &&
      String(dataJson).trim() !== '';
    if (!hasData && !image) {
      throw new BadRequestException(
        'Send at least one of: field "data" (JSON with fields to update) or field "image" (image file).',
      );
    }
    const dto = parseUpdateMenuItemFromDataField(dataJson);
    if (image) {
      dto.menuImage = await this.cloudinaryService.uploadMenuImage(image);
    }
    if (!hasUpdateMenuItemPayload(dto)) {
      throw new BadRequestException(
        'Field "data" must include at least one property to update, or send an "image" file.',
      );
    }
    return this.menuService.updateMenuItem(actor, id, dto);
  }

  @ApiOperation({ summary: 'Create menu category' })
  @Post('categories')
  createCategory(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.menuService.createCategory(actor, dto);
  }

  @ApiOperation({ summary: 'Get all menu categories' })
  @Get('categories')
  listCategories(@CurrentUser() actor: AuthUser) {
    return this.menuService.listCategories(actor);
  }

  @ApiOperation({ summary: 'Update menu category' })
  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.menuService.updateCategory(actor, id, dto);
  }

  @ApiOperation({ summary: 'Create variant' })
  @Post('variants')
  createVariant(@CurrentUser() actor: AuthUser, @Body() dto: CreateVariantDto) {
    return this.menuService.createVariant(actor, dto);
  }

  @ApiOperation({ summary: 'Get all variants' })
  @Get('variants')
  listVariants(@CurrentUser() actor: AuthUser) {
    return this.menuService.listVariants(actor);
  }

  @ApiOperation({ summary: 'Update variant' })
  @Patch('variants/:id')
  updateVariant(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.menuService.updateVariant(actor, id, dto);
  }

  @ApiOperation({ summary: 'Create addon' })
  @Post('addons')
  createAddon(@CurrentUser() actor: AuthUser, @Body() dto: CreateAddonDto) {
    return this.menuService.createAddon(actor, dto);
  }

  @ApiOperation({ summary: 'Get all addons' })
  @Get('addons')
  listAddons(@CurrentUser() actor: AuthUser) {
    return this.menuService.listAddons(actor);
  }

  @ApiOperation({ summary: 'Update addon' })
  @Patch('addons/:id')
  updateAddon(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddonDto,
  ) {
    return this.menuService.updateAddon(actor, id, dto);
  }
}
