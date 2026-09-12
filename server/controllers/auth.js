import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const token = (user) => jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  const user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 12), role } });
  res.status(201).json({ user: publicUser(user), token: token(user) });
}

export async function login(req, res) {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) return res.status(401).json({ message: "Invalid credentials" });
  res.json({ user: publicUser(user), token: token(user) });
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(publicUser(user));
}
