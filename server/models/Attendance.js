import mongoose from "mongoose";
const schema = new mongoose.Schema({ date: { type: String, required: true }, subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" }, subjectCode: String, records: { type: Map, of: Boolean } }, { timestamps: true });
schema.index({ date: 1, subjectCode: 1 }, { unique: true });
export default mongoose.model("Attendance", schema);
