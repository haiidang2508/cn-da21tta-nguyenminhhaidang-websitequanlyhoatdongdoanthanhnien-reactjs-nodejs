import { useEffect, useState } from "react";
import { adminFetch } from "../../services/adminApi";
import { useNotify } from "../../contexts/notifyContext";

const SOURCES = [
  { id: "doan-ktcn", title: "Đoàn thanh niên Trường Kỹ thuật và Công nghệ" },
  { id: "doan-tvu", title: "Đoàn thanh niên Trường Đại học Trà Vinh" },
  { id: "thanhdoan-travinh", title: "Thành đoàn Trà Vinh" },
  { id: "trunguong", title: "Trung ương Đoàn" },
];

function extIcon(filename) {
  const ext = (filename || "").split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return '📄';
  if (['doc','docx'].includes(ext)) return '📃';
  if (['xls','xlsx','csv'].includes(ext)) return '📊';
  return '📁';
}

export default function AdminDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ source: '', q: '' });
  const notify = useNotify();
  const [form, setForm] = useState({ title: "", source: "doan-ktcn", file: null });
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState({ title: '', source: 'doan-ktcn', file: null });

  const startEdit = (d) => { setEditingId(d.id); setEditingForm({ title: d.title, source: d.source, file: null }); };

  const saveEdit = async (id) => {
    try {
      const fd = new FormData();
      fd.append('title', editingForm.title || '');
      fd.append('source', editingForm.source || '');
      if (editingForm.file) fd.append('file', editingForm.file);
      const updated = await adminFetch(`/documents/${id}`, { method: 'PUT', body: fd });
      setDocs((ds) => ds.map((x) => (x.id === id ? updated : x)));
      setEditingId(null);
      setEditingForm({ title: '', source: 'doan-ktcn', file: null });
      notify('Cập nhật thành công', 'success');
    } catch (err) {
      notify(err.message || 'Cập nhật thất bại', 'error');
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    setLoading(true);
    try {
      const qs = [];
      if (filter.source) qs.push(`source=${encodeURIComponent(filter.source)}`);
      if (filter.q) qs.push(`q=${encodeURIComponent(filter.q)}`);
      const path = `/documents${qs.length ? `?${qs.join('&')}` : ''}`;
      const data = await adminFetch(path);
      setDocs(data.items || []);
    } catch (err) {
      notify(err.message || 'Không thể lấy dữ liệu', 'error');
    } finally { setLoading(false); }
  }

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    setForm({ ...form, file: f });
  };

  const onAdd = async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!form.file) {
      notify('Vui lòng chọn file để tải lên.', 'error');
      return;
    }
    if (!(form.file instanceof File)) {
      notify('Tệp tải lên không hợp lệ. Vui lòng thử lại.', 'error');
      return;
    }

    const MAX_MB = 20;
    if (form.file.size > MAX_MB * 1024 * 1024) {
      notify(`Tệp quá lớn (giới hạn ${MAX_MB} MB). Vui lòng chọn tệp nhỏ hơn.`, 'error');
      return;
    }

    // Client-side type check
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowed.includes(form.file.type)) {
      notify('Loại tệp không được hỗ trợ. Vui lòng chọn PDF/DOC/DOCX/XLS/XLSX.', 'error');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('title', form.title || form.file.name);
      fd.append('source', form.source || 'doan-ktcn');

      const doc = await adminFetch('/documents', { method: 'POST', body: fd });
      setDocs((d) => [doc, ...d]);
      setForm({ title: '', source: form.source, file: null });
      // Reset file input visually by clearing its value
      const fileInputs = document.querySelectorAll('input[type=file]');
      fileInputs.forEach((inp) => (inp.value = ''));
      notify('Tải lên thành công', 'success');
    } catch (err) {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      if (msg.includes('missing file')) {
        notify('Máy chủ không nhận được file. Thử chọn lại tệp và tải lên lần nữa.', 'error');
      } else if (msg.includes('multer') || msg.includes('server not configured')) {
        notify('Máy chủ chưa bật hỗ trợ tải file (thiếu module multer). Vui lòng cài đặt multer và khởi động lại backend.', 'error');
      } else if (msg.includes('invalid file type')) {
        notify('Loại tệp không hợp lệ. Vui lòng chọn PDF/DOC/DOCX/XLS/XLSX.', 'error');
      } else if (msg.includes('limit') || msg.includes('file too large')) {
        notify('Tệp quá lớn theo giới hạn máy chủ. Vui lòng chọn tệp nhỏ hơn.', 'error');
      } else {
        notify(err.message || 'Tải lên thất bại', 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xoá văn bản này?')) return;
    try {
      await adminFetch(`/documents/${id}`, { method: 'DELETE' });
      setDocs((d) => d.filter((x) => x.id !== id));
    } catch (err) {
      notify(err.message || 'Xoá thất bại', 'error');
    }
  };

  const onDownload = (f) => {
    // open the file served by backend
    const url = `/uploads/documents/${f}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div className="detail-head">
        <div>
          <h1 className="h1">Quản lý văn bản</h1>
          <div className="muted">Thêm, chỉnh sửa hoặc xoá văn bản do đơn vị ban hành.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
        <form className="form" onSubmit={onAdd} style={{ maxWidth: 820 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ flex: 1 }} className="label">
              Tiêu đề
              <input className="input" name="title" value={form.title} onChange={onChange} placeholder="Tiêu đề văn bản (tùy chọn)" />
            </label>

            <label style={{ width: 260 }} className="label">
              Đơn vị
              <select className="input" name="source" value={form.source} onChange={onChange}>
                {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </label>

            <label style={{ width: 300 }} className="label">
              File (PDF, DOC)
              <input className="input" type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} />
            </label>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn" type="submit" disabled={uploading}>{uploading ? 'Đang tải...' : 'Tải lên'}</button>
            </div>
          </div>
        </form>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="input" style={{ width: 360 }} value={filter.source} onChange={(e) => setFilter({ ...filter, source: e.target.value })}>
            <option value="">-- Lọc theo đơn vị --</option>
            {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>

          <input className="input" style={{ flex: 1 }} placeholder="Tìm kiếm theo tiêu đề..." value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />

          <div>
            <button className="btn btn-outline" onClick={(e) => { e.preventDefault(); fetchDocs(); }}>Tìm</button>
          </div>
        </div>

        {loading ? <div className="muted">Đang tải...</div> : (
          docs.length === 0 ? (
            <div className="muted">Chưa có văn bản trong mục này.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {docs.map((d) => (
                <div key={d.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: 22 }}>{extIcon(d.filename)}</div>
                      <div>
                        {editingId === d.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input className="input" style={{ minWidth: 320 }} value={editingForm.title} onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })} />
                            <select className="input" value={editingForm.source} onChange={(e) => setEditingForm({ ...editingForm, source: e.target.value })}>
                              {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <input type="file" className="input" onChange={(e) => setEditingForm({ ...editingForm, file: e.target.files[0] })} />
                          </div>
                        ) : (
                          <>
                            <div style={{ fontWeight: 800 }}>{d.title}</div>
                            <div className="muted" style={{ fontSize: 13 }}>{d.filename} • {d.source} • {new Date(d.created_at).toLocaleString()}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {editingId === d.id ? (
                        <>
                          <button className="btn" onClick={() => saveEdit(d.id)}>Lưu</button>
                          <button className="btn btn-outline" onClick={() => { setEditingId(null); setEditingForm({ title: '', source: 'doan-ktcn', file: null }); }}>Huỷ</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-outline btn-icon" onClick={() => onDownload(d.filename)} aria-label="Tải về">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                          <button className="btn btn-outline icon-edit" onClick={() => startEdit(d)} title="Sửa" aria-label={`Sửa ${d.title || d.id}`}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button className="btn btn-outline danger" onClick={() => onDelete(d.id)}>Xoá</button>
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
