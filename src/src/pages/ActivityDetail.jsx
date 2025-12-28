import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  cancelRegistration,
  getActivityDetail,
  registerActivity,
  getMyRegistrations,
} from "../services/activityService";

import { getToken } from "../services/api";

export default function ActivityDetail() {
  const { id } = useParams();
  const token = getToken();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await getActivityDetail(id);
        setItem(data);

        // check if current user already registered
        try {
          const token = getToken();
          if (token) {
            const regs = await getMyRegistrations();
            setIsRegistered((regs || []).some((r) => String(r.id) === String(id)));
          } else {
            setIsRegistered(false);
          }
        } catch (e) {
          setIsRegistered(false);
        }

      } catch (e) {
        setErr(e.message || "Không tải được chi tiết");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onRegister() {
    setMsg("");
    setErr("");
    if (!token) return setErr("Bạn cần đăng nhập để đăng ký.");
    try {
      await registerActivity(id);
      setMsg("✅ Đăng ký thành công!");
      setIsRegistered(true);
      // notify other pages to refresh registration state
      window.dispatchEvent(new Event('registrations-changed'));
    } catch (e) {
      setErr(e.message || "Đăng ký thất bại");
    }
  }

  async function onCancel() {
    setMsg("");
    setErr("");
    if (!token) return setErr("Bạn cần đăng nhập để hủy đăng ký.");
    try {
      await cancelRegistration(id);
      setMsg("✅ Đã hủy đăng ký!");
      setIsRegistered(false);
      window.dispatchEvent(new Event('registrations-changed'));
    } catch (e) {
      setErr(e.message || "Hủy thất bại");
    }
  }

  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h1 className="h1">Chi tiết hoạt động</h1>
          <p className="muted">{item ? `Mã: ${item.code || item.id}` : `ID: ${id}`}</p>
        </div>
        <div className="detail-actions">
          <Link className="btn btn-outline" to="/activities">Quay lại</Link>
          <button className="btn" type="button" onClick={onRegister}>Đăng ký</button>
          <button className="btn btn-outline" type="button" onClick={onCancel}>Hủy đăng ký</button>
        </div>
      </div>

      {err && <div className="notice">{err}</div>}
      {msg && <div className="notice">{msg}</div>}
      {loading && <div className="muted">Đang tải...</div>}

      {item && (
        <div className="detail-grid">
          <div className="panel">
            <div className="activity-title">{item.title}</div>
            <div className="muted activity-meta" style={{ marginTop: 8 }}>
              {item.type} • {item.unit}
            </div>
            <div className="muted activity-meta">
              {item.location} • {item.activity_date}
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="badge">{item.status}</span>
            </div>
          </div>

          <div className="panel">
            <div className="announce-title">Mô tả</div>
            <div className="muted" style={{ lineHeight: 1.65 }}>{item.description}</div>
          </div>
        </div>
      )}
    </div>
  );
}
