import { Router } from "express";
import authRoutes from "./auth.js";
import { protect } from "../middleware/auth.js";
import { students, subjects, listAttendance, attendanceByStudent, attendanceBySubject, attendanceSummary, saveAttendance, updateAttendance, deleteAttendance, marksByStudent, marksBySubject, marksSummary, listMarks, saveMark, updateMark, deleteMark, reports, dashboardReport, studentReport } from "../controllers/crud.js";
const resource = (handlers) => { const router = Router(); router.get("/", handlers.list); router.get("/:id", handlers.get); router.post("/", protect, handlers.create); router.put("/:id", protect, handlers.update); router.delete("/:id", protect, handlers.remove); return router; };
export default function routes() {
  const router = Router(); router.use("/auth", authRoutes); router.use("/students", resource(students)); router.use("/subjects", resource(subjects));
  router.get("/attendance/summary", attendanceSummary); router.get("/attendance/student/:id", attendanceByStudent); router.get("/attendance/subject/:id", attendanceBySubject); router.get("/attendance", listAttendance); router.post("/attendance", protect, saveAttendance); router.put("/attendance/:id", protect, updateAttendance); router.delete("/attendance/:id", protect, deleteAttendance);
  router.get("/marks/summary", marksSummary); router.get("/marks/student/:id", marksByStudent); router.get("/marks/subject/:id", marksBySubject); router.get("/marks", listMarks); router.post("/marks", protect, saveMark); router.put("/marks/:id", protect, updateMark); router.delete("/marks/:id", protect, deleteMark);
  router.get("/reports/dashboard", dashboardReport); router.get("/reports/student/:id", studentReport); router.get("/reports", reports); return router;
}
