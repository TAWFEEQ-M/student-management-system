import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Subject from "./models/Subject.js";
import Attendance from "./models/Attendance.js";
import Mark from "./models/Mark.js";
import { initialStudents, initialSubjects, initialAttendance, initialAssessmentMarks, examTypes } from "../src/data/mockData.js";

await connectDB();
await User.updateOne(
  { email: "admin@example.com" },
  { name: "Administrator", email: "admin@example.com", password: await bcrypt.hash("change-me", 12), role: "admin" },
  { upsert: true },
);

await Student.bulkWrite(initialStudents.map(({ id: studentId, name, ...data }) => ({
  updateOne: { filter: { studentId }, update: { $set: { studentId, name, fullName: name, status: "active", ...data } }, upsert: true },
})));
await Subject.bulkWrite(initialSubjects.map((data) => ({
  updateOne: { filter: { code: data.code }, update: { $set: data }, upsert: true },
})));

const attendanceWrites = Object.entries(initialAttendance).flatMap(([date, subjects]) =>
  Object.entries(subjects).map(([subjectCode, records]) => ({
    updateOne: { filter: { date, subjectCode }, update: { $set: { date, subjectCode, records } }, upsert: true },
  })),
);
if (attendanceWrites.length) await Attendance.bulkWrite(attendanceWrites);

const markWrites = [];
for (const [studentId, subjects] of Object.entries(initialAssessmentMarks)) {
  for (const [subjectCode, exams] of Object.entries(subjects)) {
    for (const exam of examTypes) {
      const scores = exams[exam];
      if (scores) markWrites.push({
        updateOne: { filter: { studentId, subjectCode, exam }, update: { $set: { studentId, subjectCode, exam, scores } }, upsert: true },
      });
    }
  }
}
if (markWrites.length) await Mark.bulkWrite(markWrites);
console.log(`Seed complete: ${initialStudents.length} students, ${initialSubjects.length} subjects, ${attendanceWrites.length} attendance records, ${markWrites.length} marks`);
process.exit(0);
