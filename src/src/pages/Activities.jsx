import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getActivities, getMyRegistrations } from "../services/activityService";
import { getUser } from "../services/api";

export default function Activities() {
  const user = getUser();

  function stripHtml(html) {
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return tmp.textContent || tmp.innerText || '';
    } catch (e) { return String(html || ''); }
  }
  const [items, setItems] = useState([]);
  const [type, setType] = useState("Tất cả");
  const [unit, setUnit] = useState("Tất cả");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // IDs of activities the current user has registered for
  const [registeredIds, setRegisteredIds] = useState(new Set());

  async function loadRegistrations() {
    try {
      if (!user) {
        setRegisteredIds(new Set());
        return;
      }
      const regs = await getMyRegistrations();
      const s = new Set((regs || []).map((r) => r.id));
      setRegisteredIds(s);
    } catch (e) {
      // ignore errors silently
      setRegisteredIds(new Set());
    }
  }

  // load registrations on mount / user change
  useEffect(() => {
    loadRegistrations();
  }, [user]);

  // listen for changes from other pages (register/unregister) and update
  useEffect(() => {
    const h = () => loadRegistrations();
    window.addEventListener("registrations-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("registrations-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await getActivities({ type, unit, q });
        setItems(data);
      } catch (e) {
        setErr(e.message || "Không tải được danh sách hoạt động");
      } finally {
        setLoading(false);
      }
    })();
  }, [type, unit, q]);

  const types = useMemo(() => {
    const set = new Set(items.map((x) => x.type));
    return ["Tất cả", ...Array.from(set)];
  }, [items]);

  const units = useMemo(() => {
    const set = new Set(items.map((x) => x.unit));
    return ["Tất cả", ...Array.from(set)];
  }, [items]);

  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h1 className="h1">Hoạt động</h1>
          <p className="muted">
            {user ? `Xin chào, ${user.fullName}` : "Bạn chưa đăng nhập (chỉ xem danh sách)."}
          </p>

          <div style={{ marginTop: 8 }}>
            <div className="miniDashboard" role="region" aria-label="Tóm tắt hoạt động của bạn">
              <div className="miniTile miniTile--total" title="Tổng hoạt động">
                <div className="miniIcon miniIcon--total" aria-hidden="true">📋</div>
                <div className="miniBody">
                  <div className="miniLabel">Tổng hoạt động</div>
                  <div className="miniCount">{items ? items.length : 0}</div>
                </div>
              </div>

              <div className="miniTile miniTile--joined" title="Đã tham gia">
                <div className="miniIcon miniIcon--joined" aria-hidden="true">✅</div>
                <div className="miniBody">
                  <div className="miniLabel">Đã tham gia</div>
                  <div className="miniCount">{registeredIds ? registeredIds.size : 0}</div>
                </div>
              </div>

              <div className="miniTile miniTile--upcoming" title="Sắp diễn ra">
                <div className="miniIcon miniIcon--upcoming" aria-hidden="true">⏳</div>
                <div className="miniBody">
                  <div className="miniLabel">Sắp diễn ra</div>
                  <div className="miniCount">{items ? items.filter(x => new Date(x.activity_date) > new Date()).length : 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-actions">
          <Link className="btn btn-outline" to="/my-activities">
            Hoạt động đã đăng ký
          </Link>
        </div>
      </div>

      <div className="filters">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên/đơn vị/địa điểm..."
        />

        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {err && <div className="notice">{err}</div>}
      {loading && <div className="muted" style={{ marginTop: 12 }}>Đang tải...</div>}

      <div className="list">
        {items.map((x) => (
          <div key={x.id} className="card activity-card">
            <div className="activity-top">
              <div>
                <div className="activity-title">{x.title}</div>
                <div className="muted activity-meta">
                  {x.type} • {x.unit} • {x.location} • {x.activity_date}
                </div>
              </div>
              <div className="activity-badges">
                <span className="badge">{x.status}</span>

                {/* Registration status tag */}
                {registeredIds.has(x.id) ? (
                  <span className="badge badge-registered">Đã đăng ký</span>
                ) : (
                  <span className="badge badge-unregistered">Chưa đăng ký</span>
                )}

                <span className="badge badge-outline">{x.type}</span>
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
      </div>
    </div>
  );
}
