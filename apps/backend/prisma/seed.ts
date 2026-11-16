import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@movy.com.br').toLowerCase().trim();
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD || 'movyAdmin2026!';

  console.log(`🌱 Verificando existência do usuário administrador padrão (${adminEmail})...`);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador MOVY',
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`✅ Usuário administrador criado com sucesso! ID: ${admin.id}`);
  } else {
    // Atualiza a senha e garante a role ADMIN
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`ℹ️ Usuário administrador já existe. Credenciais sincronizadas.`);
  }

  // Opcional: cria um SDR de exemplo para testes caso não exista
  const sdrEmail = 'sdr@movy.com.br';
  const existingSdr = await prisma.user.findUnique({
    where: { email: sdrEmail },
  });

  if (!existingSdr) {
    const sdrHash = await bcrypt.hash('sdrMovy2026!', saltRounds);
    await prisma.user.create({
      data: {
        name: 'Lucas SDR',
        email: sdrEmail,
        passwordHash: sdrHash,
        role: UserRole.SDR,
      },
    });
    console.log(`✅ Usuário SDR de testes criado: ${sdrEmail}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Falha ao rodar seed do banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
