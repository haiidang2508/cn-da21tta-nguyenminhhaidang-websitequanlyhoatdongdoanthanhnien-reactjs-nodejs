import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../services/adminAuthService";

export default function AdminLogin() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    emailOrStudentId: "",
    password: "",
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await adminLogin(form);
      nav("/admin");
    } catch (err) {
      setErr(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth adminAuth">
      <div className="adminAuthHeader">
        <h1 className="h1">Đăng nhập quản trị</h1>
        <span className="adminBadge">ADMIN</span>
      </div>
      <p className="muted">Chỉ dành cho Admin.</p>

      <form onSubmit={onSubmit} className="form">
        <label className="label">
          Email hoặc MSSV
          <input
            className="input"
            name="emailOrStudentId"
            value={form.emailOrStudentId}
            onChange={onChange}
            placeholder="admin@tvu.edu.vn hoặc MSSV"
            required
          />
        </label>

        <label className="label">
          Mật khẩu
          <input
            className="input"
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder="••••••••"
            required
          />
        </label>

        {err && <div className="notice">{err}</div>}

        <button className="btn btn-full" type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button type="button" className="btn btn-outline" onClick={() => nav('/')}>Trở về trang chính</button>
        </div>
      </form>
    </div>
  );
}
