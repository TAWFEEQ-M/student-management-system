import mongoose from "mongoose";
const schema = new mongoose.Schema({ name: String, email: { type: String, unique: true, required: true, lowercase: true }, password: { type: String, required: true }, role: { type: String, enum: ["admin", "faculty"], default: "admin" } }, { timestamps: true });
export default mongoose.model("User", schema);
