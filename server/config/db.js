import prisma from "./prisma.js";

export default async function connectDB() {
  await prisma.$connect();
  return prisma;
}
