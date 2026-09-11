import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import Attendance from "../models/Attendance.js";
import Mark from "../models/Mark.js";
import { calculateResult } from "../utils/results.js";

const resource = (Model, sort, fields = []) => ({
  list: async (req, res) => res.json(await Model.find(Object.fromEntries(fields.filter((key) => req.query[key]).map((key) => [key, req.query[key]]))).sort(sort)),
  get: async (req, res) => { const item = await Model.findById(req.params.id); if (!item) return res.status(404).json({ message: "Record not found" }); res.json(item); },
  create: async (req, res) => res.status(201).json(await Model.create(req.body)),
  update: async (req, res) => { const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: "Record not found" }); res.json(item); },
  remove: async (req, res) => { if (!await Model.findByIdAndDelete(req.params.id)) return res.status(404).json({ message: "Record not found" }); res.status(204).end(); },
});
export const students = resource(Student, "name", ["department", "year", "section"]);
export const subjects = resource(Subject, "code", ["department", "semester"]);
students.list = async (req, res) => {
  const filter = {};
  for (const key of ["department", "year", "section", "email", "studentId"]) if (req.query[key]) filter[key] = req.query[key];
  if (req.query.id) filter.studentId = req.query.id;
  if (req.query.search || req.query.q) {
    const search = req.query.search || req.query.q;
    filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }, { studentId: new RegExp(search, "i") }];
  }
  res.json(await Student.find(filter).sort("name"));
};
const values = (records, id) => [...(records || [])].filter(([studentId]) => !id || studentId === id).map(([, present]) => Boolean(present));
const summary = (rows) => { const present = rows.filter(Boolean).length; return { total: rows.length, present, absent: rows.length - present, percentage: rows.length ? Math.round(present / rows.length * 100) : 0 }; };
export async function listAttendance(req, res) { const filter = {}; if (req.query.date) filter.date = req.query.date; if (req.query.subjectCode) filter.subjectCode = req.query.subjectCode; res.json(await Attendance.find(filter).sort({ date: 1 })); }
export async function attendanceByStudent(req, res) { const records = (await Attendance.find()).flatMap((item) => values(item.records, req.params.id).map((present) => ({ date: item.date, subjectCode: item.subjectCode, present }))); res.json({ studentId: req.params.id, records, ...summary(records.map((row) => row.present)) }); }
export async function attendanceBySubject(req, res) { const records = (await Attendance.find({ subjectCode: req.params.id })).flatMap((item) => values(item.records).map((present) => ({ date: item.date, subjectCode: item.subjectCode, present }))); res.json({ subjectCode: req.params.id, records, ...summary(records.map((row) => row.present)) }); }
export async function attendanceSummary(req, res) { const rows = await Attendance.find(req.query.subjectCode ? { subjectCode: req.query.subjectCode } : {}); res.json(summary(rows.flatMap((item) => values(item.records)))); }
export async function saveAttendance(req, res) { const { date, subjectCode, records } = req.body; if (!date || !subjectCode || !records) return res.status(400).json({ message: "date, subjectCode and records are required" }); res.json(await Attendance.findOneAndUpdate({ date, subjectCode }, { date, subjectCode, records }, { upsert: true, new: true, runValidators: true })); }
export async function updateAttendance(req, res) { const item = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: "Record not found" }); res.json(item); }
export async function deleteAttendance(req, res) { if (!await Attendance.findByIdAndDelete(req.params.id)) return res.status(404).json({ message: "Record not found" }); res.status(204).end(); }
const maximum = { test1: 25, test2: 25, assignment: 10, practical: 20, final: 100 };
const asObject = (value) => value instanceof Map ? Object.fromEntries(value) : (value || {});
const markResult = (mark) => ({ ...mark.toObject(), scores: asObject(mark.scores), result: calculateResult(asObject(mark.scores), maximum) });
export async function listMarks(req, res) { const filter = Object.fromEntries(["studentId", "subjectCode", "exam"].filter((key) => req.query[key]).map((key) => [key, req.query[key]])); res.json((await Mark.find(filter).sort({ studentId: 1 })).map(markResult)); }
export async function marksByStudent(req, res) { res.json({ studentId: req.params.id, marks: (await Mark.find({ studentId: req.params.id })).map(markResult) }); }
export async function marksBySubject(req, res) { res.json({ subjectCode: req.params.id, marks: (await Mark.find({ subjectCode: req.params.id })).map(markResult) }); }
export async function marksSummary(req, res) { const results = (await Mark.find(req.query.studentId ? { studentId: req.query.studentId } : {})).map(markResult).map((row) => row.result); const total = results.reduce((sum, row) => sum + row.total, 0); const maximumTotal = results.reduce((sum, row) => sum + row.maximum, 0); res.json({ count: results.length, total, maximum: maximumTotal, percentage: maximumTotal ? Math.round(total / maximumTotal * 100) : 0 }); }
export async function saveMark(req, res) { const { studentId, subjectCode, exam, scores } = req.body; if (!studentId || !subjectCode || !exam || !scores) return res.status(400).json({ message: "studentId, subjectCode, exam and scores are required" }); res.json(markResult(await Mark.findOneAndUpdate({ studentId, subjectCode, exam }, { studentId, subjectCode, exam, scores }, { upsert: true, new: true, runValidators: true }))); }
export async function updateMark(req, res) { const item = await Mark.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: "Record not found" }); res.json(markResult(item)); }
export async function deleteMark(req, res) { if (!await Mark.findByIdAndDelete(req.params.id)) return res.status(404).json({ message: "Record not found" }); res.status(204).end(); }
const attendanceData = async (studentId) => summary((await Attendance.find()).flatMap((item) => values(item.records, studentId)));
export async function dashboardReport(req, res) { res.json({ students: await Student.countDocuments(), subjects: await Subject.countDocuments(), attendance: await attendanceData() }); }
export async function studentReport(req, res) { const student = await Student.findOne({ $or: [{ studentId: req.params.id }, { _id: req.params.id }] }).catch(() => null); if (!student) return res.status(404).json({ message: "Student not found" }); res.json({ student, attendance: await attendanceData(student.studentId), marks: (await Mark.find({ studentId: student.studentId })).map(markResult) }); }
export async function reports(req, res) { res.json({ students: await Student.find(), marks: (await Mark.find()).map(markResult), attendance: await attendanceData() }); }
