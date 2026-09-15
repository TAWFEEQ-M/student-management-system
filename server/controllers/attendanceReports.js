import ExcelJS from "exceljs";
import prisma from "../config/prisma.js";

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
const hourValue = (value, fallback = 1) => {
  const hour = Number(value ?? fallback);
  return Number.isInteger(hour) && hour >= 1 && hour <= 12 ? hour : null;
};
const filters = (query) => Object.fromEntries(["department", "year", "section"].filter((key) => query[key]).map((key) => [key, query[key]]));
const attendanceStats = (rows, studentId) => {
  const values = rows.flatMap((row) => studentId ? [row.records?.[studentId]].filter((value) => typeof value === "boolean") : Object.values(row.records || {}).filter((value) => typeof value === "boolean"));
  const present = values.filter(Boolean).length;
  return { total: values.length, present, absent: values.length - present, percentage: values.length ? Math.round(present / values.length * 100) : 0 };
};
const studentRows = async (query = {}) => {
  const students = await prisma.student.findMany({ where: filters(query), orderBy: { name: "asc" } });
  const attendance = await prisma.attendance.findMany({ where: query.date ? { date: query.date } : undefined });
  return students.map((student) => ({ ...student, ...attendanceStats(attendance, student.studentId), rrn: student.studentId }));
};

export async function searchStudents(req, res) {
  const query = String(req.query.q || req.query.name || req.query.rrn || "").trim();
  if (!query) return res.status(400).json({ message: "Search query is required" });
  const rows = await prisma.student.findMany({ where: { OR: [{ name: { contains: query } }, { studentId: { contains: query } }, { email: { contains: query } }] }, orderBy: { name: "asc" }, take: 50 });
  res.json(rows.map((student) => ({ ...student, rrn: student.studentId })));
}

export async function lowAttendance(req, res) {
  const threshold = Number(req.query.threshold ?? 75);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) return res.status(400).json({ message: "threshold must be between 0 and 100" });
  const rows = (await studentRows(req.query)).filter((student) => student.percentage < threshold).map((student) => ({ ...student, status: student.percentage < 60 ? "Critical" : student.percentage < 70 ? "Low" : "Warning" }));
  res.json({ threshold, count: rows.length, students: rows });
}

export async function attendanceByDate(req, res) {
  if (!validDate(req.query.date)) return res.status(400).json({ message: "A valid date is required in YYYY-MM-DD format" });
  const where = { date: req.query.date, ...(req.query.subjectCode ? { subjectCode: req.query.subjectCode } : {}), ...(req.query.hour ? { hour: Number(req.query.hour) } : {}) };
  const rows = await prisma.attendance.findMany({ where, orderBy: [{ subjectCode: "asc" }, { hour: "asc" }] });
  if (!rows.length) return res.status(404).json({ message: "No attendance records were found for the selected date." });
  res.json({ date: req.query.date, records: rows });
}

export async function copyAttendance(req, res) {
  const { date, subjectCode, sourceHour, destinationHour, overwrite = false } = req.body;
  const source = hourValue(sourceHour);
  const destination = hourValue(destinationHour);
  if (!validDate(date) || !subjectCode || !source || !destination || source === destination) return res.status(400).json({ message: "date, subjectCode, different sourceHour and destinationHour are required" });
  const sourceRow = await prisma.attendance.findUnique({ where: { date_subjectCode_hour: { date, subjectCode, hour: source } } });
  if (!sourceRow) return res.status(404).json({ message: "Source attendance was not found" });
  const destinationRow = await prisma.attendance.findUnique({ where: { date_subjectCode_hour: { date, subjectCode, hour: destination } } });
  if (destinationRow && !overwrite) return res.status(409).json({ message: "Destination attendance already exists", existing: destinationRow });
  const saved = await prisma.attendance.upsert({ where: { date_subjectCode_hour: { date, subjectCode, hour: destination } }, update: { records: sourceRow.records }, create: { date, subjectCode, hour: destination, records: sourceRow.records } });
  res.json({ copied: true, sourceHour: source, destinationHour: destination, attendance: saved, summary: attendanceStats([sourceRow]) });
}

const setCell = (cell, value, style = {}) => { cell.value = value; cell.alignment = { vertical: "middle", wrapText: true, ...style }; cell.border = { top: { style: "thin", color: { argb: "FFD9E2EC" } }, left: { style: "thin", color: { argb: "FFD9E2EC" } }, bottom: { style: "thin", color: { argb: "FFD9E2EC" } }, right: { style: "thin", color: { argb: "FFD9E2EC" } } }; };
const safeFilename = (value) => String(value || "report").replace(/[^a-z0-9_-]+/gi, "_");

export async function exportAttendance(req, res) {
  if (!validDate(req.query.date)) return res.status(400).json({ message: "A valid date is required in YYYY-MM-DD format" });
  const attendance = await prisma.attendance.findMany({ where: { date: req.query.date, ...(req.query.subjectCode ? { subjectCode: req.query.subjectCode } : {}) }, orderBy: [{ subjectCode: "asc" }, { hour: "asc" }] });
  if (!attendance.length) return res.status(404).json({ message: "No attendance records were found for the selected date." });
  const students = await prisma.student.findMany({ where: filters(req.query), orderBy: { name: "asc" } });
  const subjects = await prisma.subject.findMany();
  const subject = subjects.find((item) => item.code === req.query.subjectCode) || subjects.find((item) => item.code === attendance[0].subjectCode);
  const hours = [...new Set(attendance.map((row) => row.hour || 1))].sort((a, b) => a - b);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Student Management System";
  const sheet = workbook.addWorksheet("Attendance", { views: [{ state: "frozen", ySplit: 8 }] });
  const lastColumn = 11 + hours.length;
  const lastLetter = String.fromCharCode(64 + lastColumn);
  sheet.mergeCells(`A1:${lastLetter}1`); sheet.getCell("A1").value = "B.S. ABDUR RAHMAN CRESCENT INSTITUTE OF SCIENCE AND TECHNOLOGY"; sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } }; sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B5D" } }; sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.mergeCells(`A2:${lastLetter}2`); sheet.getCell("A2").value = "STUDENT ATTENDANCE SHEET"; sheet.getCell("A2").font = { bold: true, size: 12 }; sheet.getCell("A2").alignment = { horizontal: "center" };
  sheet.addRow(["Academic Year", "", "Department", req.query.department || "All", "Year", req.query.year || "All", "Section", req.query.section || "All"]);
  sheet.addRow(["Subject", subject?.name || attendance[0].subjectCode, "Faculty", subject?.faculty || "", "Date", req.query.date, "Generated On", new Date().toISOString().slice(0, 10)]);
  sheet.addRow([]);
  const headers = ["S.No", "RRN / Register Number", "Student Name", "Date", "Subject", ...hours.map((hour) => `Hour ${hour}`), "Total Present", "Total Hours", "Attendance %", "Status", "E-Signature"];
  const headerRow = sheet.addRow(headers); headerRow.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } }; setCell(cell, cell.value, { horizontal: "center" }); });
  students.forEach((student, index) => {
    const hourValues = hours.map((hour) => { const row = attendance.find((item) => item.hour === hour && item.subjectCode === (subject?.code || attendance[0].subjectCode)); const value = row?.records?.[student.studentId]; return value === true ? "P" : value === false ? "A" : ""; });
    const present = hourValues.filter((value) => value === "P").length; const total = hourValues.filter(Boolean).length;
    const row = sheet.addRow([index + 1, student.studentId, student.name, req.query.date, subject?.code || attendance[0].subjectCode, ...hourValues, present, total, total ? present / total : 0, total && present / total < 0.75 ? "Low" : "Good", ""]);
    row.eachCell((cell, column) => setCell(cell, cell.value, { horizontal: [1, 2, 4, 5, ...hours.map((_, i) => 6 + i), 6 + hours.length, 7 + hours.length, 8 + hours.length].includes(column) ? "center" : "left" }));
    row.getCell(8 + hours.length).numFmt = "0%";
    if (index % 2) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }; });
  });
  sheet.addRow([]); const summary = sheet.addRow(["Summary", `Total students: ${students.length}`, `Total present: ${students.reduce((sum, student) => sum + hours.filter((hour) => attendance.find((item) => item.hour === hour)?.records?.[student.studentId] === true).length, 0)}`, `Total absent: ${students.reduce((sum, student) => sum + hours.filter((hour) => attendance.find((item) => item.hour === hour)?.records?.[student.studentId] === false).length, 0)}`]); summary.eachCell((cell) => { cell.font = { bold: true }; });
  sheet.addRow([]); sheet.addRow(["Faculty E-Signature: ________________________________"]); sheet.addRow(["Faculty Name: ______________________________________"]); sheet.addRow(["HOD / Authorized Signature: _________________________"]);
  sheet.columns.forEach((column) => { column.width = 16; }); sheet.getColumn(3).width = 24; sheet.getColumn(2).width = 22; sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }; sheet.printOptions.horizontalCentered = true; sheet.pageSetup.printTitlesRow = "6:6";
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename=Attendance_${safeFilename(req.query.date)}_${safeFilename(req.query.department || "All")}.xlsx`); res.send(Buffer.from(buffer));
}

export async function lowAttendanceExport(req, res) {
  req.query.date = req.query.date || undefined;
  const rows = (await studentRows(req.query)).filter((student) => student.percentage < Number(req.query.threshold ?? 75));
  if (!rows.length) return res.status(404).json({ message: "No students matched the low attendance threshold." });
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Low Attendance", { views: [{ state: "frozen", ySplit: 1 }] });
  const headers = ["S.No", "RRN", "Student Name", "Department", "Year", "Section", "Total Classes", "Present", "Absent", "Attendance %", "Status"]; const header = sheet.addRow(headers); header.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } }; setCell(cell, cell.value, { horizontal: "center" }); });
  rows.forEach((student, index) => { const row = sheet.addRow([index + 1, student.studentId, student.name, student.department, student.year, student.section, student.total, student.present, student.absent, student.percentage / 100, student.status]); row.eachCell((cell) => setCell(cell, cell.value)); row.getCell(10).numFmt = "0%"; });
  sheet.columns.forEach((column) => { column.width = 16; }); sheet.getColumn(3).width = 24; sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1 };
  const buffer = await workbook.xlsx.writeBuffer(); res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", "attachment; filename=Low_Attendance.xlsx"); res.send(Buffer.from(buffer));
}
