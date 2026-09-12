import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./config/prisma.js";
import { initialStudents, initialSubjects, initialAttendance, initialAssessmentMarks, examTypes } from "../src/data/mockData.js";

await prisma.user.upsert({
  where: { email: "admin@example.com" },
  update: { name: "Administrator", password: await bcrypt.hash("change-me", 12), role: "admin" },
  create: { name: "Administrator", email: "admin@example.com", password: await bcrypt.hash("change-me", 12), role: "admin" },
});

for (const student of initialStudents) {
  const {
    id: studentId,
    name,
    email,
    phone,
    dateOfBirth,
    gender,
    department,
    year,
    section,
    address,
    admissionYear,
  } = student;
  const data = { email, phone, dateOfBirth, gender, department, year, section, address, admissionYear };
  await prisma.student.upsert({
    where: { studentId },
    update: { studentId, name, fullName: name, status: "active", ...data },
    create: { studentId, name, fullName: name, status: "active", ...data },
  });
}
for (const data of initialSubjects) {
  await prisma.subject.upsert({ where: { code: data.code }, update: data, create: data });
}

let attendanceCount = 0;
for (const [date, subjectRows] of Object.entries(initialAttendance)) {
  for (const [subjectCode, records] of Object.entries(subjectRows)) {
    await prisma.attendance.upsert({
      where: { date_subjectCode: { date, subjectCode } },
      update: { records },
      create: { date, subjectCode, records },
    });
    attendanceCount += 1;
  }
}

let markCount = 0;
for (const [studentId, subjectRows] of Object.entries(initialAssessmentMarks)) {
  for (const [subjectCode, exams] of Object.entries(subjectRows)) {
    for (const exam of examTypes) {
      const scores = exams[exam];
      if (!scores) continue;
      await prisma.mark.upsert({
        where: { studentId_subjectCode_exam: { studentId, subjectCode, exam } },
        update: { scores },
        create: { studentId, subjectCode, exam, scores },
      });
      markCount += 1;
    }
  }
}

console.log(`Seed complete: ${initialStudents.length} students, ${initialSubjects.length} subjects, ${attendanceCount} attendance records, ${markCount} marks`);
await prisma.$disconnect();
