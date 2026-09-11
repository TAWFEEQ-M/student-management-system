import "dotenv/config"; import express from "express"; import cors from "cors"; import morgan from "morgan"; import connectDB from "./config/db.js"; import routes from "./routes/index.js"; import { errorHandler, notFound } from "./middleware/error.js";
const allowedOrigins = new Set((process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((origin) => origin.trim()).filter(Boolean));
const app = express(); app.use(cors({ origin: (origin, callback) => !origin || allowedOrigins.has(origin) ? callback(null, true) : callback(new Error("Origin not allowed by CORS")) }));
app.use(express.json()); app.use(morgan("dev")); app.get("/api/health", (req, res) => res.json({ status: "ok" })); app.use("/api", await routes()); app.use(notFound); app.use(errorHandler);
if (process.env.NODE_ENV !== "test") { const port = process.env.PORT || 5000; connectDB().then(() => app.listen(port, () => console.log(`API listening on ${port}`))).catch((error) => { console.error(`Database connection failed: ${error.message}`); process.exitCode = 1; }); }
export default app;
