import { useMemo, useRef, useState } from "react";
import { Bot, Mic, Send, Volume2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

const today = () => new Date().toISOString().slice(0, 10);
const clean = (value) => value?.trim().replace(/[.,]$/, "");
const extract = (text, pattern) => clean(text.match(pattern)?.[1]);
const dateFromText = (text) => {
  const iso = text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const match = text.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (!match) return today();
  const month = new Date(`${match[2]} 1, ${match[3]}`).getMonth() + 1;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
};
const averageMarks = (marks, studentId) => {
  const row = marks[studentId];
  if (!row) return 0;
  const values = [Number(row.test1) / 25 * 100, Number(row.test2) / 25 * 100, Number(row.assignment) / 10 * 100].filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
};
const attendanceSummary = (attendance, studentId) => {
  const values = Object.values(attendance).flatMap((day) => Object.values(day).map((records) => records?.[studentId])).filter((value) => typeof value === "boolean");
  return values.length ? Math.round(values.filter(Boolean).length / values.length * 100) : 0;
};

function answerQuestion(input, students, subjects, marks, attendance) {
  const lower = input.toLowerCase();
  const threshold = Number(input.match(/(?:below|under|less than)\s*(\d+)/i)?.[1] || 75);
  const rows = students.map((student) => ({ ...student, attendance: attendanceSummary(attendance, student.id) || student.attendance || 0, marks: averageMarks(marks, student.id) }));
  const namedStudent = rows.find((student) => lower.includes(student.name.toLowerCase()) || lower.includes(student.id.toLowerCase()));
  const namedSubject = subjects.find((subject) => lower.includes(subject.code.toLowerCase()) || lower.includes(subject.name.toLowerCase()));
  if (namedSubject && (lower.includes("teacher") || lower.includes("faculty") || lower.includes("teach"))) {
    return `${namedSubject.code} ${namedSubject.name} is taught by ${namedSubject.faculty}, department ${namedSubject.department}, semester ${namedSubject.semester}.`;
  }
  if (lower.includes("best attendance") || lower.includes("highest attendance") || lower.includes("good attendance")) {
    const result = [...rows].sort((a, b) => b.attendance - a.attendance).slice(0, 3);
    return result.length ? `Best attendance: ${result.map((student) => `${student.name} (${student.attendance}%)`).join(", ")}.` : "There are no student attendance records.";
  }
  if (lower.includes("low attendance") || lower.includes("poor attendance") || lower.includes("attendance below") || lower.includes("at risk")) {
    const result = rows.filter((student) => student.attendance < threshold);
    if (!result.length) return `No students are below ${threshold}% attendance.`;
    return `${result.length} student${result.length === 1 ? " is" : "s are"} below ${threshold}% attendance: ${result.map((student) => `${student.name} (${student.id}, ${student.attendance}%)`).join(", ")}.`;
  }
  if (lower.includes("poor performance") || lower.includes("low marks") || lower.includes("weak performance") || lower.includes("failing")) {
    const result = rows.filter((student) => student.marks < 40);
    if (!result.length) return "No students are below 40% average marks.";
    return `Students below 40% average marks: ${result.map((student) => `${student.name} (${student.id}, ${student.marks}%)`).join(", ")}.`;
  }
  if (lower.includes("top") || lower.includes("best performer") || lower.includes("highest")) {
    const result = [...rows].sort((a, b) => b.marks - a.marks || b.attendance - a.attendance).slice(0, 3);
    return `Top performers by average marks: ${result.map((student) => `${student.name} (${student.marks}% marks, ${student.attendance}% attendance)`).join(", ")}.`;
  }
  if (namedStudent && (lower.includes("detail") || lower.includes("report") || lower.includes("performance") || lower.includes("attendance"))) {
    return `${namedStudent.name} (${namedStudent.id}) has ${namedStudent.attendance}% attendance and ${namedStudent.marks}% average marks. Department: ${namedStudent.department}; year: ${namedStudent.year}; section: ${namedStudent.section}.`;
  }
  if (lower.includes("how many") || lower.includes("number of") || lower.includes("count") || lower.includes("total")) {
    if (lower.includes("student")) return `There are ${students.length} students in the database.`;
    if (lower.includes("subject") || lower.includes("course")) return `There are ${subjects.length} subjects in the database.`;
  }
  if (lower.includes("list") && lower.includes("student")) {
    return students.length ? `Students: ${rows.map((student) => `${student.name} (${student.id})`).join(", ")}.` : "There are no students in the database.";
  }
  if (lower.includes("list") && (lower.includes("subject") || lower.includes("course"))) {
    return subjects.length ? `Subjects: ${subjects.map((subject) => `${subject.code} ${subject.name} with ${subject.faculty}`).join(", ")}.` : "There are no subjects in the database.";
  }
  if (lower.includes("average") || lower.includes("overall") || lower.includes("summary") || lower.includes("report")) {
    const attendanceAverage = Math.round(rows.reduce((sum, student) => sum + student.attendance, 0) / (rows.length || 1));
    const marksAverage = Math.round(rows.reduce((sum, student) => sum + student.marks, 0) / (rows.length || 1));
    return `Report summary: ${students.length} students, ${subjects.length} subjects, average attendance ${attendanceAverage}%, average marks ${marksAverage}%, and ${rows.filter((student) => student.attendance < 75 || student.marks < 40).length} students needing attention.`;
  }
  return null;
}

function parseCommand(input, students, subjects) {
  const text = input.trim();
  const lower = text.toLowerCase();
  if (lower.includes("add") && lower.includes("student")) {
    const id = extract(text, /(?:id|student\s*id)\s*[:#-]?\s*([\w-]+)/i);
    const email = extract(text, /([\w.+-]+@[\w.-]+\.[a-z]{2,})/i);
    const phone = extract(text, /(?:phone|mobile|number)\s*[:#-]?\s*(\+?[\d -]{10,15})/i);
    const name = extract(text, /(?:student\s+)([a-z][a-z .'-]+?)(?=\s*[,;:]?\s+(?:id|email|phone|department|year|section)\b|$)/i);
    const department = extract(text, /(?:department|dept)\s*[:=-]?\s*(CSE|ECE|EEE|MECH)/i) || "CSE";
    const year = extract(text, /year\s*[:=-]?\s*((?:1st|2nd|3rd|4th)\s*year)/i) || "1st Year";
    const section = extract(text, /section\s*[:=-]?\s*([AB])/i) || "A";
    if (!id || !name || !email || !phone) return { error: "To add a student, include name, ID, email, and phone." };
    return { type: "student", data: { id, name, email, phone: phone.replace(/[ -]/g, ""), dateOfBirth: "", gender: "Prefer not to say", department, year, section, address: "", admissionYear: String(new Date().getFullYear()) } };
  }
  if (lower.includes("add") && (lower.includes("subject") || lower.includes("teacher"))) {
    const code = extract(text, /(?:code|subject\s*code)\s*[:#-]?\s*([A-Z]{2,5}\d{2,4})/i);
    const name = extract(text, /(?:subject\s+)([a-z][a-z0-9 &'/-]+?)(?=\s*[,;:]?\s+(?:code|teacher|faculty|credits|semester|department)\b|$)/i);
    const faculty = extract(text, /(?:teacher|faculty)\s*[,;:]?\s*([a-z][a-z .'-]+?)(?=\s*[,;:]?\s+(?:credits|semester|department)\b|$)/i);
    const credits = Number(extract(text, /credits?\s*[:=-]?\s*(\d+)/i) || 4);
    const semester = extract(text, /semester\s*[:=-]?\s*([\w-]+)/i) || "1";
    const department = extract(text, /(?:department|dept)\s*[:=-]?\s*(CSE|ECE|EEE|MECH)/i) || "CSE";
    if (!code || !name || !faculty) return { error: "To add a subject, include subject name, code, and teacher." };
    return { type: "subject", data: { code, name, faculty, credits, semester, department } };
  }
  if (lower.includes("attendance") || lower.includes("present") || lower.includes("absent")) {
    const studentId = extract(text, /(?:student\s*(?:id)?|for\s+student)\s*[,;:#-]?\s*([A-Z0-9][A-Z0-9-]{2,})/i) || students.find((student) => lower.includes(student.name.toLowerCase()))?.id;
    const subjectCode = extract(text, /(?:subject|course)\s*(?:code)?\s*[,;:#-]?\s*([A-Z0-9][A-Z0-9-]{2,})/i) || subjects.find((subject) => lower.includes(subject.code.toLowerCase()))?.code;
    const date = extract(text, /(?:on|date)\s*[:=-]?\s*(\d{4}-\d{2}-\d{2})/i) || today();
    const present = !lower.includes("absent") && !lower.includes("not present");
    if (!studentId || !subjectCode) return { error: "To mark attendance, include student ID, subject code, and present or absent." };
    return { type: "attendance", data: { studentId, subjectCode, date, present } };
  }
  return { error: "I can add a student, add a subject with a teacher, or mark attendance. Try: 'Add student Arun, id CSE010, email arun@example.com, phone 9876543210'." };
}

function Assistant() {
  const { students, subjects, marks, attendance, saveStudent, saveSubject, saveAttendance, setStudents, setSubjects } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi. I can add students, add subjects and teachers, or mark attendance." }]);
  const [pendingCopy, setPendingCopy] = useState(null);
  const navigate = useNavigate();
  const recognition = useRef(null);
  const supported = useMemo(() => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition), []);
  const speak = (text) => { if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); };
  const reply = (text, error = false) => { setMessages((current) => [...current, { role: "assistant", text, error }]); speak(text); };
  const confirmCopy = async () => {
    if (!pendingCopy) return;
    try { await api.copyAttendance(pendingCopy); reply(`Attendance copied from Hour ${pendingCopy.sourceHour} to Hour ${pendingCopy.destinationHour}.`); } catch (error) { reply(error.message, true); }
    setPendingCopy(null);
  };
  const run = async (value = input) => {
    if (!value.trim()) return;
    setMessages((current) => [...current, { role: "user", text: value }]);
    setInput("");
    try {
      const lower = value.toLowerCase();
      if (lower.includes("copy") && lower.includes("attendance")) {
        const sourceHour = Number(value.match(/(?:from|source)\s+(?:hour\s*)?(\d+)/i)?.[1]);
        const destinationHour = Number(value.match(/(?:to|destination)\s+(?:hour\s*)?(\d+)/i)?.[1]);
        const subjectCode = value.match(/\b[A-Z]{2,5}\d{2,4}\b/i)?.[0]?.toUpperCase();
        if (!sourceHour || !destinationHour || !subjectCode) throw new Error("Include date, subject code, source hour, and destination hour to copy attendance.");
        const pending = { date: dateFromText(value), subjectCode, sourceHour, destinationHour };
        setPendingCopy(pending);
        setMessages((current) => [...current, { role: "assistant", text: `I found a request to copy ${subjectCode} attendance on ${pending.date} from Hour ${sourceHour} to Hour ${destinationHour}. Confirm the copy to continue.` }]);
        return;
      }
      if (lower.includes("export") || lower.includes("excel") || lower.includes("download")) {
        const date = dateFromText(value);
        const path = lower.includes("low attendance") || lower.includes("low-attendance") ? `/attendance/low/export?threshold=${Number(value.match(/(?:below|under)\s*(\d+)/i)?.[1] || 75)}` : `/attendance/export?date=${date}${value.match(/\b[A-Z]{2,5}\d{2,4}\b/i) ? `&subjectCode=${value.match(/\b[A-Z]{2,5}\d{2,4}\b/i)[0].toUpperCase()}` : ""}`;
        await api.downloadAttendance(path);
        reply("The Excel report was generated and downloaded.");
        return;
      }
      if (lower.includes("find ") || lower.includes("search ") || lower.includes("show students named") || lower.includes("rrn")) {
        const query = value.replace(/.*?(?:find|search|named|rrn)\s*/i, "").trim();
        const found = await api.searchStudents(query);
        if (!found.length) { reply(`No students were found for "${query}".`); return; }
        const response = `${found.length} student${found.length === 1 ? "" : "s"} found: ${found.map((student) => `${student.name} — RRN ${student.studentId}`).join(", ")}.`;
        setMessages((current) => [...current, { role: "assistant", text: response, results: found }]); speak(response); return;
      }
      if (lower.includes("low attendance") || lower.includes("poor attendance") || lower.includes("below") && lower.includes("attendance")) {
        const threshold = Number(value.match(/(?:below|under|less than)\s*(\d+)/i)?.[1] || 75);
        const result = await api.lowAttendance(threshold);
        reply(result.count ? `${result.count} student${result.count === 1 ? " is" : "s are"} below ${threshold}% attendance: ${result.students.map((student) => `${student.name} (${student.studentId}, ${student.percentage}%)`).join(", ")}.` : `No students are below ${threshold}% attendance.`);
        return;
      }
      if (lower.includes("today") && lower.includes("attendance") || lower.includes("attendance sheet for")) {
        const date = dateFromText(value); const report = await api.attendanceByDate(date);
        const values = report.records.flatMap((row) => Object.values(row.records || {})); const present = values.filter(Boolean).length;
        reply(`${report.records.length} attendance record${report.records.length === 1 ? "" : "s"} found for ${date}. Present: ${present}; absent: ${values.length - present}.`);
        return;
      }
      const answer = answerQuestion(value, students, subjects, marks, attendance);
      if (answer) {
        setMessages((current) => [...current, { role: "assistant", text: answer }]);
        speak(answer);
        return;
      }
      const command = parseCommand(value, students, subjects);
      if (command.error) throw new Error(command.error);
      if (command.type === "student") {
        if (students.some((student) => student.id.toLowerCase() === command.data.id.toLowerCase())) throw new Error("That student ID already exists.");
        const saved = await saveStudent({ ...command.data, attendance: 100 });
        setStudents((current) => [...current, { ...command.data, ...saved, id: command.data.id, attendance: 100 }]);
        const response = `Student ${command.data.name} was added successfully.`;
        reply(response); return;
      }
      if (command.type === "subject") {
        if (subjects.some((subject) => subject.code.toLowerCase() === command.data.code.toLowerCase())) throw new Error("That subject code already exists.");
        const saved = await saveSubject(command.data);
        setSubjects((current) => [...current, { ...command.data, ...saved }]);
        const response = `Subject ${command.data.name} and teacher ${command.data.faculty} were added successfully.`;
        reply(response); return;
      }
      const existing = await api.get(`/attendance?date=${command.data.date}&subjectCode=${command.data.subjectCode}`);
      const records = existing[0] ? { ...(existing[0].records || {}), [command.data.studentId]: command.data.present } : { [command.data.studentId]: command.data.present };
      await saveAttendance(command.data.date, command.data.subjectCode, records);
      const response = `Attendance marked ${command.data.present ? "present" : "absent"} for ${command.data.studentId} in ${command.data.subjectCode}.`;
      reply(response);
    } catch (error) {
      const response = error.message || "I could not complete that request.";
      reply(response, true);
    }
  };
  const startVoice = () => {
    if (!supported) return setMessages((current) => [...current, { role: "assistant", text: "Voice input is not supported in this browser. Use Chrome or Edge." }]);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    recognition.current.onresult = (event) => { const value = event.results[0][0].transcript; setInput(value); run(value); };
    recognition.current.onend = () => setListening(false);
    recognition.current.onerror = () => setListening(false);
    recognition.current.start();
    setListening(true);
  };
  return <>
    <button className="assistant-launcher" onClick={() => setOpen(true)} title="Open AI assistant"><Bot size={20} /><span>AI assistant</span></button>
    {open && <aside className="assistant-panel"><div className="assistant-header"><div><strong>Admin assistant</strong><small><span className="assistant-ready-dot" /> Online · actions use live database data</small></div><button onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18} /></button></div><div className="assistant-suggestions"><button onClick={() => setInput("Show students with low attendance")}>Low attendance</button><button onClick={() => setInput("Give me a report summary")}>Report summary</button><button onClick={() => navigate("/low-attendance")}>Open report</button></div><div className="assistant-messages">{messages.map((message, index) => <div className={`assistant-message ${message.role} ${message.error ? "error" : ""}`} key={`${message.role}-${index}`}>{message.text}{message.results?.map((student) => <button className="assistant-result" key={student.id} onClick={() => navigate(`/students?search=${encodeURIComponent(student.name)}`)}>{student.name} · {student.studentId}</button>)}</div>)}{pendingCopy && <div className="assistant-confirm"><strong>Confirm attendance copy</strong><span>{pendingCopy.date} · {pendingCopy.subjectCode} · Hour {pendingCopy.sourceHour} to Hour {pendingCopy.destinationHour}</span><div><button onClick={confirmCopy}>Confirm Copy</button><button onClick={() => setPendingCopy(null)}>Cancel</button></div></div>}</div><div className="assistant-input"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); run(); } }} placeholder="Ask about students, attendance, reports..." rows="2" /><button onClick={startVoice} className={listening ? "listening" : ""} title={supported ? "Speak command" : "Voice unavailable"}><Mic size={18} /></button><button onClick={() => run()} title="Send command"><Send size={18} /></button></div><div className="assistant-footer"><Volume2 size={14} /> Voice replies are enabled</div></aside>}
  </>;
}

export default Assistant;