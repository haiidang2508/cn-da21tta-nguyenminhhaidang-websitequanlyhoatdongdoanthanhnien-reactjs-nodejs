import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { formatDateTime } from "../utils/formatDate";
import { assetUrl } from "../utils/assetUrl";
import { useParams } from "react-router-dom";

export default function NewsDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/news/${id}`);
        setItem(data);
      } catch (e) {
        setErr(e.message || 'Không tải được tin');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="muted">Đang tải...</div>;
  if (err) return <div className="notice">{err}</div>;
  if (!item) return <div className="muted">Không tìm thấy tin</div>;

  return (
    <div className="container" style={{ paddingTop: 28 }}>
      <h1 style={{ fontSize: 28 }}>{item.title}</h1>
      <div className="muted" style={{ marginBottom: 12 }}>{formatDateTime(item.publish_date)} • {item.author}</div>
      {item.image_url && <img src={assetUrl(item.image_url)} alt={item.title} className="news-article-image" />}
      {/* Render content as HTML to allow rich article content; admin is trusted user. */}
      <div className="news-article-content" dangerouslySetInnerHTML={{ __html: item.content || '' }} />
    </div>
  );
}
