import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateItemCategoryDto } from './dto/create-category.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateItemSubCategoryDto } from './dto/create-sub-category.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private requireRestaurant(actor: AuthUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    return actor.restaurantId;
  }

  async createCategory(actor: AuthUser, dto: CreateItemCategoryDto) {
    const restaurantId = this.requireRestaurant(actor);
    try {
      return await this.prisma.itemCategory.create({
        data: { restaurantId, name: dto.name },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A category with this name already exists for this restaurant.',
        );
      }
      throw error;
    }
  }

  listCategories(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.itemCategory.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async createSubCategory(actor: AuthUser, dto: CreateItemSubCategoryDto) {
    const restaurantId = this.requireRestaurant(actor);
    const parent = await this.prisma.itemCategory.findFirst({
      where: { id: dto.categoryId, restaurantId },
    });
    if (!parent) {
      throw new NotFoundException('Category not found for this restaurant.');
    }
    try {
      return await this.prisma.itemSubCategory.create({
        data: {
          restaurantId,
          categoryId: dto.categoryId,
          name: dto.name,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A sub-category with this name already exists under this category.',
        );
      }
      throw error;
    }
  }

  listSubCategories(actor: AuthUser, categoryId?: string) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.itemSubCategory.findMany({
      where: {
        restaurantId,
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(actor: AuthUser, dto: CreateBrandDto) {
    const restaurantId = this.requireRestaurant(actor);
    try {
      return await this.prisma.brand.create({
        data: { restaurantId, name: dto.name },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A brand with this name already exists for this restaurant.',
        );
      }
      throw error;
    }
  }

  listBrands(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.brand.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async createItem(actor: AuthUser, dto: CreateInventoryItemDto) {
    const restaurantId = this.requireRestaurant(actor);
    const [category, sub, brand] = await Promise.all([
      this.prisma.itemCategory.findFirst({
        where: { id: dto.categoryId, restaurantId },
      }),
      this.prisma.itemSubCategory.findFirst({
        where: { id: dto.subCategoryId, restaurantId },
      }),
      this.prisma.brand.findFirst({
        where: { id: dto.brandId, restaurantId },
      }),
    ]);
    if (!category) {
      throw new NotFoundException('Category not found.');
    }
    if (!sub) {
      throw new NotFoundException('Sub-category not found.');
    }
    if (sub.categoryId !== category.id) {
      throw new BadRequestException(
        'Sub-category does not belong to the selected category.',
      );
    }
    if (!brand) {
      throw new NotFoundException('Brand not found.');
    }

    try {
      return await this.prisma.inventoryItem.create({
        data: {
          restaurantId,
          name: dto.name,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId,
          brandId: dto.brandId,
          unit: dto.unit,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        },
        include: {
          category: true,
          subCategory: true,
          brand: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An inventory item with this name already exists for this restaurant.',
        );
      }
      throw error;
    }
  }

  listItems(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.inventoryItem.findMany({
      where: { restaurantId },
      include: {
        category: true,
        subCategory: true,
        brand: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getItemById(actor: AuthUser, id: string) {
    const restaurantId = this.requireRestaurant(actor);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId },
      include: {
        category: true,
        subCategory: true,
        brand: true,
      },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found.');
    }
    const history = await this.getPurchaseHistoryForItem(actor, id);
    return { ...item, history };
  }

  async getItemHistory(actor: AuthUser, id: string) {
    await this.assertItemInRestaurant(actor, id);
    return this.getPurchaseHistoryForItem(actor, id);
  }

  private async assertItemInRestaurant(actor: AuthUser, itemId: string) {
    const restaurantId = this.requireRestaurant(actor);
    const exists = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, restaurantId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Inventory item not found.');
    }
  }

  private async getPurchaseHistoryForItem(actor: AuthUser, itemId: string) {
    const restaurantId = this.requireRestaurant(actor);
    const lines = await this.prisma.purchaseItem.findMany({
      where: {
        inventoryItemId: itemId,
        purchase: { restaurantId },
      },
      include: {
        purchase: true,
      },
      orderBy: [
        { purchase: { receiveDate: 'asc' } },
        { purchase: { createdAt: 'asc' } },
        { id: 'asc' },
      ],
    });

    let endingStock = 0;
    return lines.map((line) => {
      const qty = Number(line.quantity.toString());
      endingStock += qty;
      return {
        dateTime: line.purchase.receiveDate.toISOString(),
        description:
          line.description ?? line.purchase.notes ?? line.purchase.refNo ?? '',
        quantity: line.quantity,
        endingStock,
      };
    });
  }
}
