import mongoose from "mongoose";
const schema = new mongoose.Schema({ student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }, studentId: String, subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" }, subjectCode: String, exam: String, scores: { type: Map, of: Number } }, { timestamps: true });
schema.index({ studentId: 1, subjectCode: 1, exam: 1 }, { unique: true });
export default mongoose.model("Mark", schema);
