import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type PrismaErrorBody = {
  statusCode: number;
  message: string;
  error: string;
};

/**
 * Maps Prisma known request errors to HTTP status and a user-facing message.
 */
export function mapPrismaKnownRequestError(
  exception: Prisma.PrismaClientKnownRequestError,
): PrismaErrorBody {
  const { code, meta } = exception;
  const modelName = meta?.modelName as string | undefined;
  const target = (meta?.target as string[] | undefined) ?? [];
  const fields = target.length ? target.join(', ') : 'unknown fields';

  switch (code) {
    case 'P2002': {
      const message = uniqueConstraintMessage(modelName, target);
      return {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
      };
    }
    case 'P2003': {
      const fieldName = meta?.field_name as string | undefined;
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: fieldName
          ? `Foreign key constraint failed: invalid or missing related record (${fieldName}).`
          : 'Foreign key constraint failed: a related record does not exist or cannot be linked.',
        error: 'Bad Request',
      };
    }
    case 'P2011': {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'A required field was null. Check that all required values are provided.',
        error: 'Bad Request',
      };
    }
    case 'P2014': {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'This change would break a required relation between records. Remove or update related data first.',
        error: 'Bad Request',
      };
    }
    case 'P2021': {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          'Database schema mismatch: a table or column referenced by the query does not exist. Run migrations.',
        error: 'Internal Server Error',
      };
    }
    case 'P2025': {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message:
          'The requested record was not found, or the operation affected no rows.',
        error: 'Not Found',
      };
    }
    default:
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Database request failed (${code}). ${exception.message}`,
        error: 'Bad Request',
      };
  }
}

function uniqueConstraintMessage(
  modelName: string | undefined,
  target: string[],
): string {
  const fields = target.length ? target.join(', ') : 'unknown fields';
  const byModel: Record<string, string> = {
    MenuItem:
      'A menu item with this name already exists for this restaurant. Choose a different name.',
    User: 'A user with this name already exists for this restaurant. Choose a different name.',
    Customer:
      'A customer with this mobile number already exists for this restaurant.',
    MenuCategory:
      'A menu category with this name already exists for this restaurant.',
    Variant:
      'A variant with this category and name already exists for this restaurant.',
    Addon: 'An addon with this name already exists for this restaurant.',
    ItemCategory:
      'An inventory category with this name already exists for this restaurant.',
    ItemSubCategory:
      'A sub-category with this name already exists under this category.',
    Brand: 'A brand with this name already exists for this restaurant.',
    InventoryItem:
      'An inventory item with this name already exists for this restaurant.',
    Register:
      'A register with this name already exists for this restaurant.',
    Restaurant:
      'A restaurant with this id already exists. Choose a different id.',
    Order:
      'Could not assign a unique invoice id. Please try creating the order again.',
    RefreshSession:
      'Session storage conflict. Please sign in again or retry the operation.',
    MenuItemVariant:
      'This variant is already linked to this menu item.',
    MenuItemAddon: 'This addon is already linked to this menu item.',
    MenuItemIngredient:
      'This ingredient is already linked to this menu item.',
    MenuItemAddonIngredient:
      'This ingredient is already linked to this menu addon.',
  };

  if (modelName && byModel[modelName]) {
    return byModel[modelName];
  }

  const nameRestaurantPair =
    target.includes('name') &&
    target.includes('restaurantId') &&
    target.length === 2;
  if (nameRestaurantPair) {
    return `A record with this name already exists for this restaurant (${modelName ?? 'resource'}).`;
  }

  return `Unique constraint violated: duplicate value for (${fields}).`;
}

export function getPublicErrorMessage(exception: unknown): string {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaKnownRequestError(exception).message;
  }
  if (exception instanceof Prisma.PrismaClientValidationError) {
    return `Invalid data for database operation: ${exception.message}`;
  }
  if (exception instanceof Error) {
    return exception.message;
  }
  return String(exception);
}
