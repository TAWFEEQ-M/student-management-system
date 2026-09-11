import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
const token = (user) => jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });
export async function register(req, res) { const { name, email, password, role } = req.body; const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role }); res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: token(user) }); }
export async function login(req, res) { const user = await User.findOne({ email: req.body.email }); if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) return res.status(401).json({ message: "Invalid credentials" }); res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: token(user) }); }
export async function me(req, res) { const user = await User.findById(req.user.id).select("-password"); res.json(user); }
