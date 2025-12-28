import { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { adminFetch } from "../services/adminApi";
import { getAdmin } from "../services/adminAuthService";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const admin = getAdmin();

  const [lastUpdated, setLastUpdated] = useState(null);
  const [regPeriod, setRegPeriod] = useState(7); // 7 / 14 / 30 days

  // Helper: pick a registrations series from stats by period
  const getRegistrationsSeries = (s, period) => {
    if (!s) return [];
    if (period === 7) return s.registrationsSeries7 || (s.registrationsSeries30 || []).slice(-7);
    if (period === 14) return s.registrationsSeries14 || (s.registrationsSeries30 || []).slice(-14);
    return s.registrationsSeries30 || [];
  };

  const registrationsSeries = getRegistrationsSeries(stats, regPeriod);
  const registrationsChartData = (registrationsSeries || []).map((r) => ({ date: r.date, count: r.count }));

  // Chart labels mapping (auto-choose Vietnamese titles/labels)
  const getChartLabels = (key) => {
    const map = {
      registrations: { title: 'Lượt đăng ký hoạt động', xLabel: 'Ngày', yLabel: 'Lượt đăng ký', tooltipLabel: 'Lượt đăng ký' },
      create_vs_with_registrations: { title: 'Số hoạt động: Tạo và Có đăng ký', yLabel: 'Số hoạt động', tooltipLabel: 'Số hoạt động' },
      top_activities: { title: 'Top hoạt động theo số người tham gia', yLabel: 'Số người tham gia', tooltipLabel: 'Người tham gia' },
    };
    return map[key] || { title: '', xLabel: '', yLabel: '', tooltipLabel: '' };
  };

  const regLabels = getChartLabels('registrations');
  const createLabels = getChartLabels('create_vs_with_registrations');
  const topLabels = getChartLabels('top_activities');

  const handleExportCSV = () => {
    // Build CSV: header + rows (date,count)
    const rows = ["date,count", ...(registrationsChartData || []).map((r) => `${r.date},${r.count}`)];
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `registrations_${regPeriod}d_${new Date().toISOString().slice(0,10)}.csv`;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      if (!mounted) return;
      setErr("");
      // only set loading for first fetch
      setLoading((cur) => (cur ? cur : true));
      try {
        const d = await adminFetch("/admin/dashboard");
        if (!mounted) return;
        setStats(d);
        // DEBUG: log stats payload to browser console to inspect series
        try { console.debug('AdminDashboard: fetched stats', d); } catch (e) {}
        setLastUpdated(new Date().toISOString());
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || "Không tải được thống kê");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    // initial fetch
    fetchStats();
    // poll every 60s to keep chart in sync with real-world time and server updates
    const id = setInterval(fetchStats, 60000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);




  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h1 className="h1">Dashboard quản trị</h1>
          <p className="muted">Xin chào, {admin?.fullName || admin?.email || "Admin"}</p>
          <div className="muted" style={{ fontSize: 13 }}>{lastUpdated ? `Cập nhật: ${new Date(lastUpdated).toLocaleDateString('vi-VN')}` : 'Chưa cập nhật'}</div>
        </div>


      </div>

      {err && <div className="notice">{err}</div>}
      {loading && <div className="muted">Đang tải...</div>}

      {stats && (
        <>
          <div className="adminStats" style={{ marginTop: 12 }}>
            <div className="card panel tile-user">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Người dùng</div>
              <div className="stat-number" style={{ fontSize: 28, marginTop: 8 }}>{stats.totalUsers ?? 0}</div>
            </div>

            <div className="card panel tile-activities">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Hoạt động (tổng)</div>
              <div className="stat-number" style={{ fontSize: 28, marginTop: 8 }}>{stats.totalActivities ?? 0}</div>
            </div>

            <div className="card panel tile-registrations">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14H6v-2h12v2zm0-4H6V9h12v4z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Đăng ký (tổng)</div>
              <div className="stat-number" style={{ fontSize: 28, marginTop: 8 }}>{stats.totalRegistrations ?? 0}</div>
            </div>

            <div className="card panel tile-open">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.3 4.5 3.2 5.7L7 20l5-2 5 2-1.2-5.3C17.7 13.5 19 11.4 19 9c0-3.9-3.1-7-7-7z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Hoạt động đang mở</div>
              <div style={{ fontSize: 28, marginTop: 8 }}>{stats.openActivities ?? 0}</div>
            </div>

            <div className="card panel tile-ongoing">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0-6v2h8v2h-8v2h8v12H4V6h8V2h0z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Hoạt động đang diễn ra</div>
              <div style={{ fontSize: 28, marginTop: 8 }}>{stats.ongoingActivities ?? 0}</div>
            </div>

            <div className="card panel tile-finished">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Hoạt động kết thúc</div>
              <div style={{ fontSize: 28, marginTop: 8 }}>{stats.finishedActivities ?? 0}</div>
            </div>

            <div className="card panel tile-news">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3v12h18V6zm-2 8H5V8h14v6zM7 10h6v2H7z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Tin tức</div>
              <div style={{ fontSize: 28, marginTop: 8 }}>{stats.totalNews ?? 0}</div>
            </div>

            <div className="card panel tile-active-members">
              <div className="tileIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm6 2h-1.2c-.8 0-1.6.3-2.2.7-.6.4-1.4.6-2.3.6s-1.7-.2-2.3-.6c-.6-.4-1.4-.7-2.2-.7H6c-1.1 0-2 .9-2 2v1h16v-1c0-1.1-.9-2-2-2z"/></svg>
              </div>
              <div className="h1" style={{ fontSize: 16 }}>Đoàn viên tích cực</div>
              <div style={{ fontSize: 28, marginTop: 8 }}>{stats.activeMembers ?? 0}</div>
            </div>
          </div>



          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card panel">
              <div className="h1" style={{ fontSize: 16 }}>{topLabels.title}</div>
              <div style={{ height: 220, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stats.topActivities || []).map((t) => ({ name: t.title, participants: Number(t.participants) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis label={{ value: topLabels.yLabel, angle: -90, position: 'insideLeft', offset: -8 }} />
                    <Tooltip formatter={(value) => [value, topLabels.tooltipLabel]} labelFormatter={(label) => label} />
                    <Bar dataKey="participants" fill="#f6c23e" animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: 12 }}>
                {(stats.topActivities || []).map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ flex: 1 }}>{t.title}</div>
                    <div style={{ width: 60, textAlign: 'right' }}>{t.participants}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card panel">
              <div className="h1" style={{ fontSize: 16 }}>Tỉ lệ tham gia</div>
              <div style={{ marginTop: 12 }}>
                <div className="stat-number" style={{ fontSize: 28 }}>{stats.participationRate ?? 0}%</div>
                <div className="muted">{stats.uniqueRegisteredUsers ?? 0} / {stats.totalUsers ?? 0} đoàn viên đã tham gia ít nhất 1 lần</div>

                <div style={{ height: 12, background: '#eee', borderRadius: 6, marginTop: 8 }}>
                  <div className="progressBarInner" style={{ height: '100%', width: `${Math.max(0, Math.min(100, stats.participationRate || 0))}%`, background: '#f6c23e', borderRadius: 6 }} />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="muted" style={{ fontSize: 12 }}>Ghi chú: 'Tỉ lệ tham gia' = số đoàn viên đã đăng ký ít nhất 1 lần / tổng đoàn viên</div>
              </div>
            </div>
          </div> 

          <div style={{ marginTop: 18 }}>
            <div className="card panel">
              <div className="h1" style={{ fontSize: 16 }}>{createLabels.title}</div>
              <div style={{ height: 220, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Tạo', value: stats.totalActivities ?? 0 },
                    { name: 'Có đăng ký', value: stats.activitiesWithRegistrations ?? 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: createLabels.yLabel, angle: -90, position: 'insideLeft', offset: -8 }} />
                    <Tooltip formatter={(value) => [value, createLabels.tooltipLabel]} labelFormatter={(label) => label} />
                    <Bar dataKey="value" fill="#f6c23e" animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="muted">{stats.activitiesWithRegistrations ?? 0} / {stats.totalActivities ?? 0} hoạt động có đăng ký</div>
              </div>
            </div> 

            {/* Registrations time series: 7 / 14 / 30 days */}
            <div className="card panel" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="h1" style={{ fontSize: 16 }}>{regLabels.title}</div>
                <div>
                  <button className={"btn " + (regPeriod === 7 ? 'btn-primary' : 'btn-outline')} type="button" onClick={() => setRegPeriod(7)}>7 ngày</button>
                  <button className={"btn " + (regPeriod === 14 ? 'btn-primary' : 'btn-outline')} type="button" onClick={() => setRegPeriod(14)} style={{ marginLeft: 8 }}>14 ngày</button>
                  <button className={"btn " + (regPeriod === 30 ? 'btn-primary' : 'btn-outline')} type="button" onClick={() => setRegPeriod(30)} style={{ marginLeft: 8 }}>30 ngày</button>
                  <button className="btn btn-ghost" type="button" onClick={handleExportCSV} style={{ marginLeft: 12 }}>Xuất CSV</button>
                </div>
              </div>

              <div style={{ height: 260, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={registrationsChartData} margin={{ top: 6, right: 12, left: 6, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => {
                      try { const dd = new Date(d); return `${dd.getDate()}/${dd.getMonth()+1}`; } catch (e) { return d; }
                    }} label={{ value: regLabels.xLabel, position: 'insideBottom', offset: -6 }} />
                    <YAxis allowDecimals={false} label={{ value: regLabels.yLabel, angle: -90, position: 'insideLeft', offset: -8 }} />
                    <Tooltip labelFormatter={(d) => {
                      try { return new Date(d).toLocaleDateString('vi-VN'); } catch (e) { return d; }
                    }} formatter={(value) => [value, regLabels.tooltipLabel]} />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} animationDuration={600} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>

        </>
      )}
    </div>
  );
}
