import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { initialAssessmentMarks, initialAttendance, initialMarks, initialStudents, initialSubjects } from "../data/mockData";
import { api, normalizeStudent } from "../services/api";

const AppContext = createContext(null);
const toObject = (value) => value instanceof Map ? Object.fromEntries(value) : (Array.isArray(value) ? Object.fromEntries(value) : (value || {}));
const assessmentFromRows = (rows, fallback) => rows.reduce((result, row) => {
  const student = result[row.studentId] || {};
  const subject = student[row.subjectCode] || {};
  return { ...result, [row.studentId]: { ...student, [row.subjectCode]: { ...subject, [row.exam]: toObject(row.scores) } } };
}, fallback);
const legacyMarksFromRows = (rows) => rows.reduce((result, row) => {
  const scores = toObject(row.scores);
  const current = result[row.studentId] || {};
  return { ...result, [row.studentId]: Object.fromEntries(["test1", "test2", "assignment"].map((field) => [
    field,
    current[field] == null ? Number(scores[field] || 0) : Math.round((current[field] + Number(scores[field] || 0)) / 2),
  ])) };
}, {});
const attendanceForStudent = (rows, studentId) => {
  const values = rows.map((row) => toObject(row.records)[studentId]).filter((value) => typeof value === "boolean");
  return values.length ? Math.round(values.filter(Boolean).length / values.length * 100) : 0;
};
const attendanceKey = (subject, hour = 1) => hour === 1 ? subject : `${subject}#${hour}`;
const attendanceFromRows = (rows) => rows.reduce((result, row) => ({ ...result, [row.date]: { ...(result[row.date] || {}), [attendanceKey(row.subjectCode, row.hour || 1)]: toObject(row.records) } }), {});

export function AppProvider({ children }) {
  const [students, setStudents] = useState(initialStudents);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [marks, setMarks] = useState(initialMarks);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [assessmentMarks, setAssessmentMarks] = useState(initialAssessmentMarks);
  const [backendStatus, setBackendStatus] = useState("loading");
  const [backendError, setBackendError] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("sms_token");
        if (!token) {
          if (active) setBackendStatus("offline");
          return;
        }
        const sessionUser = await api.get("/auth/me");
        if (active) setUser(sessionUser);
        const [studentRows, subjectRows, attendanceRows, markRows] = await Promise.all([
          api.get("/students"), api.get("/subjects"), api.get("/attendance"), api.get("/marks"),
        ]);
      if (!active) return;
      setStudents(studentRows.map((student) => ({ ...normalizeStudent(student), attendance: attendanceForStudent(attendanceRows, student.studentId || student.id) })));
      setSubjects(subjectRows);
      setAttendance(attendanceFromRows(attendanceRows));
      setMarks(legacyMarksFromRows(markRows));
      setAssessmentMarks(assessmentFromRows(markRows, initialAssessmentMarks));
      setBackendStatus("connected");
      } catch (error) {
        if (active) {
          localStorage.removeItem("sms_token");
          setUser(null);
          setBackendStatus("offline");
          setBackendError(error.message);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);
  const login = useCallback(async (email, password) => {
    const session = await api.login(email, password);
    localStorage.setItem("sms_token", session.token);
    setUser(session.user);
    setBackendError("");
    setBackendStatus("connected");
    const [studentRows, subjectRows, attendanceRows, markRows] = await Promise.all([
      api.get("/students"), api.get("/subjects"), api.get("/attendance"), api.get("/marks"),
    ]);
    setStudents(studentRows.map((student) => ({ ...normalizeStudent(student), attendance: attendanceForStudent(attendanceRows, student.studentId || student.id) })));
    setSubjects(subjectRows);
    setAttendance(attendanceFromRows(attendanceRows));
    setMarks(legacyMarksFromRows(markRows));
    setAssessmentMarks(assessmentFromRows(markRows, initialAssessmentMarks));
    return session.user;
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem("sms_token");
    setUser(null);
  }, []);
  const saveAttendance = useCallback((date, subject, records, hour = 1) => {
    setAttendance((current) => {
      const next = { ...current, [date]: { ...(current[date] || {}), [attendanceKey(subject, hour)]: records } };
      setStudents((currentStudents) => currentStudents.map((student) => {
        const values = Object.values(next).flatMap((day) => Object.values(day).map((record) => record[student.id]).filter((value) => typeof value === "boolean"));
        return values.length ? { ...student, attendance: Math.round(values.filter(Boolean).length / values.length * 100) } : student;
      }));
      return next;
    });
    return api.post("/attendance", { date, subjectCode: subject, hour, records }).catch((error) => { setBackendStatus("offline"); setBackendError(error.message); throw error; });
  }, []);
  const copyAttendance = useCallback((body) => api.copyAttendance(body), []);
  const saveStudent = useCallback((student, editing = false) => {
    const body = { ...student, studentId: student.id };
    delete body.id;
    delete body._id;
    delete body.attendance;
    return (editing ? api.put(`/students/${student._id}`, body) : api.post("/students", body)).catch((error) => {
      setBackendStatus("offline");
      setBackendError(error.message);
      throw error;
    });
  }, []);
  const saveSubject = useCallback((subject, editing = false) => {
    const body = { ...subject };
    delete body.id;
    delete body._id;
    return (editing ? api.put(`/subjects/${subject._id}`, body) : api.post("/subjects", body)).catch((error) => {
      setBackendStatus("offline");
      setBackendError(error.message);
      throw error;
    });
  }, []);
  const saveMarks = useCallback((rows) => Promise.all(rows.map((row) => api.post("/marks", row))).catch((error) => { setBackendStatus("offline"); setBackendError(error.message); return null; }), []);
  const deleteStudent = useCallback((student) => api.del(`/students/${student._id}`).then(() => true).catch((error) => { setBackendStatus("offline"); setBackendError(error.message); throw error; }), []);
  const deleteSubject = useCallback((subject) => api.del(`/subjects/${subject._id}`).catch((error) => { setBackendStatus("offline"); setBackendError(error.message); }), []);
  const value = useMemo(() => ({
    students, setStudents, subjects, setSubjects, marks, setMarks, assessmentMarks, setAssessmentMarks, attendance, setAttendance, saveAttendance, copyAttendance, saveStudent, saveSubject, saveMarks, deleteStudent, deleteSubject, backendStatus, backendError, user, authLoading, login, logout,
  }), [students, subjects, marks, assessmentMarks, attendance, saveAttendance, copyAttendance, saveStudent, saveSubject, saveMarks, deleteStudent, deleteSubject, backendStatus, backendError, user, authLoading, login, logout]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
