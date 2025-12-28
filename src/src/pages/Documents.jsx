import React, { useState } from "react";
import { Link } from "react-router-dom";

const TABS = [
  { id: "doan-ktcn", title: "Đoàn thanh niên Trường Kỹ thuật và Công nghệ" },
  { id: "doan-tvu", title: "Đoàn thanh niên Trường Đại học Trà Vinh" },
  { id: "thanhdoan-travinh", title: "Thành đoàn Trà Vinh" },
  { id: "trunguong", title: "Trung ương Đoàn" },
];

export default function Documents() {
  // add an 'all' view to show documents grouped by unit
  const [tab, setTab] = useState('all');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use backend API base directly so the public pages fetch the backend in dev
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';
  const BACKEND_ORIGIN = (() => {
    try { return new URL(API_BASE).origin } catch (e) { return API_BASE.replace(/\/api\/?$/,'') }
  })();

  async function loadDocuments(source) {
    setLoading(true);
    try {
      // when source is falsy we fetch all documents and will group them client-side
      const q = source && source !== 'all' ? `?source=${encodeURIComponent(source)}` : '';
      const res = await fetch(`${API_BASE}/documents${q}`);
      if (!res.ok) throw new Error('Không thể tải danh sách');
      const data = await res.json();
      setDocs(data.items || []);
    } catch (err) {
      console.error(err);
      setDocs([]);
    } finally { setLoading(false); }
  }

  React.useEffect(() => { loadDocuments(tab); }, [tab]);

  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h1 className="h1">Văn bản</h1>
          <p className="muted">Danh sách văn bản, thông báo, quy định do Đoàn ban hành.</p>
        </div>
        <div className="detail-actions">
          <Link className="btn btn-outline" to="/">Quay lại</Link>
        </div>
      </div>

      <div className="doc-tabs">
        <button key="all" className={"doc-tab" + (tab === 'all' ? ' active' : '')} onClick={() => setTab('all')} type="button">Tất cả</button>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"doc-tab" + (t.id === tab ? " active" : "")}
            onClick={() => setTab(t.id)}
            type="button"
          >
            <span className="folderIcon">📁</span>
            {t.title}
          </button>
        ))}
      </div>

      <div className="folder-list">
        {loading ? (
          <div className="muted" style={{ padding: 18 }}>Đang tải...</div>
        ) : tab === 'all' ? (
          // Group by source/unit
          (() => {
            const map = {};
            (docs || []).forEach((d) => {
              const key = d.source || d.unit_name || 'unknown';
              if (!map[key]) map[key] = [];
              map[key].push(d);
            });
            const groups = Object.keys(map).sort();
            if (groups.length === 0) return <div className="muted" style={{ padding: 18 }}>Chưa có dữ liệu.</div>;
            return groups.map((src) => (
              <div key={src} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>{(TABS.find(t => t.id === src) || { title: src === 'unknown' ? 'Khác' : src }).title || src}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                          {map[src].map((d) => (
                    <div key={d.id} className="folder-card">
                      <div className="folder-row" style={{ alignItems: 'center' }}>
                        <div className="folder-content">
                          <div className="folderTitle">{d.title || d.original_name || d.file_name || d.filename}</div>
                          <div className="folderMeta">{new Date(d.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="folder-actions">
                          <a className="btn btn-outline btn-icon" href={
                            (d.file_path && (d.file_path.startsWith('http') ? d.file_path : (d.file_path.startsWith('/') ? BACKEND_ORIGIN + d.file_path : BACKEND_ORIGIN + '/uploads/documents/' + (d.file_name || d.filename))))
                            || (d.file_name || d.filename ? BACKEND_ORIGIN + '/uploads/documents/' + (d.file_name || d.filename) : '#')
                          } target="_blank" rel="noreferrer">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" title="Tải về">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()
        ) : docs && docs.length > 0 ? (
          docs.map((d) => (
            <div key={d.id} className="folder-card">
              <div className="folder-row" style={{ alignItems: 'center' }}>
                <div className="folder-content">
                  <div className="folderTitle">{d.title || d.original_name}</div>
                  <div className="folderMeta">{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <div className="folder-actions">
                  <a className="btn btn-outline btn-icon" href={
                    (d.file_path && (d.file_path.startsWith('http') ? d.file_path : (d.file_path.startsWith('/') ? BACKEND_ORIGIN + d.file_path : BACKEND_ORIGIN + '/uploads/documents/' + (d.file_name || d.filename))))
                    || (d.file_name || d.filename ? BACKEND_ORIGIN + '/uploads/documents/' + (d.file_name || d.filename) : '#')
                  } target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" title="Tải về">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="muted" style={{ padding: 18 }}>
            Chưa có dữ liệu trong mục này.
          </div>
        )}
      </div>
    </div>
  );
}
