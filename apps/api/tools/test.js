const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.projectBudgetItem.findMany();
  console.log(items);
}
main().finally(() => prisma.$disconnect());
