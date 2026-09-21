import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

config({ path: '../../.env' });

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured to bootstrap the administrator.`);
  return value;
};

async function main() {
  const databaseUrl = required('DATABASE_URL');
  const email = required('INITIAL_ADMIN_EMAIL').toLowerCase();
  const displayName = required('INITIAL_ADMIN_DISPLAY_NAME');
  const password = required('INITIAL_ADMIN_PASSWORD');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`Administrator ${email} already exists; bootstrap skipped.`);
      return;
    }

    await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
      },
    });
    console.log(`Administrator ${email} created.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
