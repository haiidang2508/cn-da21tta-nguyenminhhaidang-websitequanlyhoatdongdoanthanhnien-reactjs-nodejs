import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";



export default function Forms() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      // Prefer public API fetch; if it fails, fall back to localStorage stored links
      try {
        const data = await apiFetch('/forms');
        if (!mounted) return;
        setLinks(data.items || []);
        return;
      } catch (e) {
        // fallback to localStorage
      }

      try {
        const raw = localStorage.getItem('forms_links');
        if (!mounted) return;
        setLinks(raw ? JSON.parse(raw) : []);
      } catch (e) { if (mounted) setLinks([]); }
    }
    load();
    return () => { mounted = false; };
  }, []);



  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h1 className="h1">Biểu mẫu</h1>
          <p className="muted">Danh sách các biểu mẫu (Google Drive). Mở để tải về hoặc điền trực tuyến.</p>
        </div>
        <div className="detail-actions">
          <Link className="btn" to="/">Quay lại</Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {links.length === 0 ? (
          <div className="muted">Chưa có dữ liệu.</div>
        ) : (
          <div className="folder-list">
            {links.map((l, i) => (
              <div key={i} className="folder-card card">
                <div>
                  <div className="folderTitle">{l.title}</div>
                  <div className="folderMeta" style={{ marginTop: 6 }}><strong>Link biểu mẫu:</strong> <a href={l.url} target="_blank" rel="noopener noreferrer">Mở biểu mẫu</a></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{l.url}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a className="btn btn-outline" href={l.url} target="_blank" rel="noopener noreferrer">Mở</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
