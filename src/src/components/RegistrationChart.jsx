import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

// helper: normalize to YYYY-MM-DD
function toISODate(d) {
  const dt = new Date(d);
  dt.setHours(0,0,0,0);
  return dt.toISOString().slice(0,10);
}

export default function RegistrationChart({ series = [], days = 7, onChangeDays, height = 260 }) {
  // helper: format short date (localized DD/MM)
  const formatShortDate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(`${d}T00:00:00`);
      return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch (err) {
      return d;
    }
  };

  // normalize series to ensure it ends at server/latest date or local today (whichever is later)
  const normalizedSeries = useMemo(() => {
    const map = new Map((series || []).map((s) => [toISODate(s.date), Number(s.count || 0)]));

    // derive serverLastDate from series if available
    let serverLastDate = null;
    if (series && series.length > 0) {
      try {
        const last = series[series.length - 1];
        serverLastDate = new Date(`${String(last.date)}T00:00:00`);
        serverLastDate.setHours(0, 0, 0, 0);
      } catch (e) {
        serverLastDate = null;
      }
    }

    // choose endDate = max(localToday, serverLastDate)
    const localToday = new Date();
    localToday.setHours(0, 0, 0, 0);
    let endDate = localToday;
    if (serverLastDate && serverLastDate.getTime() > localToday.getTime()) endDate = serverLastDate;

    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: map.has(key) ? map.get(key) : 0 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('registrationChart: normalizedSeries', { days, endDate: endDate.toISOString().slice(0,10), out });
    }

    return out;
  }, [series, days]);

  // compute y ticks and adj max based on normalized series
  const { ticks, adjMax } = useMemo(() => {
    const values = (normalizedSeries || []).map((s) => Number(s.count || 0));
    const max = Math.max(...values, 0);
    const steps = 4;
    const step = Math.max(1, Math.ceil(Math.max(max, steps) / steps));
    const adj = step * steps;
    const t = [];
    for (let i = 0; i <= steps; i++) t.push(i * step);
    return { ticks: t, adjMax: adj };
  }, [normalizedSeries]);

  const allZero = useMemo(() => (normalizedSeries || []).every((s) => Number(s.count || 0) === 0), [normalizedSeries]);

  function downloadCSV() {
    if (!normalizedSeries || normalizedSeries.length === 0) return;
    const header = "date,count\n";
    const rows = normalizedSeries.map((r) => `${r.date},${r.count || 0}`).join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations_${days}d.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="h1" style={{ fontSize: 16 }}>Số đăng ký theo thời gian</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className={`btn ${days === 7 ? "" : "btn-outline"}`} onClick={() => onChangeDays?.(7)}>7 ngày</button>
          <button className={`btn ${days === 14 ? "" : "btn-outline"}`} onClick={() => onChangeDays?.(14)}>14 ngày</button>
          <button className={`btn ${days === 30 ? "" : "btn-outline"}`} onClick={() => onChangeDays?.(30)}>30 ngày</button>
          <button className="btn btn-outline" onClick={downloadCSV}>Tải CSV</button>
        </div>
      </div>

      <div style={{ height, marginTop: 12 }}>
        {allZero ? (
          <div className="emptyState">Không có đăng ký trong khoảng thời gian này</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={normalizedSeries} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,150,80,0.06)" />
              <XAxis dataKey="date" tickFormatter={(d) => formatShortDate(d)} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, adjMax]} ticks={ticks} allowDecimals={false} />
              <Tooltip labelFormatter={(label) => {
                if (!label) return "";
                try { return new Date(`${label}T00:00:00`).toLocaleDateString('vi-VN'); } catch (e) { return label; }
              }} formatter={(v) => [v, 'Đăng ký']} />

              <Bar dataKey="count" barSize={18} fill="#f6c23e" opacity={0.9} />
              <Area type="monotone" dataKey="count" stroke="#16a34a" fill="url(#g1)" strokeWidth={2} dot={{ r: 3 }} />

              <Legend verticalAlign="top" align="right" wrapperStyle={{ right: 8, top: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
