import { useEffect, useState } from "react";
import { adminFetch } from "../../services/adminApi";
import ConfirmModal from "../../components/ConfirmModal";
import { useNotify } from "../../contexts/notifyContext";
import { formatDateTime } from "../../utils/formatDate";

export default function AdminActivities() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', type: '', unit: '', activity_date: '', location: '', status: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const notify = useNotify();

  // Search/filter state
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: '', status: '' });
  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Description is a plain textarea (no Rich mode / no Telex IME)
  // (Removed earlier rich editor + telex helpers as requested)

  async function fetchActivities() {
    setErr("");
    setLoading(true);
    try {
      const data = await adminFetch('/activities');
      setItems(data || []);
    } catch (e) {
      setErr(e.message || "Không tải được danh sách hoạt động");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivities();
  }, []);

  const filteredItems = items.filter((a) => {
    const q = (search || '').trim().toLowerCase();
    if (q) {
      const matchQ = (
        (a.title || '').toLowerCase().includes(q) ||
        (a.type || '').toLowerCase().includes(q) ||
        (a.unit || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q) ||
        (a.status || '').toLowerCase().includes(q)
      );
      if (!matchQ) return false;
    }
    if (filters.type && !(a.type || '').toLowerCase().includes(filters.type.toLowerCase())) return false;
    if (filters.status && (a.status || '') !== filters.status) return false;
    return true;
  });

  // pagination helpers
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (currentPageSafe - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageItems = filteredItems.slice(pageStart, pageEnd);

  return (
    <div className="adminPanel">
      <h2 className="h1">Quản lý Hoạt động</h2>
      {err && <div className="notice">{err}</div>}
      {loading ? (
        <div className="muted">Đang tải...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                placeholder="Tìm theo tiêu đề / loại / đơn vị / địa điểm / trạng thái"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: 360 }}
              />

              <button className="btn create" onClick={() => { setEditing(null); setForm({ title: '', type: '', unit: '', activity_date: '', location: '', status: '', description: '' }); setFormOpen(true); }}>Tạo hoạt động</button>
              <button className="btn filter" onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters}>{showFilters ? 'Đóng bộ lọc' : 'Bộ lọc'}</button>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="muted">Kết quả: {filteredItems.length} / {items.length}</div>
            </div>
          </div>

          {showFilters && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input className="input" placeholder="Loại" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} />
              <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">-- Trạng thái --</option>
                <option value="Sắp diễn ra">Sắp diễn ra</option>
                <option value="Đang mở">Đang mở</option>
                <option value="Đã kết thúc">Đã kết thúc</option>
              </select>
              <button className="btn btn-outline" onClick={() => setFilters({ type: '', status: '' })}>Xóa bộ lọc</button>
            </div>
          )} 

          <table className="table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã</th>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Đơn vị</th>
                <th>Ngày</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center' }}>Không có kết quả</td>
                </tr>
              ) : (
                pageItems.map((a, idx) => (
                  <tr key={a.id}>
                    <td>{pageStart + idx + 1}</td>
                    <td style={{ fontFamily: 'monospace' }}>{a.code || ''}</td>
                    <td style={{ maxWidth: 320 }}>{a.title}</td>
                    <td>{a.type}</td>
                    <td>{a.unit}</td>
                    <td>{a.activity_date ? formatDateTime(a.activity_date) : ''}</td>
                    <td>
                      <div className="actions actions-compact">
                        <button className="btn btn-outline icon-edit" onClick={() => { setEditing(a); setForm({ title: a.title || '', type: a.type || '', unit: a.unit || '', activity_date: a.activity_date ? a.activity_date.slice(0,16) : '', location: a.location || '', status: a.status || '', description: a.description || '' }); setFormOpen(true); }} title="Sửa" aria-label={`Sửa ${a.title || a.id}`}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button className="btn danger" onClick={() => {
                          setModalProps({
                          title: 'Xóa hoạt động',
                          message: 'Bạn chắc chắn muốn xóa hoạt động này?',
                          confirmText: 'Xóa',
                          onConfirm: async () => {
                            setModalOpen(false);
                            try {
                              await adminFetch(`/activities/${a.id}`, { method: 'DELETE' });
                              setItems((cur) => cur.filter((x) => x.id !== a.id));
                              notify('Xóa thành công', 'success');
                            } catch (err) {
                              notify(err.message || 'Xóa thất bại', 'error');
                            }
                          },
                        });
                        setModalOpen(true);
                      }}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

          {/* Form modal */}
          {formOpen && (
            <div className="modalOverlay" role="dialog" aria-modal="true">
              <div className="modalCard">
                <div className="modalHeader">
                  <div className="h1" style={{ fontSize: 18 }}>{editing ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động'}</div>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true);
                  setSuccess("");
                  try {
                    if (editing) {
                      const updated = await adminFetch(`/activities/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
                      setItems((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));
                      setSuccess('Đã cập nhật hoạt động.');
                    } else {
                      const created = await adminFetch('/activities', { method: 'POST', body: JSON.stringify(form) });
                      // refresh the list from server to keep ordering consistent
                      await fetchActivities();
                      setSuccess('Đã tạo hoạt động mới.');
                    }
                    setFormOpen(false);
                    // clear success message after short delay
                    setTimeout(() => setSuccess(''), 3000);
                  } catch (err) {
                    notify(err.message || 'Lỗi lưu hoạt động', 'error');
                  } finally {
                    setSaving(false);
                  }
                }} className="modalBody" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="input" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  <input className="input" placeholder="Loại" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
                  <input className="input" placeholder="Đơn vị" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                  <input className="input" type="datetime-local" placeholder="Ngày" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} required />
                  <input className="input" placeholder="Địa điểm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  <label className="label">Trạng thái
                    <select className="input" value={form.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="">-- Chọn trạng thái --</option>
                      <option value="Sắp diễn ra">Sắp diễn ra</option>
                      <option value="Đang mở">Đang mở</option>
                      <option value="Đã kết thúc">Đã kết thúc</option>
                    </select>
                  </label>
                  <textarea
                    className="input"
                    placeholder="Mô tả"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    style={{ width: '100%' }}
                  />
                  <div className="modalActions">
                    <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)} disabled={saving}>Hủy</button>
                    <button type="submit" className="btn" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
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

      {success && <div className="notice" style={{ marginTop: 12 }}>{success}</div>}
    </div>
  );
}
