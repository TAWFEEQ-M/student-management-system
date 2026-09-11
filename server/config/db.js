import mongoose from "mongoose";
import dns from "node:dns";

export default async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  // Some Windows DNS configurations reject Node's default SRV resolver while
  // the same Atlas record is otherwise reachable. Use configurable public
  // resolvers for MongoDB SRV discovery in development.
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers((process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8").split(",").map((server) => server.trim()).filter(Boolean));
  mongoose.set("strictQuery", true);
  return mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
  });
}
