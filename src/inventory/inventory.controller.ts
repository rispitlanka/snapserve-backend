import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateItemCategoryDto } from './dto/create-category.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateItemSubCategoryDto } from './dto/create-sub-category.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Create item category' })
  @Post('categories')
  createCategory(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateItemCategoryDto,
  ) {
    return this.inventoryService.createCategory(actor, dto);
  }

  @ApiOperation({ summary: 'List item categories' })
  @Get('categories')
  listCategories(@CurrentUser() actor: AuthUser) {
    return this.inventoryService.listCategories(actor);
  }

  @ApiOperation({ summary: 'Create item sub-category' })
  @Post('sub-categories')
  createSubCategory(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateItemSubCategoryDto,
  ) {
    return this.inventoryService.createSubCategory(actor, dto);
  }

  @ApiOperation({ summary: 'List item sub-categories' })
  @Get('sub-categories')
  listSubCategories(
    @CurrentUser() actor: AuthUser,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.inventoryService.listSubCategories(actor, categoryId);
  }

  @ApiOperation({ summary: 'Create brand' })
  @Post('brands')
  createBrand(@CurrentUser() actor: AuthUser, @Body() dto: CreateBrandDto) {
    return this.inventoryService.createBrand(actor, dto);
  }

  @ApiOperation({ summary: 'List brands' })
  @Get('brands')
  listBrands(@CurrentUser() actor: AuthUser) {
    return this.inventoryService.listBrands(actor);
  }

  @ApiOperation({ summary: 'Create inventory item' })
  @Post('items')
  createItem(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.createItem(actor, dto);
  }

  @ApiOperation({ summary: 'List inventory items' })
  @Get('items')
  listItems(@CurrentUser() actor: AuthUser) {
    return this.inventoryService.listItems(actor);
  }

  @ApiOperation({
    summary:
      'Purchase history for an inventory item (date, description, qty, ending stock)',
  })
  @Get('items/:id/history')
  getHistory(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.inventoryService.getItemHistory(actor, id);
  }

  @ApiOperation({
    summary:
      'Get one inventory item with category/sub/brand and purchase history',
  })
  @Get('items/:id')
  getItem(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.inventoryService.getItemById(actor, id);
  }
}
