import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { getAdminToken, getAdminUser, clearAdminAuth } from "../services/adminApi";
import "../styles/admin.css";

export default function SecretaryLayout() {
  const token = getAdminToken();
  const user = getAdminUser();
  const nav = useNavigate();

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'secretary' && user?.role !== 'admin') return <Navigate to="/login" replace />;

  const onLogout = () => {
    clearAdminAuth();
    nav('/login');
  };

  return (
    <div>
      <div className="adminShell secretaryShell">
        <aside className="adminSide">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brandTitle">Bí thư lớp</div>
            <div className="kpi-small">{user?.fullName || user?.email}</div>
          </div>

          <nav className="adminNav" aria-label="Secretary navigation">
            <NavLink to="/secretary" end className={({isActive})=>isActive? 'active' : ''}>Dashboard</NavLink>
            <NavLink to="/secretary/activities" className={({isActive})=>isActive? 'active' : ''}>Hoạt động</NavLink>
            <NavLink to="/secretary/users" className={({isActive})=>isActive? 'active' : ''}>Thành viên</NavLink>
          </nav>

        </aside>

        <main className="adminMain fade-in">
          <div className="adminTopbar">
            <div className="detail-head">
              <div>
                <div className="h1">Khu vực Bí thư lớp</div>
                <div className="muted">Quản lý hoạt động (giới hạn)</div>
              </div>
              <div className="adminUserWrap">
                <button className="adminUserBtn" onClick={onLogout}>
                  <div className="adminAvatar">{(user?.fullName?.[0] || 'B').toUpperCase()}</div>
                  <div className="adminName">{user?.fullName || user?.email}</div>
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}