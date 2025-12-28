import { useEffect, useState, useRef } from "react";
import { adminFetch } from "../../services/adminApi";
import { useNotify } from "../../contexts/notifyContext";

export default function AdminForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [editing, setEditing] = useState(null);
  const editTitleRef = useRef(null);
  const editUrlRef = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => { load(); }, []);
  const notify = useNotify();

  async function load() {
    setLoading(true);
    try {
      const d = await adminFetch('/forms');
      setForms(d.items || []);
    } catch (err) {
      notify(err.message || 'Không thể tải danh sách', 'error');
    } finally { setLoading(false); }
  }

  async function onAdd(e) {
    e && e.preventDefault();
    if (!title.trim() || !url.trim()) { notify('Vui lòng nhập tiêu đề và đường dẫn', 'error'); return; }
    try {
      const created = await adminFetch('/forms', { method: 'POST', body: JSON.stringify({ title: title.trim(), url: url.trim() }) });
      setForms((f) => [created, ...f]);
      setTitle(''); setUrl('');
      notify('Thêm thành công', 'success');
    } catch (err) { notify(err.message || 'Thêm thất bại', 'error'); }
  }

  async function onSaveEdit(id) {
    const t = editTitleRef.current?.value || '';
    const u = editUrlRef.current?.value || '';
    if (!t.trim() || !u.trim()) { notify('Vui lòng nhập tiêu đề và đường dẫn', 'error'); return; }
    try {
      const updated = await adminFetch(`/forms/${id}`, { method: 'PUT', body: JSON.stringify({ title: t.trim(), url: u.trim() }) });
      setForms((fs) => fs.map((x) => x.id === id ? updated : x));
      setEditing(null);
      notify('Cập nhật thành công', 'success');
    } catch (err) { notify(err.message || 'Cập nhật thất bại', 'error'); }
  }

  async function onDelete(id) {
    if (!window.confirm('Bạn có chắc muốn xoá mục này?')) return;
    try {
      await adminFetch(`/forms/${id}`, { method: 'DELETE' });
      setForms((fs) => fs.filter((x) => x.id !== id));
    } catch (err) { notify(err.message || 'Xoá thất bại', 'error'); }
  }

  const q = (query || '').trim().toLowerCase();
  const filtered = forms.filter((f) => {
    if (!q) return true;
    return (f.title || '').toLowerCase().includes(q) || (f.url || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="detail-head">
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" placeholder="Tìm kiếm biểu mẫu (tiêu đề hoặc link)..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1 }} />
            {query ? (
              <button className="btn btn-outline" type="button" onClick={() => setQuery('')}>Xóa</button>
            ) : null}
          </div>
          <div className="muted" style={{ marginTop: 8 }}>{filtered.length} mục{forms.length ? ` / tổng ${forms.length}` : ''}</div>
        </div>
      </div>

      <form className="form" onSubmit={onAdd} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" placeholder="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1 }} />
          <input className="input" placeholder="Link biểu mẫu (Google Drive)" value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: 420 }} />
          <button className="btn" type="submit">Thêm</button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
          {loading ? <div className="muted">Đang tải...</div> : (
          filtered.length === 0 ? (
            <div className="muted">{q ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có biểu mẫu.'}</div>
          ) : (
            <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
              {filtered.map((f) => (
                <div key={f.id} className="card panel" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      {editing === f.id ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input ref={editTitleRef} defaultValue={f.title} className="input" style={{ minWidth: 320 }} />
                          <input ref={editUrlRef} defaultValue={f.url} className="input" style={{ width: 420 }} />
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 800 }}>{f.title}</div>
                          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}><strong>Link biểu mẫu:</strong> <a href={f.url} target="_blank" rel="noopener noreferrer">Mở biểu mẫu</a></div>
                          <div className="muted" style={{ fontSize: 12 }}>{f.url}</div>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {editing === f.id ? (
                        <>
                          <button className="btn" onClick={() => onSaveEdit(f.id)}>Lưu</button>
                          <button className="btn btn-outline" onClick={() => setEditing(null)}>Huỷ</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-outline icon-edit" onClick={() => setEditing(f.id)} title="Sửa" aria-label={`Sửa ${f.title || f.id}`}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button className="btn danger" onClick={() => onDelete(f.id)}>Xoá</button>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}