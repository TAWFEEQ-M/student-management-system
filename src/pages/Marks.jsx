import { useMemo, useState } from "react";
import { Save, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { examMaxMarks, examTypes } from "../data/mockData";
import { useApp } from "../context/AppContext";

const fields = ["test1", "test2", "assignment", "practical", "final"];
const grade = (value) => value >= 90 ? "A+" : value >= 80 ? "A" : value >= 70 ? "B+" : value >= 60 ? "B" : value >= 50 ? "C" : value >= 40 ? "D" : "F";

function Marks() {
  const { students, subjects, assessmentMarks, setAssessmentMarks, setMarks, saveMarks } = useApp();
  const [subject, setSubject] = useState(subjects[0]?.code || "");
  const [exam, setExam] = useState(examTypes[0]);
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [semester, setSemester] = useState("All");
  const [studentId, setStudentId] = useState("All");
  const [draft, setDraft] = useState(assessmentMarks);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const maxMarks = examMaxMarks[exam];
  const activeFields = fields.filter((field) => maxMarks[field]);
  const selected = useMemo(() => students.filter((student) => (year === "All" || student.year === year) && (section === "All" || student.section === section) && (studentId === "All" || student.id === studentId)), [students, year, section, studentId]);
  const score = (student, examName = exam, subjectCode = subject) => {
    const row = draft[student.id]?.[subjectCode]?.[examName] || {};
    const total = activeFields.reduce((sum, field) => sum + Number(row[field] || 0), 0);
    const maximum = activeFields.reduce((sum, field) => sum + maxMarks[field], 0);
    return { ...row, total, maximum, percentage: Math.round(total / maximum * 100), grade: grade(total / maximum * 100), passed: total / maximum * 100 >= 40 };
  };
  const rows = selected.map((student) => ({ student, result: score(student) }));
  const update = (id, field, value) => setDraft((current) => ({ ...current, [id]: { ...current[id], [subject]: { ...current[id]?.[subject], [exam]: { ...current[id]?.[subject]?.[exam], [field]: value } } } }));
  const save = () => {
    const invalid = rows.some(({ result }) => activeFields.some((field) => result[field] === "" || Number(result[field]) < 0 || Number(result[field]) > maxMarks[field]));
    if (invalid) { setError("Enter valid marks within each field's maximum."); return; }
    setAssessmentMarks(draft);
    saveMarks(rows.map(({ student, result }) => ({ studentId: student.id, subjectCode: subject, exam, scores: Object.fromEntries(activeFields.map((field) => [field, Number(result[field] || 0)])) })));
    setMarks((current) => Object.fromEntries(students.map((student) => [student.id, { test1: Number(draft[student.id]?.[subject]?.[exam]?.test1 || current[student.id]?.test1 || 0), test2: Number(draft[student.id]?.[subject]?.[exam]?.test2 || current[student.id]?.test2 || 0), assignment: Number(draft[student.id]?.[subject]?.[exam]?.assignment || current[student.id]?.assignment || 0) }])));
    setError(""); setSaved(`${exam} marks saved for ${subject}.`);
  };
  const performance = students.map((student) => {
    const results = subjects.map((item) => score(student, exam, item.code).percentage);
    return { name: student.name.split(" ")[0], percentage: Math.round(results.reduce((sum, value) => sum + value, 0) / results.length) };
  }).sort((a, b) => b.percentage - a.percentage);
  const improvement = performance.map((item, index) => ({ ...item, change: (index % 3) * 4 + 2 })).sort((a, b) => b.change - a.change).slice(0, 4);

  return <div className="dashboard"><div className="page-header"><div><h1>Marks</h1><p>Manage five exam types with validation and performance analysis.</p></div><button className="primary-button" onClick={save}><Save size={18} /> Save Marks</button></div>
    <div className="dashboard-card"><div className="attendance-controls"><div><label>Subject</label><select className="filter-select" value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div><div><label>Exam</label><select className="filter-select" value={exam} onChange={(event) => setExam(event.target.value)}>{examTypes.map((item) => <option key={item}>{item}</option>)}</select></div><div><label>Year</label><select className="filter-select" value={year} onChange={(event) => setYear(event.target.value)}><option>All</option>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map((item) => <option key={item}>{item}</option>)}</select></div><div><label>Section</label><select className="filter-select" value={section} onChange={(event) => setSection(event.target.value)}><option>All</option><option>A</option><option>B</option></select></div><div><label>Semester</label><select className="filter-select" value={semester} onChange={(event) => setSemester(event.target.value)}><option>All</option>{[...new Set(subjects.map((item) => item.semester))].map((item) => <option key={item}>{item}</option>)}</select></div><div><label>Student</label><select className="filter-select" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option>All</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>{error && <div className="form-error">{error}</div>}{saved && <p className="success-message">{saved}</p>}<div className="table-container"><table><thead><tr><th>Student</th>{activeFields.map((field) => <th key={field}>{field} / {maxMarks[field]}</th>)}<th>Total / {rows[0]?.result.maximum || 0}</th><th>% / Grade</th><th>Result</th></tr></thead><tbody>{rows.map(({ student, result }) => <tr key={student.id}><td>{student.id} · {student.name}</td>{activeFields.map((field) => <td key={field}><input className="marks-input" type="number" min="0" max={maxMarks[field]} value={result[field] ?? ""} onChange={(event) => update(student.id, field, event.target.value)} /></td>)}<td>{result.total}</td><td>{result.percentage}% · {result.grade}</td><td><span className={result.passed ? "attendance" : "attendance low"}>{result.passed ? "Pass" : "Fail"}</span></td></tr>)}</tbody></table></div></div>
    <div className="dashboard-grid"><div className="dashboard-card"><div className="card-header"><h2>Student performance</h2><TrendingUp size={18} /></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={250}><BarChart data={performance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="percentage" name={`${exam} %`} fill="#2563eb" /></BarChart></ResponsiveContainer></div></div><div className="dashboard-card"><h2>Top performers</h2>{performance.slice(0, 5).map((item) => <div className="history-row" key={item.name}><span>{item.name}</span><strong>{item.percentage}%</strong></div>)}</div></div>
    <div className="dashboard-card"><h2>Improvement list</h2><div className="subject-grid">{improvement.map((item) => <div className="mini-card" key={item.name}><strong>{item.name}</strong><span>+{item.change}%</span><small>Focus on next assessment</small></div>)}</div></div>
  </div>;
}
export default Marks;
