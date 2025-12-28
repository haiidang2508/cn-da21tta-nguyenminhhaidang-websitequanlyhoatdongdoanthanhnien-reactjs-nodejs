import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "../services/authService"; 
import { getAdminUser } from "../services/adminApi";
import { adminLogout } from "../services/adminAuthService";
// nếu bạn không có getUser/logout trong authService thì xem mục (2)

export default function UserMenu({ hideDropdown = false }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Chi đoàn is stored client-side only (persisted from Register form)
  const [chiDoan, setChiDoan] = useState(() => {
    try { return localStorage.getItem("chiDoan") || ""; } catch { return ""; }
  });

  const user = getUser(); // { fullName, email, studentId, ... }
  const adminUser = getAdminUser(); // if logged in via admin area (admin or secretary)

  // prefer adminUser (secretary/admin) over regular user when present
  const effectiveUser = adminUser || user;

  // Keep chiDoan in sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "chiDoan") {
        setChiDoan(e.newValue || "");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // If nobody is logged in, render nothing (check after hooks to satisfy lint rules)
  if (!effectiveUser) return null;

  const displayName = (effectiveUser?.fullName || effectiveUser?.email || "User");

  const onLogout = () => {
    // if logged in as admin/secretary use adminLogout, else regular logout
    if (adminUser) {
      adminLogout();
    } else {
      logout();
    }
    setOpen(false);
    nav("/login");
  };

  return (
    <div className="userMenu" ref={wrapRef}>
      <button
        className="userBtn"
        type="button"
        onClick={() => { if (!hideDropdown) setOpen((v) => !v); }}
        aria-haspopup={hideDropdown ? false : "menu"}
        aria-expanded={hideDropdown ? false : open}
      >
        <span className="userAvatar">{(displayName[0] || "U").toUpperCase()}</span>
        <span className="userName">{displayName}</span>
        {!hideDropdown && <span className="userCaret">▾</span>}
      </button>

      {open && !hideDropdown && (
        <div className="userDropdown" role="menu">
          <div className="userMeta">
            <div className="userMetaName">{displayName}</div>
            <div className="userMetaEmail">{effectiveUser?.email}</div>
            {chiDoan && <div className="userMetaChiDoan">Chi đoàn: {chiDoan}</div>}
            {/* Show secretary role and quick link when adminUser is a secretary */}
            {adminUser?.role === 'secretary' && (
              <div style={{ marginTop: 8 }}>
                <Link to="/secretary" className="userItem" onClick={() => setOpen(false)}>
                  Chi đoàn
                </Link>
              </div>
            )} 

            <div style={{ marginTop: 8 }}>
              <Link to="/change-password" className="userItem" onClick={() => setOpen(false)}>
                Đổi mật khẩu
              </Link>
            </div>
          </div>

          <button className="userItem danger" type="button" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
