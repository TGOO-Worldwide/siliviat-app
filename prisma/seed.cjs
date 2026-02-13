const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✓ Carregado" : "✗ Não encontrado");

const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.DEV_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.DEV_ADMIN_PASSWORD || "admin123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin",
      email: adminEmail,
      role: UserRole.ADMIN,
      passwordHash,
      passkeyEnabled: false,
    },
  });

  console.log("Admin seed:", admin.email);

  const technologies = [
    "Fibra Ótica",
    "Internet Móvel 5G",
    "Telefonia Fixa VoIP",
    "Central Telefónica Virtual",
    "Serviços Cloud",
  ];

  for (const name of technologies) {
    await prisma.technology.upsert({
      where: { name },
      update: {},
      create: {
        name,
        active: true,
      },
    });
  }

  console.log("Tecnologias seed criadas/atualizadas.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
