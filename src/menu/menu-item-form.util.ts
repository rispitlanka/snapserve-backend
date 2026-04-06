import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

function formatValidationErrors(errors: ValidationError[], parent = ''): string {
  const parts: string[] = [];
  for (const err of errors) {
    const path = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      parts.push(
        ...Object.values(err.constraints).map((m) => `${path}: ${m}`),
      );
    }
    if (err.children?.length) {
      parts.push(formatValidationErrors(err.children, path));
    }
  }
  return parts.join('; ');
}

export function parseCreateMenuItemFromDataField(dataJson: string): CreateMenuItemDto {
  if (dataJson === undefined || dataJson === null || String(dataJson).trim() === '') {
    throw new BadRequestException(
      'Field "data" is required: send a JSON string with id, name, categoryId, menuType, cost, and other menu item fields.',
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(String(dataJson));
  } catch {
    throw new BadRequestException(
      'Field "data" must be valid JSON (object) describing the menu item.',
    );
  }
  const dto = plainToInstance(CreateMenuItemDto, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    throw new BadRequestException(
      `Invalid menu item data: ${formatValidationErrors(errors)}`,
    );
  }
  return dto;
}

export function parseUpdateMenuItemFromDataField(
  dataJson: string | undefined,
): UpdateMenuItemDto {
  if (dataJson === undefined || dataJson === null || String(dataJson).trim() === '') {
    return {};
  }
  let raw: unknown;
  try {
    raw = JSON.parse(String(dataJson));
  } catch {
    throw new BadRequestException(
      'Field "data" must be valid JSON (object) with the menu item fields to update.',
    );
  }
  const dto = plainToInstance(UpdateMenuItemDto, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: true,
  });
  if (errors.length > 0) {
    throw new BadRequestException(
      `Invalid menu item update data: ${formatValidationErrors(errors)}`,
    );
  }
  return dto;
}

export function hasUpdateMenuItemPayload(dto: UpdateMenuItemDto): boolean {
  return (
    dto.name !== undefined ||
    dto.categoryId !== undefined ||
    dto.menuType !== undefined ||
    dto.kotEnabled !== undefined ||
    dto.cost !== undefined ||
    dto.menuImage !== undefined ||
    dto.varients !== undefined ||
    dto.addons !== undefined ||
    dto.status !== undefined
  );
}
