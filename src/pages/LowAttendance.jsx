import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { api } from "../services/api";

function LowAttendance() {
  const [threshold, setThreshold] = useState(75);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { setRows((await api.lowAttendance(threshold)).students); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    api.lowAttendance(threshold).then((result) => { if (active) setRows(result.students); }).catch((requestError) => { if (active) setError(requestError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [threshold]);
  const download = async () => { try { await api.downloadAttendance(`/attendance/low/export?threshold=${threshold}`); } catch (requestError) { setError(requestError.message); } };
  return <div className="dashboard"><div className="page-header"><div><h1>Low Attendance</h1><p>Students below the selected attendance threshold.</p></div><div className="header-actions"><label className="threshold-control">Below <input type="number" min="0" max="100" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />%</label><button className="secondary-button" onClick={download}><Download size={16} /> Download Excel</button><button className="primary-button" onClick={load}><RefreshCw size={16} /> Refresh</button></div></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="dashboard-card"><div className="table-container"><table><thead><tr><th>S.No</th><th>RRN</th><th>Student Name</th><th>Department</th><th>Year</th><th>Section</th><th>Total Classes</th><th>Present</th><th>Absent</th><th>Attendance %</th><th>Status</th></tr></thead><tbody>{rows.map((student, index) => <tr key={student.id} className="risk-row"><td>{index + 1}</td><td>{student.studentId}</td><td>{student.name}</td><td>{student.department}</td><td>{student.year}</td><td>{student.section}</td><td>{student.total}</td><td>{student.present}</td><td>{student.absent}</td><td><span className="attendance low">{student.percentage}%</span></td><td><span className="status-badge status-risk">{student.status}</span></td></tr>)}</tbody></table>{!loading && !rows.length && <div className="empty-state">No students are below {threshold}% attendance.</div>}{loading && <div className="loading-state">Loading attendance report...</div>}</div></div></div>;
}
export default LowAttendance;
