import { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { adminFetch } from "../../services/adminApi";

export default function SecretaryDashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      try {
        const d = await adminFetch('/admin/dashboard');
        if (!mounted) return;
        setStats(d);
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Không tải được thống kê');
      }
    }
    fetchStats();
    return () => { mounted = false; };
  }, []);

  if (err) return <div className="notice">{err}</div>;

  return (
    <div>
      <div className="card panel">
        <div className="h1" style={{ fontSize: 16 }}>Tổng hoạt động</div>
        <div className="stat-number" style={{ fontSize: 32, marginTop: 8 }}>{stats?.totalActivities ?? 0}</div>
        <div className="muted" style={{ marginTop: 8 }}>{stats?.activitiesWithRegistrations ?? 0} / {stats?.totalActivities ?? 0} hoạt động có đăng ký</div>
      </div>

      <div style={{ marginTop: 12 }} className="card panel">
        <div className="h1" style={{ fontSize: 16 }}>Top hoạt động có nhiều người tham gia</div>
        <div style={{ height: 240, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(stats?.topActivities || []).map((t) => ({ name: t.title, participants: Number(t.participants) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="participants" fill="#f6c23e" animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}