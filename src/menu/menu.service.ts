import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryUnit, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { AddIngredientDto } from './dto/add-ingredient.dto';
import { CreateAddonDto } from './dto/create-addon.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly menuItemDetailInclude = {
    category: true,
    variants: { include: { variant: true } },
    addons: {
      include: {
        addon: true,
        ingredients: { include: { inventoryItem: true } },
      },
    },
    ingredients: { include: { inventoryItem: true } },
  } satisfies Prisma.MenuItemInclude;

  private requireRestaurant(actor: AuthUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    return actor.restaurantId;
  }

  private async loadInventoryIngredient(
    restaurantId: string,
    ingredientId: string,
  ) {
    const inv = await this.prisma.inventoryItem.findFirst({
      where: { id: ingredientId, restaurantId },
      select: { id: true, unit: true },
    });
    if (!inv) {
      throw new NotFoundException('Inventory item not found.');
    }
    return inv;
  }

  private assertUnitMatchesInventory(
    inventoryUnit: InventoryUnit,
    dtoUnit: InventoryUnit,
  ) {
    if (dtoUnit !== inventoryUnit) {
      throw new BadRequestException(
        `Unit must match the inventory item unit (${inventoryUnit}).`,
      );
    }
  }

  createCategory(actor: AuthUser, dto: CreateMenuCategoryDto) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.menuCategory.create({
      data: {
        restaurantId,
        name: dto.name,
        status: dto.status ?? true,
      },
    });
  }

  listCategories(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCategory(
    actor: AuthUser,
    id: string,
    dto: UpdateMenuCategoryDto,
  ) {
    const restaurantId = this.requireRestaurant(actor);
    const exists = await this.prisma.menuCategory.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Menu category not found.');
    }

    return this.prisma.menuCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  createVariant(actor: AuthUser, dto: CreateVariantDto) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.variant.create({
      data: {
        restaurantId,
        variantCategory: dto.variantCategory,
        name: dto.name,
      },
    });
  }

  listVariants(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.variant.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateVariant(actor: AuthUser, id: string, dto: UpdateVariantDto) {
    const restaurantId = this.requireRestaurant(actor);
    const exists = await this.prisma.variant.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Variant not found.');
    }

    return this.prisma.variant.update({
      where: { id },
      data: {
        ...(dto.variantCategory !== undefined
          ? { variantCategory: dto.variantCategory }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
    });
  }

  createAddon(actor: AuthUser, dto: CreateAddonDto) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.addon.create({
      data: {
        restaurantId,
        name: dto.name,
      },
    });
  }

  listAddons(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.addon.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAddon(actor: AuthUser, id: string, dto: UpdateAddonDto) {
    const restaurantId = this.requireRestaurant(actor);
    const exists = await this.prisma.addon.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Addon not found.');
    }

    return this.prisma.addon.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
    });
  }

  async createMenuItem(actor: AuthUser, dto: CreateMenuItemDto) {
    const restaurantId = this.requireRestaurant(actor);

    const category = await this.prisma.menuCategory.findFirst({
      where: { id: dto.categoryId, restaurantId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Menu category not found.');
    }

    const variantIds = [...new Set((dto.varients ?? []).map((v) => v.id))];
    const addonIds = [...new Set((dto.addons ?? []).map((a) => a.id))];

    const [variants, addons] = await Promise.all([
      variantIds.length
        ? this.prisma.variant.findMany({
            where: { id: { in: variantIds }, restaurantId },
            select: { id: true },
          })
        : Promise.resolve([]),
      addonIds.length
        ? this.prisma.addon.findMany({
            where: { id: { in: addonIds }, restaurantId },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more variants are invalid.');
    }
    if (addons.length !== addonIds.length) {
      throw new BadRequestException('One or more addons are invalid.');
    }

    try {
      return await this.prisma.menuItem.create({
        data: {
          id: dto.id,
          restaurantId,
          name: dto.name,
          categoryId: dto.categoryId,
        menuTypes: dto.menuType,
        kotEnabled: dto.kotEnabled ?? true,
        cost: new Prisma.Decimal(dto.cost.toFixed(2)),
        imageUrl: dto.menuImage,
        status: dto.status ?? true,
        variants: {
          create: (dto.varients ?? []).map((v) => ({
            variantId: v.id,
            variantPrice: new Prisma.Decimal(v.varientPrice.toFixed(2)),
          })),
        },
        addons: {
          create: (dto.addons ?? []).map((a) => ({
            addonId: a.id,
            addonsPrice: new Prisma.Decimal(a.addonsPrice.toFixed(2)),
          })),
        },
      },
        include: this.menuItemDetailInclude,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        if (target.includes('id') && target.length === 1) {
          throw new ConflictException(
            'A menu item with this id already exists. Choose a different id.',
          );
        }
        throw new ConflictException(
          'A menu item with this name already exists for this restaurant. Choose a different name.',
        );
      }
      throw error;
    }
  }

  listMenuItems(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      include: this.menuItemDetailInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMenuItem(actor: AuthUser, id: string, dto: UpdateMenuItemDto) {
    const restaurantId = this.requireRestaurant(actor);

    const existing = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Menu item not found.');
    }

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.menuCategory.findFirst({
        where: { id: dto.categoryId, restaurantId },
        select: { id: true },
      });
      if (!category) {
        throw new NotFoundException('Menu category not found.');
      }
    }

    if (dto.varients !== undefined) {
      const variantIds = [...new Set(dto.varients.map((v) => v.id))];
      const variants = await this.prisma.variant.findMany({
        where: { id: { in: variantIds }, restaurantId },
        select: { id: true },
      });
      if (variants.length !== variantIds.length) {
        throw new BadRequestException('One or more variants are invalid.');
      }
    }

    if (dto.addons !== undefined) {
      const addonIds = [...new Set(dto.addons.map((a) => a.id))];
      const addons = await this.prisma.addon.findMany({
        where: { id: { in: addonIds }, restaurantId },
        select: { id: true },
      });
      if (addons.length !== addonIds.length) {
        throw new BadRequestException('One or more addons are invalid.');
      }
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.menuType !== undefined ? { menuTypes: dto.menuType } : {}),
        ...(dto.kotEnabled !== undefined ? { kotEnabled: dto.kotEnabled } : {}),
        ...(dto.cost !== undefined
          ? { cost: new Prisma.Decimal(dto.cost.toFixed(2)) }
          : {}),
        ...(dto.menuImage !== undefined ? { imageUrl: dto.menuImage } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.varients !== undefined
          ? {
              variants: {
                deleteMany: {},
                create: dto.varients.map((v) => ({
                  variantId: v.id,
                  variantPrice: new Prisma.Decimal(v.varientPrice.toFixed(2)),
                })),
              },
            }
          : {}),
        ...(dto.addons !== undefined
          ? {
              addons: {
                deleteMany: {},
                create: dto.addons.map((a) => ({
                  addonId: a.id,
                  addonsPrice: new Prisma.Decimal(a.addonsPrice.toFixed(2)),
                })),
              },
            }
          : {}),
      },
      include: this.menuItemDetailInclude,
    });
  }

  async addAddonToMenuItem(
    actor: AuthUser,
    menuItemId: string,
    addonId: string,
    addonsPrice: number,
  ) {
    const restaurantId = this.requireRestaurant(actor);

    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId },
      select: { id: true },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found.');
    }

    const addon = await this.prisma.addon.findFirst({
      where: { id: addonId, restaurantId },
      select: { id: true },
    });
    if (!addon) {
      throw new NotFoundException('Addon not found.');
    }

    await this.prisma.menuItemAddon.upsert({
      where: {
        menuItemId_addonId: {
          menuItemId,
          addonId,
        },
      },
      create: {
        menuItemId,
        addonId,
        addonsPrice: new Prisma.Decimal(addonsPrice.toFixed(2)),
      },
      update: {
        addonsPrice: new Prisma.Decimal(addonsPrice.toFixed(2)),
      },
    });

    return this.prisma.menuItem.findUniqueOrThrow({
      where: { id: menuItemId },
      include: this.menuItemDetailInclude,
    });
  }

  async addIngredientToMenuItem(
    actor: AuthUser,
    menuItemId: string,
    dto: AddIngredientDto,
  ) {
    const restaurantId = this.requireRestaurant(actor);

    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId },
      select: { id: true },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found.');
    }

    const inv = await this.loadInventoryIngredient(
      restaurantId,
      dto.ingredientId,
    );
    this.assertUnitMatchesInventory(inv.unit, dto.unit);

    await this.prisma.menuItemIngredient.upsert({
      where: {
        menuItemId_inventoryItemId: {
          menuItemId,
          inventoryItemId: dto.ingredientId,
        },
      },
      create: {
        menuItemId,
        inventoryItemId: dto.ingredientId,
        quantity: new Prisma.Decimal(dto.quantity),
        unit: dto.unit,
      },
      update: {
        quantity: new Prisma.Decimal(dto.quantity),
        unit: dto.unit,
      },
    });

    return this.prisma.menuItem.findUniqueOrThrow({
      where: { id: menuItemId },
      include: this.menuItemDetailInclude,
    });
  }

  async addIngredientToMenuItemAddon(
    actor: AuthUser,
    menuItemId: string,
    addonId: string,
    dto: AddIngredientDto,
  ) {
    const restaurantId = this.requireRestaurant(actor);

    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId },
      select: { id: true },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found.');
    }

    const mia = await this.prisma.menuItemAddon.findFirst({
      where: { menuItemId, addonId },
      select: { id: true },
    });
    if (!mia) {
      throw new NotFoundException(
        'This addon is not attached to the menu item.',
      );
    }

    const inv = await this.loadInventoryIngredient(
      restaurantId,
      dto.ingredientId,
    );
    this.assertUnitMatchesInventory(inv.unit, dto.unit);

    await this.prisma.menuItemAddonIngredient.upsert({
      where: {
        menuItemAddonId_inventoryItemId: {
          menuItemAddonId: mia.id,
          inventoryItemId: dto.ingredientId,
        },
      },
      create: {
        menuItemAddonId: mia.id,
        inventoryItemId: dto.ingredientId,
        quantity: new Prisma.Decimal(dto.quantity),
        unit: dto.unit,
      },
      update: {
        quantity: new Prisma.Decimal(dto.quantity),
        unit: dto.unit,
      },
    });

    return this.prisma.menuItem.findUniqueOrThrow({
      where: { id: menuItemId },
      include: this.menuItemDetailInclude,
    });
  }
}
