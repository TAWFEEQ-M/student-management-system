import app from "../server/index.js";
import connectDB from "../server/config/db.js";

let dbConnected = false;

export default async function handler(req, res) {
  try {
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
    }

    return app(req, res);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}