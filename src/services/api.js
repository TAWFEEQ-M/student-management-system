const API_URL = import.meta.env.VITE_API_URL || "/api";
const request = async (path, options = {}) => {
  const token = localStorage.getItem("sms_token");
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = new Error((await response.json().catch(() => ({}))).message || "Request failed");
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
};
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  searchStudents: (query) => request(`/students/search?q=${encodeURIComponent(query)}`),
  lowAttendance: (threshold = 75, filters = {}) => request(`/attendance/low?${new URLSearchParams({ threshold, ...filters })}`),
  attendanceByDate: (date, filters = {}) => request(`/attendance/date?${new URLSearchParams({ date, ...filters })}`),
  copyAttendance: (body) => request("/attendance/copy", { method: "POST", body: JSON.stringify(body) }),
  downloadAttendance: async (path) => {
    const token = localStorage.getItem("sms_token");
    const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Unable to download report");
    const blob = await response.blob();
    const filename = response.headers.get("Content-Disposition")?.match(/filename=([^;]+)/i)?.[1]?.replace(/"/g, "") || "attendance-report.xlsx";
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  },
};
export const normalizeStudent = (student) => ({ ...student, id: student.studentId || student.id });
