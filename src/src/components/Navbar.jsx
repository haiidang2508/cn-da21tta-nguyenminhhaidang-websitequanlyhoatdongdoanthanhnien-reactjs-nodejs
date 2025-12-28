import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import UserMenu from "./UserMenu";
import { getUser } from "../services/authService";
import { getAdminToken, getAdminUser } from "../services/adminApi";

const linkClass = ({ isActive }) => (isActive ? "nav2-link active" : "nav2-link");

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const [adminToken, setAdminToken] = useState(getAdminToken());
  const [adminUser, setAdminUser] = useState(getAdminUser());

  useEffect(() => {
    setAdminToken(getAdminToken());
    setAdminUser(getAdminUser());
  }, [location]);

  useEffect(() => {
    const handler = () => {
      setAdminToken(getAdminToken());
      setAdminUser(getAdminUser());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const menu = useMemo(() => {
    const base = [
      { to: "/", label: "TRANG CHỦ" },
      { to: "/activities", label: "HOẠT ĐỘNG" },
      { to: "/my-activities", label: "HOẠT ĐỘNG ĐÃ ĐĂNG KÝ" },
      { to: "/documents", label: "VĂN BẢN" },
      { to: "/forms", label: "BIỂU MẪU" },
    ];

    // If an admin is logged in, show the full admin area link
    if (adminUser?.role === "admin") return [...base, { to: "/admin", label: "QUẢN TRỊ" }];

    // If a secretary is logged in, show a specific management link in the main menu
    if (adminUser?.role === "secretary") return [...base, { to: "/secretary", label: "CHI ĐOÀN" }];

    return base;
  }, [adminUser]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const user = getUser();
  // prefer adminUser (admin or secretary) over regular user when determining logged-in state
  const effectiveUser = adminUser || user;
  const isAdminPath = location.pathname.startsWith("/admin");

  // ✅ Sau khi gọi hết hooks mới được return
  if (isAdminPath) return null;

  return (
    <nav className="nav2">
      <div className="container nav2-inner">
        <button
          type="button"
          className="nav2-toggle"
          aria-label="Mở menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>

        <div className={`nav2-menu ${open ? "open" : ""}`}>
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="nav2-actions">
          {!effectiveUser ? (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? "nav2-btn active" : "nav2-btn")}
              >
                Đăng nhập
              </NavLink>

              <NavLink
                to="/register"
                className={({ isActive }) =>
                  isActive ? "nav2-btn nav2-btn-outline active" : "nav2-btn nav2-btn-outline"
                }
              >
                Đăng ký
              </NavLink>
            </>
          ) : (
            <UserMenu />
          )}
        </div>
      </div>
    </nav>
  );
}
