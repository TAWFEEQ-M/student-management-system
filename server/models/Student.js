import mongoose from "mongoose";
const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true }, fullName: { type: String, trim: true }, status: { type: String, enum: ["active", "inactive"], default: "active" }, email: { type: String, required: true, unique: true, lowercase: true },
  phone: String, dateOfBirth: String, gender: String, department: String, year: String, section: String,
  address: String, admissionYear: String,
}, { timestamps: true });
export default mongoose.model("Student", studentSchema);
