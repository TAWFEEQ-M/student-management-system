import { useState } from "react";
import { GraduationCap, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
      localStorage.removeItem("sms_token");
    } finally {
      setLoading(false);
    }
  };
  return <main className="login-page"><div className="login-card"><div className="login-brand"><GraduationCap size={30} /><span>StudentHub</span></div><h1>Admin sign in</h1><p>Sign in to manage students, attendance, marks and reports.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary-button" disabled={loading}>{loading ? "Signing in..." : <><LogIn size={17} /> Sign in</>}</button></form></div></main>;
}
export default Login;
