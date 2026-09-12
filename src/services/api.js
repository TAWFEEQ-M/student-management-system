const API_URL = import.meta.env.VITE_API_URL || "/api";
const request = async (path, options = {}) => {
  const token = localStorage.getItem("sms_token");
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Request failed");
  return response.status === 204 ? null : response.json();
};
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};
export const normalizeStudent = (student) => ({ ...student, id: student.studentId || student.id });
