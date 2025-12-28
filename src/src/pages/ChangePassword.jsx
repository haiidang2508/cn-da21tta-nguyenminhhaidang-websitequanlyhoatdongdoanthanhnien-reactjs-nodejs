import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword, logout } from "../services/authService";
import { adminLogout } from "../services/adminAuthService";
import { useNotify } from "../contexts/notifyContext";
import TVULogo from "../assets/Logo_Trường_Đại_học_Trà_Vinh.png";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  // show/hide password toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const notify = useNotify();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirm) { notify('Vui lòng điền đầy đủ', 'error'); return; }
    if (newPassword.length < 6) { notify('Mật khẩu mới phải có ít nhất 6 ký tự', 'error'); return; }
    if (newPassword !== confirm) { notify('Mật khẩu mới và xác nhận không khớp', 'error'); return; }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      notify('Đổi mật khẩu thành công. Vui lòng đăng nhập lại', 'success');
      // Clear both user and admin sessions to be safe
      try { adminLogout(); } catch (e) {}
      try { logout(); } catch (e) {}
      nav('/login');
    } catch (err) {
      notify(err.message || 'Đổi mật khẩu thất bại', 'error');
    } finally { setLoading(false); }
  }

  return (
    <div className="card auth">
      <h1 className="h1 auth-title">Đổi mật khẩu</h1>

      <div className="auth-grid">
        <div className="auth-logo">
          <img src={TVULogo} alt="Trường Đại học Trà Vinh" />
        </div>

        <div className="auth-body">
          <form className="form" onSubmit={onSubmit}>
            <label className="label">
              Mật khẩu hiện tại
          <div className="input-with-toggle">
            <input className="input" type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <button type="button" className="pwd-toggle" onClick={() => setShowCurrent(s => !s)} aria-label={showCurrent ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
              {showCurrent ? '🙈' : '👁️'}
            </button>
          </div>
            </label>
            <label className="label">
              Mật khẩu mới
          <div className="input-with-toggle">
            <input className="input" type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <button type="button" className="pwd-toggle" onClick={() => setShowNew(s => !s)} aria-label={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
              {showNew ? '🙈' : '👁️'}
            </button>
          </div>
            </label>
            <label className="label">
              Xác nhận mật khẩu mới
          <div className="input-with-toggle">
            <input className="input" type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <button type="button" className="pwd-toggle" onClick={() => setShowConfirm(s => !s)} aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
            </label>
            <button className="btn btn-full" type="submit" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
