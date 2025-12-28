import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { adminLogin } from "../services/adminAuthService";
import TVULogo from "../assets/Logo_Trường_Đại_học_Trà_Vinh.png";

export default function Login() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState(""); // email or studentId
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const admin = await adminLogin({ emailOrStudentId: identifier, password });
      // For secretary accounts, keep them in the public/user interface and show a
      // "Chi đoàn" menu item to access management when needed.
      if (admin?.role === 'secretary') {
        nav('/');
      } else {
        nav('/admin');
      }
      return;
    } catch {}

    try {
      await login({ emailOrStudentId: identifier, password });
      nav("/activities"); // user area
    } catch (userErr) {
      setErr(userErr.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card auth">
      <h1 className="h1 auth-title">Đăng nhập</h1>

      <div className="auth-grid">
        <div className="auth-logo">
          <img src={TVULogo} alt="Trường Đại học Trà Vinh" />
        </div>

        <div className="auth-body">

          <form className="form" onSubmit={onSubmit}>
            <label className="label">
              Email hoặc MSSV
              <input
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email hoặc MSSV (vd: abc@tvu.edu.vn hoặc 12345678)"
                required
                autoFocus
              />
            </label>

            <label className="label">
              Mật khẩu
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </label>

            {err && <div className="notice">{err}</div>}

            <button className="btn btn-full" disabled={loading} type="submit">
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="help-small muted">
            Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
