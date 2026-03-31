import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const superAdmins = await prisma.user.findMany({
    where: { role: Role.SUPER_ADMIN },
  });

  if (superAdmins.length > 1) {
    throw new Error('Multiple SUPER_ADMIN users detected. Keep exactly one.');
  }

  if (superAdmins.length === 1) {
    return;
  }

  const superAdminName = process.env.SUPER_ADMIN_NAME ?? 'super_admin';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'super-admin-change-me';

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  await prisma.user.create({
    data: {
      name: superAdminName,
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      restaurantId: null,
    },
  });
}

main()
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
