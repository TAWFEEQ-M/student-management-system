import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, History, RotateCcw, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

const today = new Date().toISOString().slice(0, 10);
const years = ["All", "1st Year", "2nd Year", "3rd Year", "4th Year"];
const attendanceKey = (code, hour) => hour === 1 ? code : `${code}#${hour}`;
const splitAttendanceKey = (key) => { const [code, hour] = key.split("#"); return { code, hour: Number(hour || 1) }; };

function Attendance() {
  const { students, subjects, attendance, saveAttendance, copyAttendance } = useApp();
  const [date, setDate] = useState(today);
  const [subject, setSubject] = useState(subjects[0]?.code || "");
  const [hour, setHour] = useState(1);
  const [sourceHour, setSourceHour] = useState(1);
  const [destinationHour, setDestinationHour] = useState(2);
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [status, setStatus] = useState("All");
  const [studentId, setStudentId] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [present, setPresent] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Selection changes reset the editable draft to the persisted record.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresent(attendance[date]?.[attendanceKey(subject, hour)] || Object.fromEntries(students.map((student) => [student.id, true])));
    setMessage("");
  }, [date, subject, hour, attendance, students]);

  const filteredStudents = useMemo(() => students.filter((student) =>
    (year === "All" || student.year === year) && (section === "All" || student.section === section) &&
    (studentId === "All" || student.id === studentId) &&
    (status === "All" || (status === "Present" ? present[student.id] : !present[student.id]))
  ), [students, year, section, studentId, status, present]);

  const history = useMemo(() => Object.entries(attendance).flatMap(([historyDate, records]) =>
    Object.entries(records).flatMap(([key, values]) => { const { code, hour: recordHour } = splitAttendanceKey(key); return Object.entries(values).map(([id, isPresent]) => ({
      date: historyDate, code, hour: recordHour, student: students.find((item) => item.id === id), isPresent,
    })); }).filter((row) => row.student)
  ).filter((row) => (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate) &&
    (subject === "All" || row.code === subject) &&
    (year === "All" || row.student.year === year) && (section === "All" || row.student.section === section) &&
    (studentId === "All" || row.student.id === studentId)), [attendance, students, fromDate, toDate, subject, year, section, studentId]);
  const counts = { present: filteredStudents.filter((student) => present[student.id]).length, total: filteredStudents.length };
  const selectedHistory = history.filter((row) => studentId === "All" || row.student.id === studentId);
  const attended = history.filter((row) => row.isPresent).length;
  const absent = history.length - attended;
  const currentPercentage = history.length ? Math.round(attended / history.length * 100) : 0;
  const requiredClasses = currentPercentage >= 75 ? 0 : Math.ceil((0.75 * history.length - attended) / 0.25);
  const trend = Object.values(selectedHistory.reduce((result, row) => {
    result[row.date] = result[row.date] || { date: row.date, present: 0, total: 0 };
    result[row.date].total += 1; result[row.date].present += row.isPresent ? 1 : 0; return result;
  }, {})).map((row) => ({ ...row, percentage: Math.round(row.present / row.total * 100) }));
  const subjectSummary = subjects.map((item) => {
    const rows = history.filter((row) => row.code === item.code);
    return { ...item, percentage: rows.length ? Math.round(rows.filter((row) => row.isPresent).length / rows.length * 100) : 0, sessions: rows.length };
  }).filter((item) => item.sessions);
  const save = async () => { try { await saveAttendance(date, subject, present, hour); setMessage("Attendance saved successfully."); } catch (error) { setMessage(error.message); } };
  const copy = async () => {
    const source = attendance[date]?.[attendanceKey(subject, sourceHour)];
    if (!source) return setMessage("No source attendance exists for that hour.");
    const presentCount = Object.values(source).filter(Boolean).length;
    const confirmed = window.confirm(`Copy attendance from Hour ${sourceHour} to Hour ${destinationHour}?\n\nDate: ${date}\nSubject: ${subject}\nPresent: ${presentCount}\nAbsent: ${Object.keys(source).length - presentCount}`);
    if (!confirmed) return;
    try { await copyAttendance({ date, subjectCode: subject, sourceHour, destinationHour }); setMessage(`Attendance copied to Hour ${destinationHour}.`); } catch (error) {
      if (error.status === 409 && window.confirm(`${error.message}. Overwrite it?`)) { await copyAttendance({ date, subjectCode: subject, sourceHour, destinationHour, overwrite: true }); setMessage(`Attendance copied to Hour ${destinationHour}.`); } else setMessage(error.message);
    }
  };
  const download = async (path) => { try { await api.downloadAttendance(path); setMessage("Excel report downloaded."); } catch (error) { setMessage(error.message); } };

  return <div className="dashboard">
    <div className="page-header"><div><h1>Attendance</h1><p>Record attendance and explore detailed history.</p></div><div className="header-actions"><button className="secondary-button" onClick={() => download(`/attendance/export?date=${date}&subjectCode=${subject}`)}><Download size={16} /> Download Excel</button><button className="primary-button" onClick={save}><Check size={18} /> Save Attendance</button></div></div>
    <div className="dashboard-card"><div className="attendance-controls">
      <div><label>Subject</label><select className="filter-select" value={subject} onChange={(event) => setSubject(event.target.value)}><option value="All">All subjects</option>{subjects.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div>
      <div><label>Date to record</label><input type="date" className="filter-select" value={date} onChange={(event) => setDate(event.target.value)} /></div>
      <div><label>Hour</label><select className="filter-select" value={hour} onChange={(event) => setHour(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Hour {index + 1}</option>)}</select></div>
      <div><label>Year</label><select className="filter-select" value={year} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div><label>Section</label><select className="filter-select" value={section} onChange={(event) => setSection(event.target.value)}><option>All</option><option>A</option><option>B</option></select></div>
      <div><label>Student</label><select className="filter-select" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="All">All students</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><label>Status</label><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Present</option><option>Absent</option></select></div>
    </div><div className="action-row"><button className="secondary-button" onClick={() => setPresent((current) => ({ ...current, ...Object.fromEntries(filteredStudents.map((student) => [student.id, true])) }))}>Mark All Present</button><button className="secondary-button" onClick={() => setPresent((current) => ({ ...current, ...Object.fromEntries(filteredStudents.map((student) => [student.id, false])) }))}>Mark All Absent</button><button className="secondary-button" onClick={() => setPresent(Object.fromEntries(students.map((student) => [student.id, true])))}><RotateCcw size={15} /> Reset</button><span className="attendance-summary"><Users size={16} /> {counts.present} present · {counts.total - counts.present} absent · {counts.total ? Math.round(counts.present / counts.total * 100) : 0}%</span>{message && <span className="success-message">{message}</span>}</div>
    <div className="action-row copy-attendance"><strong><Copy size={15} /> Copy attendance</strong><select className="filter-select" value={sourceHour} onChange={(event) => setSourceHour(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Source Hour {index + 1}</option>)}</select><select className="filter-select" value={destinationHour} onChange={(event) => setDestinationHour(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Destination Hour {index + 1}</option>)}</select><button className="secondary-button" onClick={copy}>Copy Attendance</button><button className="secondary-button" onClick={() => download(`/attendance/low/export?threshold=75`)}>Low Attendance Excel</button></div>
      <div className="table-container"><table><thead><tr><th>Student</th><th>Year / Section</th><th>Faculty</th><th>Status</th></tr></thead><tbody>{filteredStudents.map((student) => <tr key={student.id} className={student.attendance < 75 ? "risk-row" : ""}><td>{student.id} · {student.name}</td><td>{student.year} · {student.section}</td><td>{subjects.find((item) => item.code === subject)?.faculty || "All faculty"}</td><td><label className="attendance-toggle"><input type="checkbox" checked={Boolean(present[student.id])} onChange={(event) => setPresent({ ...present, [student.id]: event.target.checked })} /><span>{present[student.id] ? "Present" : "Absent"}</span></label></td></tr>)}</tbody></table></div>
    </div>
    <div className="stats-grid"><div className="stat-card"><h3>Total Classes</h3><div className="stat-value">{history.length}</div><p className="stat-change">Filtered sessions</p></div><div className="stat-card"><h3>Attended</h3><div className="stat-value">{attended}</div><p className="stat-change">Present classes</p></div><div className="stat-card"><h3>Absent</h3><div className="stat-value">{absent}</div><p className="stat-change">Missed classes</p></div><div className="stat-card"><h3>Current %</h3><div className="stat-value">{currentPercentage}%</div><p className="stat-change">Classes required to reach 75%: {requiredClasses}</p></div></div>
    <div className="dashboard-card"><div className="card-header"><div><h2><History size={18} /> Attendance history</h2><p>Use date range to inspect saved records.</p></div><div className="attendance-controls"><input type="date" className="filter-select" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /><input type="date" className="filter-select" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={220}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="percentage" name="Attendance %" stroke="#2563eb" strokeWidth={3} /></LineChart></ResponsiveContainer></div><div className="table-container"><table><thead><tr><th>Date</th><th>Subject</th><th>Faculty</th><th>Student</th><th>Status</th></tr></thead><tbody>{history.slice(-20).reverse().map((row) => <tr key={`${row.date}-${row.code}-${row.student.id}`}><td>{row.date}</td><td>{row.code}</td><td>{subjects.find((item) => item.code === row.code)?.faculty}</td><td>{row.student.name}</td><td><span className={row.isPresent ? "attendance" : "attendance low"}>{row.isPresent ? "Present" : "Absent"}</span></td></tr>)}</tbody></table></div></div>
    <div className="dashboard-card"><h2>Subject-wise attendance</h2><div className="subject-grid">{subjectSummary.map((item) => <div className={`mini-card ${item.percentage < 75 ? "low-card" : ""}`} key={item.code}><strong>{item.code} · {item.name}</strong><span>{item.percentage}%</span><small>{item.sessions} records · {item.faculty}{item.percentage < 75 ? " · Low attendance" : ""}</small></div>)}</div></div>
  </div>;
}
export default Attendance;
