import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import TVULogo from "../assets/Logo_Trường_Đại_học_Trà_Vinh.png";

export default function Register() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    studentId: "",
    chiDoan: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (form.password !== form.confirmPassword) {
      setErr("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);
    try {
      // Note: chiDoan is kept client-side only (not sent to server / database)
      await register({
        fullName: form.fullName,
        studentId: form.studentId,
        email: form.email,
        password: form.password,
      });

      // Persist chiDoan locally so we can use it in the UI if needed
      if (form.chiDoan) localStorage.setItem('chiDoan', form.chiDoan);

      alert("🎉 Đăng ký thành công! Vui lòng đăng nhập.");
      nav("/login");
    } catch (error) {
      setErr(error.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth">
      <h1 className="h1 auth-title">Đăng ký tài khoản</h1>

      <div className="auth-grid">
        <div className="auth-logo">
          <img src={TVULogo} alt="Trường Đại học Trà Vinh" />
        </div>

        <div className="auth-body">

          <form onSubmit={onSubmit} className="form">
            <label className="label">
              Họ và tên
              <input
                className="input"
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                placeholder="Nguyễn Văn A"
                required
                autoFocus
              />
            </label>

            <label className="label">
              MSSV
              <input
                className="input"
                name="studentId"
                value={form.studentId}
                onChange={onChange}
                placeholder="1101xxxx"
                required
              />
            </label>

            <label className="label">
              Email
              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@st.tvu.edu.vn"
                required
              />
            </label>

        <label className="label">
          Chi đoàn
          <input
            className="input"
            name="chiDoan"
            value={form.chiDoan}
            onChange={onChange}
            placeholder="Tên chi đoàn"
          />
        </label>

        <div className="two-cols">
          <label className="label">
            Mật khẩu
            <div className="input-with-toggle">
              <input
                className="input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                required
              />
              <button type="button" className="pwd-toggle" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          <label className="label">
            Nhập lại
            <input
              className="input"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={onChange}
              placeholder="••••••••"
              required
            />
          </label>
        </div>

            {err && <div className="notice">{err}</div>}

            <button className="btn btn-full" type="submit" disabled={loading}>
              {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
          </form>

          <div className="help-small muted" style={{ marginTop: 10 }}>
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
