import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { AddIngredientDto } from './dto/add-ingredient.dto';
import { AddAddonToMenuItemDto } from './dto/add-addon-to-menu-item.dto';
import { CreateAddonDto } from './dto/create-addon.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { MenuService } from './menu.service';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

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

  @ApiOperation({ summary: 'Create menu item' })
  @Post('items')
  createMenuItem(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.createMenuItem(actor, dto);
  }

  @ApiOperation({ summary: 'Get all menu items' })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get('items')
  listMenuItems(@CurrentUser() actor: AuthUser) {
    return this.menuService.listMenuItems(actor);
  }

  @ApiOperation({ summary: 'Update menu item' })
  @Patch('items/:id')
  updateMenuItem(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
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
