import React, { useEffect, useRef, useState } from "react";
import { adminFetch, adminUpload, adminDownload } from "../../services/adminApi";
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

function ConfirmModal({ open, title, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-outline" onClick={onCancel}>Huỷ</button>
          <button className="btn danger" onClick={onConfirm}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDocumentsV2() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ source: '', q: '' });

  // Add form
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('doan-ktcn');
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Edit state
  const [editing, setEditing] = useState(null); // doc being edited
  const editTitleRef = useRef(null);
  const editSourceRef = useRef(null);
  const editFileRef = useRef(null);

  // Delete confirm
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => { load(); }, []);
  const notify = useNotify();

  async function load() {
    setLoading(true);
    try {
      const qs = [];
      if (filter.source) qs.push(`source=${encodeURIComponent(filter.source)}`);
      if (filter.q) qs.push(`q=${encodeURIComponent(filter.q)}`);
      const path = `/documents${qs.length ? `?${qs.join('&')}` : ''}`;
      const data = await adminFetch(path);
      setDocs(data.items || []);
    } catch (err) {
      console.error(err);
      notify(err.message || 'Không thể tải danh sách', 'error');
    } finally { setLoading(false); }
  }

  // Add (with XHR for progress)
  async function onAdd(e) {
    e && e.preventDefault();
    const f = fileRef.current && fileRef.current.files && fileRef.current.files[0];
    if (!f) { notify('Vui lòng chọn file', 'error'); return; }
    const maxMB = 20;
    if (f.size > maxMB * 1024 * 1024) { notify('File quá lớn', 'error'); return; }

    const fd = new FormData();
    fd.append('file', f);
    fd.append('title', title || f.name);
    fd.append('source', source || 'doan-ktcn');

    setUploading(true);
    setUploadProgress(0);

    try {
      const doc = await adminUpload('/documents', fd, (p) => setUploadProgress(p));
      setDocs((d) => [doc, ...d]);
      setTitle(''); if (fileRef.current) fileRef.current.value = '';
      notify('Đã tải lên', 'success');
    } catch (err) {
      notify(err.message || 'Tải lên thất bại', 'error');
    } finally { setUploading(false); setUploadProgress(0); }
  }

  // Edit submit
  async function onSaveEdit() {
    if (!editing) return;
    const fd = new FormData();
    const newTitle = editTitleRef.current?.value || editing.title;
    const newSource = editSourceRef.current?.value || editing.source;
    const f = editFileRef.current && editFileRef.current.files && editFileRef.current.files[0];
    fd.append('title', newTitle);
    fd.append('source', newSource);
    if (f) fd.append('file', f);
    try {
      const updated = await adminFetch(`/documents/${editing.id}`, { method: 'PUT', body: fd });
      setDocs((d) => d.map((x) => x.id === editing.id ? updated : x));
      setEditing(null);
      notify('Cập nhật thành công', 'success');
    } catch (err) { notify(err.message || 'Cập nhật thất bại', 'error'); }
  }

  async function onDeleteConfirm() {
    if (!toDelete) return;
    try {
      await adminFetch(`/documents/${toDelete}/`, { method: 'DELETE' });
      setDocs((d) => d.filter((x) => x.id !== toDelete));
      setToDelete(null);
    } catch (err) { notify(err.message || 'Xoá thất bại', 'error'); }
  }

  async function onDownload(id, suggested) {
    try {
      const raw = await adminDownload(`/documents/${id}/file`);
      const blob = await raw.blob();
      let filename = suggested || 'download';
      const cd = raw.headers.get('content-disposition');
      if (cd) {
        const m = cd.match(/filename\*=UTF-8''(.+)$|filename="?([^";]+)"?/i);
        if (m) filename = decodeURIComponent(m[1] || m[2]);
      }
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) { notify(err.message || 'Không thể tải file', 'error'); }
  }

  return (
    <div>
      <div className="detail-head">
        <div>
          <h1 className="h1">Quản lý văn bản</h1>
          <div className="muted">Thêm, sửa, xoá văn bản; các tệp lưu trên server.</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        <form className="form" onSubmit={(e) => { e.preventDefault(); onAdd(); }} style={{ display: 'grid', gap: 8 }}>
          <div className="uploadRow">
            <input className="input" placeholder="Tiêu đề (tùy chọn)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1 }} />
            <select className="input" value={source} onChange={(e) => setSource(e.target.value)} style={{ width: 300 }}>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input ref={fileRef} type="file" className="input" accept=".pdf,.doc,.docx,.xls,.xlsx" />
              <button className="btn uploadBtn" disabled={uploading} type="submit">{uploading ? `Đang tải ${uploadProgress}%` : 'Tải lên'}</button>
            </div>
          </div>
          {uploading && <div className="uploadBar" aria-hidden><div className="uploadBarInner" style={{ width: `${uploadProgress}%` }} /></div>}
        </form>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={filter.source} onChange={(e) => setFilter({ ...filter, source: e.target.value })} style={{ width: 320 }}>
            <option value="">-- Lọc theo đơn vị --</option>
            {SOURCES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <input className="input" placeholder="Tìm tiêu đề..." value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} style={{ flex: 1 }} />
          <button className="btn btn-outline" onClick={(e) => { e.preventDefault(); load(); }}>Tìm</button>
          <button className="btn" onClick={() => { setFilter({ source: '', q: '' }); load(); }}>Reset</button>
        </div>

        {loading ? <div className="muted">Đang tải...</div> : docs.length === 0 ? <div className="emptyState">Chưa có văn bản.</div> : (
          <div className="adminGrid">
            {docs.map(d => (
              <div key={d.id} className="card panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 20 }}>{extIcon(d.filename || d.file_name)}</div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{d.title || d.original_name || d.file_name}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{d.source || d.unit_name || ''} • {new Date(d.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="actions">
                    <button className="btn btn-outline small btn-icon" onClick={() => onDownload(d.id, d.original_name || d.file_name)} aria-label="Tải về">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button className="btn btn-outline small icon-edit" onClick={() => setEditing(d)} title="Sửa" aria-label={`Sửa ${d.title || d.id}`}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                    <button className="btn danger small" onClick={() => setToDelete(d.id)}>Xoá</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit drawer/modal inline */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal" style={{ position: 'relative' }}>
            <button className="closeBtn" onClick={() => setEditing(null)}>✕</button>
            <h3>Chỉnh sửa văn bản</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <input ref={editTitleRef} defaultValue={editing.title} className="input" />
              <select ref={editSourceRef} defaultValue={editing.source} className="input">
                {SOURCES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <input ref={editFileRef} type="file" className="input" accept=".pdf,.doc,.docx,.xls,.xlsx" />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setEditing(null)}>Huỷ</button>
                <button className="btn" onClick={onSaveEdit}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!toDelete} title="Bạn có chắc muốn xoá văn bản này?" onCancel={() => setToDelete(null)} onConfirm={onDeleteConfirm} />
    </div>
  );
}
