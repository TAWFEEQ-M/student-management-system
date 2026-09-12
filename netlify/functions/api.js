import serverless from "serverless-http";
import app from "../../server/index.js";
import connectDB from "../../server/config/db.js";

const expressHandler = serverless(app);
let dbConnection;

const normalizePath = (path = "") => {
  if (path.startsWith("/api")) return path;
  const functionPrefix = "/.netlify/functions/api";
  const suffix = path.startsWith(functionPrefix) ? path.slice(functionPrefix.length) : path;
  return `/api${suffix || "/"}`;
};

export async function handler(event, context) {
  if (!dbConnection) dbConnection = connectDB();
  await dbConnection;
  const path = normalizePath(event.path);
  return expressHandler({ ...event, path, rawPath: path }, context);
}