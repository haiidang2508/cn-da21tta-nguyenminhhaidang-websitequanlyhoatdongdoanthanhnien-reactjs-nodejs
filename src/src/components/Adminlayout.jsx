import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { getAdminToken, getAdminUser, clearAdminAuth } from "../services/adminApi";
import Header from "./Header";
import Footer from "./Footer";
import { useState, useRef, useEffect } from "react";
import "../styles/admin.css";
import { NotifyProvider } from "../contexts/notifyContext";

export default function AdminLayout() {
  const token = getAdminToken();
  const admin = getAdminUser();
  const nav = useNavigate();

  // Nếu không có token admin => chuyển tới trang đăng nhập chung `/login`
  if (!token) return <Navigate to="/login" replace />;

  const onLogout = () => {
    clearAdminAuth();
    nav('/login');
  };

  function AdminUserMenu({ admin, onLogout }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
      const onDocClick = (e) => {
        if (!wrapRef.current) return;
        if (!wrapRef.current.contains(e.target)) setOpen(false);
      };
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onDocClick);
        document.removeEventListener('keydown', onKey);
      };
    }, []);

    return (
      <div className="adminUserMenu" ref={wrapRef}>
        <button
          className="adminUserBtn"
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((s) => !s)}
        >
          <div className="adminAvatar">{(admin?.fullName?.[0] || 'A').toUpperCase()}</div>
          <div className="adminName">{admin?.fullName || admin?.email}</div>
          <div className="adminCaret">▾</div>
        </button>

        {open && (
          <div className="adminUserDropdown" role="menu">
            <div className="adminUserMeta">
              <div className="adminUserMetaName">{admin?.fullName}</div>
              <div className="adminUserMetaEmail muted">{admin?.email}</div>
            </div>

            <div className="adminUserActions">
              <button type="button" className="userItem" onClick={() => { setOpen(false); onLogout(); }}>Đăng xuất</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <NotifyProvider>
      <div>
      {/* Main site header (matching public site) */}
      <Header admin />

      <div className="adminShell">
        <aside className="adminSide">
          <div className="brandTitle">Danh mục quản lý</div>

          <nav className="adminNav" aria-label="Admin navigation">
            <NavLink to="/admin" end className={({isActive})=>isActive? 'active' : ''}>
              <span className="navLinkInner"><span className="navIcon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8v-10h-8v10zM13 3v6h8V3h-8z"/></svg>
              </span><span>Dashboard</span></span>
            </NavLink>

            <NavLink to="/admin/users" className={({isActive})=>isActive? 'active' : ''}>
              <span className="navLinkInner"><span className="navIcon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
              </span><span>Người dùng</span></span>
            </NavLink>

            <NavLink to="/admin/activities" className={({isActive})=>isActive? 'active' : ''}>
              <span className="navLinkInner"><span className="navIcon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
              </span><span>Hoạt động</span></span>
            </NavLink>

            <NavLink to="/admin/news" className={({isActive})=>isActive? 'active' : ''}>
              <span className="navLinkInner"><span className="navIcon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21 6h-8v4H3v10h18V6zM11 6V4H3v2h8z"/></svg>
              </span><span>Tin tức</span></span>
            </NavLink>

            <NavLink to="/admin/documents" className={({isActive})=>isActive? 'active' : ''}>
              <span className="navLinkInner"><span className="navIcon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM13 3.5L18.5 9H13V3.5z"/></svg>
              </span><span>Văn bản</span></span>
            </NavLink>

            <NavLink to="/admin/forms" className={({isActive})=>isActive? 'active' : ''}>
              <span className="navLinkInner"><span className="navIcon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14H6v-2h12v2zm0-4H6V9h12v4z"/></svg>
              </span><span>Biểu mẫu</span></span>
            </NavLink>
          </nav>


        </aside>

        <main className="adminMain fade-in">
          <div className="adminTopbar">
            <div className="detail-head">
              <div>
                <div className="h1">Khu vực quản trị</div>
                <div className="muted">Quản lý nội dung và người dùng</div>
              </div>
              <div className="adminUserWrap">
                <AdminUserMenu admin={admin} onLogout={onLogout} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Main site footer (matching public site) */}
      <Footer admin />
      </div>
    </NotifyProvider>
  );
}
