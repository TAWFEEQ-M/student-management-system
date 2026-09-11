import mongoose from "mongoose";
const schema = new mongoose.Schema({ code: { type: String, unique: true, required: true }, name: { type: String, required: true }, faculty: String, credits: Number, semester: String, department: String }, { timestamps: true });
export default mongoose.model("Subject", schema);
