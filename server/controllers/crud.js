import prisma from "../config/prisma.js";
import { calculateResult } from "../utils/results.js";

const expose = (item) => item ? { ...item, _id: item.id } : item;
const exposeMany = (items) => items.map(expose);
const stripIds = (data) => {
  const clean = { ...data };
  delete clean.id;
  delete clean._id;
  return clean;
};
const resource = (delegate, sort, fields = []) => ({
  list: async (req, res) => {
    const where = Object.fromEntries(fields.filter((key) => req.query[key]).map((key) => [key, req.query[key]]));
    res.json(exposeMany(await delegate.findMany({ where, orderBy: { [sort]: "asc" } })));
  },
  get: async (req, res) => {
    const item = await delegate.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: "Record not found" });
    res.json(expose(item));
  },
  create: async (req, res) => res.status(201).json(expose(await delegate.create({ data: stripIds(req.body) }))),
  update: async (req, res) => {
    const item = await delegate.update({ where: { id: req.params.id }, data: stripIds(req.body) });
    res.json(expose(item));
  },
  remove: async (req, res) => {
    await delegate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  },
});

export const students = resource(prisma.student, "name", ["department", "year", "section"]);
export const subjects = resource(prisma.subject, "code", ["department", "semester"]);

students.list = async (req, res) => {
  const where = {};
  for (const key of ["department", "year", "section", "email", "studentId"]) if (req.query[key]) where[key] = req.query[key];
  if (req.query.id) where.studentId = req.query.id;
  if (req.query.search || req.query.q) {
    const search = req.query.search || req.query.q;
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { studentId: { contains: search } }];
  }
  res.json(exposeMany(await prisma.student.findMany({ where, orderBy: { name: "asc" } })));
};

const values = (records, id) => Object.entries(records || {}).filter(([studentId]) => !id || studentId === id).map(([, present]) => Boolean(present));
const summary = (rows) => {
  const present = rows.filter(Boolean).length;
  return { total: rows.length, present, absent: rows.length - present, percentage: rows.length ? Math.round(present / rows.length * 100) : 0 };
};

export async function listAttendance(req, res) {
  const where = {};
  if (req.query.date) where.date = req.query.date;
  if (req.query.subjectCode) where.subjectCode = req.query.subjectCode;
  res.json(exposeMany(await prisma.attendance.findMany({ where, orderBy: { date: "asc" } })));
}
export async function attendanceByStudent(req, res) {
  const rows = await prisma.attendance.findMany();
  const records = rows.flatMap((item) => values(item.records, req.params.id).map((present) => ({ date: item.date, subjectCode: item.subjectCode, present })));
  res.json({ studentId: req.params.id, records, ...summary(records.map((row) => row.present)) });
}
export async function attendanceBySubject(req, res) {
  const rows = await prisma.attendance.findMany({ where: { subjectCode: req.params.id } });
  const records = rows.flatMap((item) => values(item.records).map((present) => ({ date: item.date, subjectCode: item.subjectCode, present })));
  res.json({ subjectCode: req.params.id, records, ...summary(records.map((row) => row.present)) });
}
export async function attendanceSummary(req, res) {
  const rows = await prisma.attendance.findMany(req.query.subjectCode ? { where: { subjectCode: req.query.subjectCode } } : {});
  res.json(summary(rows.flatMap((item) => values(item.records))));
}
export async function saveAttendance(req, res) {
  const { date, subjectCode, records } = req.body;
  if (!date || !subjectCode || !records) return res.status(400).json({ message: "date, subjectCode and records are required" });
  const item = await prisma.attendance.upsert({
    where: { date_subjectCode: { date, subjectCode } },
    update: { records },
    create: { date, subjectCode, records },
  });
  res.json(expose(item));
}
export async function updateAttendance(req, res) {
  res.json(expose(await prisma.attendance.update({ where: { id: req.params.id }, data: req.body })));
}
export async function deleteAttendance(req, res) {
  await prisma.attendance.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

const maximum = { test1: 25, test2: 25, assignment: 10, practical: 20, final: 100 };
const markResult = (mark) => ({ ...expose(mark), result: calculateResult(mark.scores || {}, maximum) });
export async function listMarks(req, res) {
  const where = Object.fromEntries(["studentId", "subjectCode", "exam"].filter((key) => req.query[key]).map((key) => [key, req.query[key]]));
  res.json((await prisma.mark.findMany({ where, orderBy: { studentId: "asc" } })).map(markResult));
}
export async function marksByStudent(req, res) {
  res.json({ studentId: req.params.id, marks: (await prisma.mark.findMany({ where: { studentId: req.params.id } })).map(markResult) });
}
export async function marksBySubject(req, res) {
  res.json({ subjectCode: req.params.id, marks: (await prisma.mark.findMany({ where: { subjectCode: req.params.id } })).map(markResult) });
}
export async function marksSummary(req, res) {
  const results = (await prisma.mark.findMany(req.query.studentId ? { where: { studentId: req.query.studentId } } : {})).map(markResult).map((row) => row.result);
  const total = results.reduce((sum, row) => sum + row.total, 0);
  const maximumTotal = results.reduce((sum, row) => sum + row.maximum, 0);
  res.json({ count: results.length, total, maximum: maximumTotal, percentage: maximumTotal ? Math.round(total / maximumTotal * 100) : 0 });
}
export async function saveMark(req, res) {
  const { studentId, subjectCode, exam, scores } = req.body;
  if (!studentId || !subjectCode || !exam || !scores) return res.status(400).json({ message: "studentId, subjectCode, exam and scores are required" });
  const item = await prisma.mark.upsert({
    where: { studentId_subjectCode_exam: { studentId, subjectCode, exam } },
    update: { scores },
    create: { studentId, subjectCode, exam, scores },
  });
  res.json(markResult(item));
}
export async function updateMark(req, res) {
  res.json(markResult(await prisma.mark.update({ where: { id: req.params.id }, data: req.body })));
}
export async function deleteMark(req, res) {
  await prisma.mark.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

const attendanceData = async (studentId) => summary((await prisma.attendance.findMany()).flatMap((item) => values(item.records, studentId)));
export async function dashboardReport(req, res) {
  res.json({ students: await prisma.student.count(), subjects: await prisma.subject.count(), attendance: await attendanceData() });
}
export async function studentReport(req, res) {
  const student = await prisma.student.findFirst({ where: { OR: [{ studentId: req.params.id }, { id: req.params.id }] } });
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json({ student: expose(student), attendance: await attendanceData(student.studentId), marks: (await prisma.mark.findMany({ where: { studentId: student.studentId } })).map(markResult) });
}
export async function reports(req, res) {
  res.json({ students: exposeMany(await prisma.student.findMany()), marks: (await prisma.mark.findMany()).map(markResult), attendance: await attendanceData() });
}
