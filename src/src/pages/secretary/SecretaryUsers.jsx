import { useEffect, useState } from "react";
import { adminFetch } from "../../services/adminApi";
import ConfirmModal from "../../components/ConfirmModal";
import { useNotify } from "../../contexts/notifyContext";

export default function SecretaryUsers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: '', studentId: '', email: '', role: 'user' });

  // search & filters
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const notify = useNotify();

  const chiDoan = (() => {
    try { return localStorage.getItem('chiDoan') || ''; } catch { return ''; }
  })();

  async function fetchUsers() {
    setErr("");
    setLoading(true);
    try {
      let data = [];

      // try server-side chiDoan filter first
      try {
        const url = chiDoan ? `/users?chiDoan=${encodeURIComponent(chiDoan)}` : '/users';
        data = await adminFetch(url);
      } catch (e) {
        // fallback: get all and filter client-side
        const all = await adminFetch('/users');
        data = (all || []).filter((u) => !chiDoan || (u.chiDoan || '') === chiDoan);
      }

      setItems(data || []);
    } catch (e) {
      setErr(e.message || 'Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }

  function openEdit(user) {
    setEditing(user);
    setForm({ fullName: user.fullName || '', studentId: user.studentId || '', email: user.email || '', role: user.role || 'user' });
    setFormOpen(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await adminFetch(`/users/${editing.id}`, { method: 'PUT', body: JSON.stringify({ fullName: form.fullName, studentId: form.studentId, email: form.email, role: form.role }) });
        setItems((cur) => cur.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await adminFetch('/users', { method: 'POST', body: JSON.stringify({ fullName: form.fullName, studentId: form.studentId, email: form.email, password: form.password, role: form.role }) });
        setItems((cur) => [created, ...cur]);
      }
      setFormOpen(false);
    } catch (e) {
      notify(e.message || 'Lỗi lưu người dùng', 'error');
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredItems = items.filter((u) => {
    const q = (search || '').trim().toLowerCase();
    if (q) {
      const ok = (u.fullName || '').toLowerCase().includes(q) ||
        (u.studentId || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q);
      if (!ok) return false;
    }
    if (roleFilter && roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  // pagination helpers
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (currentPageSafe - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageItems = filteredItems.slice(pageStart, pageEnd);

  async function changeRole(user, role) {
    try {
      const updated = await adminFetch(`/users/${user.id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
      setItems((cur) => cur.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e) {
      notify(e.message || "Thao tác thất bại", 'error');
    }
  }

  function confirmDelete(user) {
    setModalProps({
      title: "Xóa người dùng",
      message: `Bạn có chắc muốn xóa: "${user.fullName || user.email}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        setModalOpen(false);
        try {
          await adminFetch(`/users/${user.id}`, { method: "DELETE" });
          setItems((cur) => cur.filter((u) => u.id !== user.id));
          notify('Xoá thành công', 'success');
        } catch (e) {
          notify(e.message || "Xóa thất bại", 'error');
        }
      },
    });
    setModalOpen(true);
  }

  async function toggleLock(user) {
    if (user.locked === undefined) {
      notify('Chức năng khóa chưa bật trên server. Vui lòng chạy migration.', 'error');
      return;
    }

    try {
      const updated = await adminFetch(`/users/${user.id}/lock`, { method: 'PUT', body: JSON.stringify({ lock: !user.locked }) });
      setItems((cur) => cur.map((u) => (u.id === updated.id ? updated : u)));
      notify(updated.locked ? 'Khóa thành công' : 'Mở khóa thành công', 'success');
    } catch (e) {
      notify(e.message || 'Thao tác thất bại', 'error');
    }
  }

  return (
    <div className="adminPanel">
      <div className="detail-head">
        <div>
          <h2 className="h1">Quản lý Người dùng</h2>
          <div className="muted">Chi đoàn: {chiDoan || '---'}</div>
        </div>
      </div>

      {err && <div className="notice">{err}</div>}

      {loading ? (
        <div className="muted">Đang tải...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Tìm theo tên / MSSV / email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260 }}
            />

            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <button
                type="button"
                className="btn filter-btn"
                onClick={() => setShowFilter((s) => !s)}
                aria-expanded={showFilter}
                aria-haspopup="true"
              >
                Lọc
                {roleFilter !== 'all' && <span className="filter-badge">{roleFilter === 'secretary' ? 'Bí thư' : roleFilter}</span>}
              </button>

              {showFilter && (
                <div className="filter-panel" role="dialog" aria-modal="false">
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Vai trò
                    <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                      <option value="all">Tất cả</option>
                      <option value="user">User</option>
                      <option value="secretary">Bí thư lớp</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn" onClick={() => setShowFilter(false)}>Áp dụng</button>
                    <button className="btn btn-outline" onClick={() => { setRoleFilter('all'); setShowFilter(false); }}>Bỏ chọn</button>
                  </div>

                  <div style={{ marginTop: 10 }} className="muted">Kết quả: {filteredItems.length} / {items.length}</div>
                </div>
              )}
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Họ và tên</th>
                <th>MSSV</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Vai trò</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u, idx) => (
                <tr key={u.id}>
                  <td>{pageStart + idx + 1}</td>
                  <td>{u.fullName}</td>
                  <td>{u.studentId || ""}</td>
                  <td>{u.email || ""}</td>
                  <td>{u.locked ? 'Đã khóa' : 'Hoạt động'}</td>
                  <td>{u.role === 'secretary' ? 'Bí thư lớp' : (u.role || '')}</td>
                  <td>
                    <div className="actions actions-compact">
                      <button className="btn btn-outline icon-edit" onClick={() => openEdit(u)} title="Sửa" aria-label={`Sửa ${u.fullName || u.email}`}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>

                      <label className="role-select-wrap" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <select
                          className="input role-select"
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole !== u.role) changeRole(u, newRole);
                          }}
                          aria-label={`Chuyển vai trò cho ${u.fullName || u.email}`}
                        >
                          <option value="user">User</option>
                          <option value="secretary">Bí thư lớp</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>

                      <button className="btn danger" onClick={() => confirmDelete(u)}>Xóa</button>
                      <button
                        className={`icon-btn ${u.locked ? 'icon-locked' : 'icon-unlocked'}`}
                        onClick={() => toggleLock(u)}
                        style={{ minWidth: 44 }}
                        disabled={u.locked === undefined}
                        title={u.locked === undefined ? 'Tính năng khóa chưa được bật trên server' : (u.locked ? 'Mở khóa' : 'Khóa')}
                        aria-label={u.locked === undefined ? 'Khóa (không khả dụng)' : (u.locked ? 'Mở khóa' : 'Khóa')}
                      >
                        {u.locked ? (
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="11" width="18" height="10" rx="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="11" width="18" height="10" rx="2" />
                            <path d="M7 11V7a5 5 0 0110 0" />
                            <path d="M12 17v.01" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination controls */}
          <div className="pagination-wrap" aria-hidden={totalPages <= 1}>
            <div className="pagination-controls">
              <button className="btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPageSafe === 1}>Prev</button>

              <div className="pagination-pages">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      className={page === currentPageSafe ? 'btn btn-primary' : 'btn btn-outline'}
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === currentPageSafe ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button className="btn" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPageSafe === totalPages}>Next</button>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={modalOpen}
        title={modalProps.title}
        message={modalProps.message}
        confirmText={modalProps.confirmText}
        cancelText={modalProps.cancelText}
        onConfirm={modalProps.onConfirm}
        onCancel={() => setModalOpen(false)}
      />

      {formOpen && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modalCard">
            <div className="modalHeader">
              <div className="h1" style={{ fontSize: 18 }}>{editing ? 'Chỉnh sửa người dùng' : 'Tạo người dùng'}</div>
            </div>
            <form onSubmit={submitForm} className="modalBody" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" placeholder="Họ và tên" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              <input className="input" placeholder="MSSV" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
              <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

              {!editing && (
                <input className="input" placeholder="Mật khẩu" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" required />
              )}

              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                Vai trò
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="secretary">Bí thư lớp</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="modalActions">
                <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Hủy</button>
                <button type="submit" className="btn">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="muted">&nbsp;</div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn" onClick={() => { setEditing(null); setForm({ fullName: '', studentId: '', email: '', role: 'user', password: '' }); setFormOpen(true); }}>Thêm người dùng</button>
        </div>
      </div>
    </div>
  );
}
