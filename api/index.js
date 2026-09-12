import app from "../server/index.js";
import connectDB from "../server/config/db.js";

let dbConnection;

export default async function handler(req, res) {
  try {
    if (!dbConnection) dbConnection = connectDB();
    await dbConnection;

    return app(req, res);
  } catch (error) {
    dbConnection = undefined;
    console.error("API error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
}