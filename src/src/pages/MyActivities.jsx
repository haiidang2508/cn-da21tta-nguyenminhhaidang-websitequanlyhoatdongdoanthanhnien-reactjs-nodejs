import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyRegistrations } from "../services/activityService";
import { getToken } from "../services/api";

export default function MyActivities() {
  const token = getToken();

  function stripHtml(html) {
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return tmp.textContent || tmp.innerText || '';
    } catch (e) { return String(html || ''); }
  }
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);

      if (!token) {
        setErr("Bạn cần đăng nhập để xem hoạt động đã đăng ký.");
        setLoading(false);
        return;
      }

      try {
        const data = await getMyRegistrations();
        setItems(data);
      } catch (e) {
        setErr(e.message || "Không tải được lịch sử đăng ký");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h1 className="h1">Hoạt động đã đăng ký</h1>
        </div>
        <div className="detail-actions">
          <Link className="btn btn-outline" to="/activities">Quay lại</Link>
        </div>
      </div>

      {err && <div className="notice">{err}</div>}
      {loading && <div className="muted">Đang tải...</div>}

      <div className="list">
        {items.map((x) => (
          <div key={x.id} className="card activity-card">
            <div className="activity-top">
              <div>
                <div className="activity-title">{x.title}</div>
                <div className="muted activity-meta">
                  {x.type} • {x.unit} • {x.location} • {x.activity_date}
                </div>
                <div className="muted activity-meta">
                  Đăng ký lúc: {x.registered_at}
                </div>
              </div>
              <div className="activity-badges">
                <span className="badge">{x.status}</span>
                <span className="badge badge-registered">Đã đăng ký</span>
              </div>
            </div>
            <div className="activity-bottom">
              <div className="muted">{(() => { const t = stripHtml(x.description || ''); return t.length > 200 ? t.slice(0,200) + '...' : t; })()}</div>
              <Link className="btn btn-outline" to={`/activities/${x.id}`}>
                Xem chi tiết
              </Link>
            </div>
          </div>
        ))}

        {!loading && items.length === 0 && (
          <div className="muted" style={{ marginTop: 10 }}>
            Chưa đăng ký hoạt động nào.
          </div>
        )}
      </div>
    </div>
  );
}
