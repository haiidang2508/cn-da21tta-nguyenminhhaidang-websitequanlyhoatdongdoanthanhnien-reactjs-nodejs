import { useEffect, useState } from "react";
import { adminFetch } from "../../services/adminApi";
import { formatDateTime } from "../../utils/formatDate";
import ConfirmModal from "../../components/ConfirmModal";
import { useNotify } from "../../contexts/notifyContext";

export default function AdminNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', author: '', image_url: '', publish_date: '', article_url: '' });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState({});

  const notify = useNotify();

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', limit);
        const data = await adminFetch(`/news?${params.toString()}`);
        setItems(data.items || []);
        setTotal(data.total || 0);
      } catch (e) {
        setErr(e.message || "Không tải được danh sách tin");
        notify(e.message || 'Không tải được danh sách tin', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, limit, notify]);

  const [imagePreview, setImagePreview] = useState(null);

  function openCreate() {
    setEditing(null);
    setForm({ title: '', excerpt: '', content: '', author: '', image_url: '', imageFile: null, publish_date: '', article_url: '' });
    setImagePreview(null);
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      title: item.title || '',
      excerpt: item.excerpt || '',
      content: item.content || '',
      author: item.author || '',
      image_url: item.image_url || '',
      imageFile: null,
      publish_date: item.publish_date ? item.publish_date.slice(0, 16) : '',
      article_url: item.article_url || '',
    });
    setImagePreview(item.image_url ? (item.image_url.startsWith('http') ? item.image_url : (process.env.REACT_APP_API_BASE || 'http://localhost:5000') + item.image_url) : null);
    setFormOpen(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    try {
      // If there's an image file selected, use FormData
      let body;
      let headers = {};
      if (form.imageFile) {
        body = new FormData();
        body.append('title', form.title);
        body.append('excerpt', form.excerpt);
        body.append('content', form.content);
        body.append('author', form.author);
        if (form.publish_date) body.append('publish_date', form.publish_date);
        if (form.article_url) body.append('article_url', form.article_url);
        if (form.imageFile) body.append('image', form.imageFile);
      } else {
        body = JSON.stringify({ ...form, image_url: form.image_url });
        headers['Content-Type'] = 'application/json';
      }

      if (editing) {
        const updated = await adminFetch(`/news/${editing.id}`, { method: 'PUT', body, headers });
        setItems((cur) => cur.map((i) => (i.id === updated.id ? updated : i)));
        notify('Cập nhật tin thành công', 'success');
      } else {
        const created = await adminFetch('/news', { method: 'POST', body, headers });
        setItems((cur) => [created, ...cur]);
        setTotal((t) => t + 1);
        notify('Tạo tin thành công', 'success');
      }
      setFormOpen(false);
    } catch (err) {
      notify(err.message || 'Lỗi lưu tin', 'error');
    }
  }

  function confirmDelete(item) {
    setModalProps({
      title: 'Xóa tin',
      message: `Bạn có chắc muốn xóa: "${item.title}"?`,
      confirmText: 'Xóa',
      onConfirm: async () => {
        setModalOpen(false);
        try {
          await adminFetch(`/news/${item.id}`, { method: 'DELETE' });
          setItems((cur) => cur.filter((x) => x.id !== item.id));
          setTotal((t) => Math.max(0, t - 1));
          notify('Xóa thành công', 'success');
        } catch (err) {
          notify(err.message || 'Xóa thất bại', 'error');
        }
      },
    });
    setModalOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="adminPanel">
      <div className="detail-head">
        <div>
          <h2 className="h1">Quản lý Tin tức</h2>
          <div className="muted">Tổng: {total}</div>
        </div>
        <div className="detail-actions">
          <button className="btn" onClick={openCreate}>Tạo tin mới</button>
        </div>
      </div>

      {err && <div className="notice">{err}</div>}

      {loading ? (
        <div className="muted">Đang tải...</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tiêu đề</th>
                <th>Tác giả</th>
                <th>Ngày/Thời gian</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id}>
                  <td>{n.id}</td>
                  <td>{n.title}</td>
                  <td>{n.author}</td>
                  <td>{n.publish_date ? formatDateTime(n.publish_date) : ''}</td>
                  <td>
                    <div className="actions actions-compact">
                      <button className="btn btn-outline icon-edit" onClick={() => openEdit(n)} title="Sửa" aria-label={`Sửa ${n.title || n.id}`}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <button className="btn danger" onClick={() => confirmDelete(n)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination-wrap" aria-hidden={totalPages <= 1} style={{ marginTop: 12 }}>
            <div className="pagination-controls">
              <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>

              <div className="pagination-pages">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pg = i + 1;
                  return (
                    <button key={pg} className={pg === page ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setPage(pg)}>{pg}</button>
                  );
                })}
              </div>

              <button className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </>
      )}

      {/* Confirm modal for deletes */}
      <ConfirmModal
        open={modalOpen}
        title={modalProps.title}
        message={modalProps.message}
        confirmText={modalProps.confirmText}
        cancelText={modalProps.cancelText}
        onConfirm={modalProps.onConfirm}
        onCancel={() => setModalOpen(false)}
      />

      {/* Form modal */}
      {formOpen && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modalCard">
            <div className="modalHeader">
              <div className="h1" style={{ fontSize: 18 }}>{editing ? 'Chỉnh sửa tin' : 'Tạo tin mới'}</div>
            </div>
            <form onSubmit={submitForm} className="modalBody" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input className="input" placeholder="Tóm tắt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              <textarea className="input" placeholder="Nội dung" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} />
              <input className="input" placeholder="Tác giả" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />

              <div>
                <label className="muted" style={{ display: 'block', marginBottom: 6 }}>Ảnh đại diện</label>
                {imagePreview ? (
                  <div style={{ marginBottom: 8 }}>
                    <img src={imagePreview} alt="Preview" style={{ width: 160, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }} />
                    <div>
                      <button type="button" className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => { setForm({ ...form, imageFile: null, image_url: '' }); setImagePreview(null); }}>Xóa ảnh</button>
                    </div>
                  </div>
                ) : null}

                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) {
                    setForm({ ...form, imageFile: f });
                    setImagePreview(URL.createObjectURL(f));
                  }
                }} />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <input className="input" placeholder="Đường dẫn bài (URL, tùy chọn)" value={form.article_url} onChange={(e) => setForm({ ...form, article_url: e.target.value })} />
                <input className="input" type="datetime-local" value={form.publish_date} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} />
              </div>


              <div className="modalActions">
                <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Hủy</button>
                <button type="submit" className="btn">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="muted" style={{ marginTop: 12 }}>
        Ghi chú: các thao tác chỉ khả dụng với quyền admin.
      </div>
    </div>
  );
}
