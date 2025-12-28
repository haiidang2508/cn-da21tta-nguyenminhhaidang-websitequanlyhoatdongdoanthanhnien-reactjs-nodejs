import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { formatDateTime } from "../utils/formatDate";
import { assetUrl } from "../utils/assetUrl";

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await apiFetch("/news");
        if (Array.isArray(list)) setNews(list);
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = news.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = news.slice(start, start + pageSize);

  return (
    <div className="container" style={{ paddingTop: 28 }}>
      <div className="home2-sectionTitle">
        <span className="home2-dot" />
        <span>Tin tức</span>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div className="muted">Đang tải tin tức...</div>
        ) : (
          <div className="home2-newsGrid">
            {pageItems.map((n) => {
              const img = n.image || n.image_url;
              const imgSrc = img ? assetUrl(img) : null;
              return (
                <a key={n.id} className="newsGridItem" href={n.url || `/news/${n.id}`} target={n.url ? "_blank" : "_self"} rel={n.url ? "noreferrer" : undefined}>
                  {img ? <img className="newsGridThumb" src={imgSrc} alt={n.title} /> : <div className="newsGridThumb noImage" aria-hidden="true" />}
                  <div className="newsGridBody">
                    <div className="newsGridTitle">{n.title}</div>
                    <div className="newsGridDate">{formatDateTime(n.date || n.time)}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {!loading && pages > 1 && (
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Trước</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Trang {page} / {pages}
            </div>
            <button className="btn" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Tiếp</button>
          </div>
        )}
      </div>
    </div>
  );
}
