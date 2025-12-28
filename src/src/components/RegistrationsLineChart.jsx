import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Helpers
function toISODate(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

function formatShortDateVi(d) {
  if (!d) return "";
  try {
    const dt = new Date(`${d}T00:00:00`);
    return dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch (e) {
    return d;
  }
}

// get week start date (Mon) in ISO YYYY-MM-DD
function weekStartISO(d) {
  const dt = new Date(`${d}T00:00:00`);
  const day = dt.getDay(); // 0 sun, 1 mon...
  const diff = (day === 0 ? -6 : 1 - day); // move to Monday
  dt.setDate(dt.getDate() + diff);
  return toISODate(dt);
}

export default function RegistrationsLineChart({ stats = null, defaultPeriod = 30, hideTitle = false }) {
  const [period, setPeriod] = useState(defaultPeriod); // days count
  const [granularity, setGranularity] = useState("day"); // day | week | month
  // fixed date-range support (from today to end date ISO string)
  const [fixedRangeEnd, setFixedRangeEnd] = useState(null); // e.g. '2026-03-31'
  // sample preview mode (auto-enabled when backend reports dbError)
  const [sampleMode, setSampleMode] = useState(false);

  // track whether the user manually changed controls; if true, we won't auto-select
  const userInteracted = useRef(false);
  const markUserInteracted = () => { userInteracted.current = true; };

  // Do not auto-enable sample mode. Prefer server data by default.
  // If the backend reports a DB error, the user can manually enable sample preview.
  useEffect(() => {
    if (!stats) return;
    // When server provides healthy stats (no dbError), ensure sample mode is off
    if (!stats.dbError) setSampleMode(false);
  }, [stats]);

  // auto-select best period/granularity when real data arrives (only if user hasn't interacted)
  useEffect(() => {
    if (!stats || userInteracted.current) return;
    try {
      const series = stats.registrationsSeries30 || [];
      const daysWithActivity = series.filter((s) => Number(s.count || 0) > 0).length;
      if (daysWithActivity === 0) return;
      if (daysWithActivity >= 20) {
        setPeriod(30);
        setGranularity('day');
      } else if (daysWithActivity >= 8) {
        setPeriod(14);
        setGranularity('day');
      } else {
        setPeriod(7);
        setGranularity('day');
      }
    } catch (e) {
      // ignore
    }
  }, [stats]);

  // deterministic sample generator for previewing the chart when DB is down
  function generateSampleDaily(days, endISO) {
    const out = [];
    const end = new Date(`${endISO}T00:00:00`);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = toISODate(d);
      const idx = days - i;
      // deterministic pattern: base + wave + occasional spikes
      const base = 3 + Math.floor((idx % 7) / 2);
      const wave = Math.round(Math.sin(idx / 3) * 4);
      const spike = (idx % 11 === 0) ? 8 : 0;
      const count = Math.max(0, base + wave + spike);
      out.push({ date: key, count });
    }
    return out;
  }



  // pick the base daily series from stats: prefer registrationsSeries30 if available
  const baseDailySeries = useMemo(() => {
    if (!stats) return [];
    // prefer a full 30-day series, otherwise try to construct from available series
    const s30 = stats.registrationsSeries30;
    if (s30 && s30.length) return s30.slice();
    // fallback: combine 14/7
    if (stats.registrationsSeries14 && stats.registrationsSeries14.length) return stats.registrationsSeries14.slice();
    if (stats.registrationsSeries7 && stats.registrationsSeries7.length) return stats.registrationsSeries7.slice();
    return [];
  }, [stats]);

  // determine endDate: prefer fixedRangeEnd if provided, otherwise pick last date from baseDailySeries if present, otherwise local today
  const endDateISO = useMemo(() => {
    if (fixedRangeEnd) return fixedRangeEnd;
    if (baseDailySeries.length > 0) {
      const last = baseDailySeries[baseDailySeries.length - 1];
      try { return toISODate(last.date); } catch (e) {}
    }
    return toISODate(new Date());
  }, [baseDailySeries, fixedRangeEnd]);

  // effective series: either use sample generator (when sampleMode) else use base from server
  const effectiveBaseDailySeries = useMemo(() => {
    if (sampleMode) return generateSampleDaily(period, endDateISO);
    return baseDailySeries;
  }, [sampleMode, baseDailySeries, period, endDateISO]);

  // generate a strict daily array. If fixedRangeEnd is set, generate from today -> fixedRangeEnd (inclusive).
  const normalizedDaily = useMemo(() => {
    const map = new Map((effectiveBaseDailySeries || []).map((r) => [toISODate(r.date), Number(r.count || 0)]));
    const out = [];

    if (fixedRangeEnd) {
      const startISO = toISODate(new Date());
      const start = new Date(`${startISO}T00:00:00`);
      const end = new Date(`${endDateISO}T00:00:00`);
      // if start is after end, return empty
      if (start > end) return [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toISODate(d);
        out.push({ date: key, count: map.has(key) ? map.get(key) : 0 });
      }
      return out;
    }

    // default: period days ending at endDateISO
    const end = new Date(`${endDateISO}T00:00:00`);
    end.setHours(0,0,0,0);
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = toISODate(d);
      out.push({ date: key, count: map.has(key) ? map.get(key) : 0 });
    }
    return out;
  }, [effectiveBaseDailySeries, period, endDateISO, fixedRangeEnd]);

  // aggregate based on granularity
  const aggregated = useMemo(() => {
    if (granularity === "day") return normalizedDaily.map((d) => ({ date: d.date, count: Number(d.count || 0) }));

    if (granularity === "week") {
      const groups = new Map();
      for (const d of normalizedDaily) {
        const wk = weekStartISO(d.date);
        groups.set(wk, (groups.get(wk) || 0) + Number(d.count || 0));
      }
      const keys = Array.from(groups.keys()).sort();
      return keys.map((k) => ({ date: k, count: groups.get(k) }));
    }

    // month
    const groups = new Map();
    for (const d of normalizedDaily) {
      const dt = new Date(`${d.date}T00:00:00`);
      const key = `${String(dt.getFullYear())}-${String(dt.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      groups.set(key, (groups.get(key) || 0) + Number(d.count || 0));
    }
    const keys = Array.from(groups.keys()).sort();
    return keys.map((k) => ({ date: k, count: groups.get(k) }));
  }, [normalizedDaily, granularity]);

  // compute Y ticks and adjMax (always include zero baseline)
  const { ticks, adjMax } = useMemo(() => {
    const values = aggregated.map((s) => Number(s.count || 0));
    const max = Math.max(...values, 0);
    const steps = 4;
    const step = Math.max(1, Math.ceil(Math.max(max, steps) / steps));
    const adj = step * steps;
    const t = [];
    for (let i = 0; i <= steps; i++) t.push(i * step);
    return { ticks: t, adjMax: Math.max(adj, 1) };
  }, [aggregated]);

  // decide whether to show small dots on points (avoid too many dots on long series)
  const showDots = aggregated.length <= 60;

  const allZero = useMemo(() => aggregated.every((s) => Number(s.count || 0) === 0), [aggregated]);

  useEffect(() => {
    // DEBUG: inspect series for troubleshooting empty chart state
    try {
      // eslint-disable-next-line no-console
      console.debug('RegistrationsLineChart DEBUG', { period, granularity, sampleMode, fixedRangeEnd, fixedRangeStart: toISODate(new Date()), baseDailySeriesLength: (baseDailySeries||[]).length, baseDailySeriesSample: (baseDailySeries||[]).slice(-5), normalizedDailySample: normalizedDaily.slice(-5), aggregatedSample: aggregated.slice(-8), allZero });
    } catch (e) {
      // ignore
    }
  }, [period, granularity, baseDailySeries, normalizedDaily, aggregated, allZero, sampleMode, fixedRangeEnd]);

  function downloadCSV() {
    if (!aggregated || aggregated.length === 0) return;
    const header = "label,count\n";
    const rows = aggregated.map((r) => `${r.date},${r.count || 0}`).join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations_${period}d_${granularity}${sampleMode ? '_sample' : ''}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // X-axis formatter depending on granularity
  const xTickFormatter = (d) => {
    if (!d) return "";
    if (granularity === "day") return formatShortDateVi(d);
    if (granularity === "week") {
      // show week start in dd/mm
      return formatShortDateVi(d);
    }
    // month: format as MM/YYYY
    if (/^\d{4}-\d{2}$/.test(d)) {
      const [y, m] = d.split("-");
      return `${m}/${y}`;
    }
    return d;
  };

  const tooltipLabelFormatter = (label) => {
    if (!label) return "";
    if (granularity === "day") return new Date(`${label}T00:00:00`).toLocaleDateString('vi-VN');
    if (granularity === "week") {
      // show range: start - end
      const start = new Date(`${label}T00:00:00`);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;
    }
    // month
    if (/^\d{4}-\d{2}$/.test(label)) {
      const [y, m] = label.split('-');
      const dt = new Date(Number(y), Number(m) - 1, 1);
      return dt.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    }
    return label;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!hideTitle && <div className="h1" style={{ fontSize: 16 }}>Lượt đăng ký theo thời gian</div>}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className={`btn ${period === 7 ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setPeriod(7); }}>7 ngày</button>
            <button className={`btn ${period === 14 ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setPeriod(14); }}>14 ngày</button>
            <button className={`btn ${period === 30 ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setPeriod(30); }}>30 ngày</button>
            <button className={`btn ${period === 90 ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setFixedRangeEnd(null); setPeriod(90); }}>90 ngày</button>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className={`btn ${fixedRangeEnd ? '' : 'btn-outline'}`} onClick={() => {
              if (fixedRangeEnd) { markUserInteracted(); setFixedRangeEnd(null); setPeriod(30); return; }
              // toggle to fixed end date March 31 2026
              const end = '2026-03-31';
              const startISO = toISODate(new Date());
              const days = Math.ceil((new Date(`${end}T00:00:00`) - new Date(`${startISO}T00:00:00`)) / (1000*60*60*24)) + 1;
              markUserInteracted();
              setFixedRangeEnd(end);
              setPeriod(Math.max(1, days));
              setGranularity('day');
            }}>Đến 03/2026</button>

            <button className={`btn ${fixedRangeEnd === (function(){ const end = toISODate(new Date(Date.now()+30*24*60*60*1000)); return end; })() ? '' : 'btn-outline'}`} onClick={() => {
              // toggle to fixed window from today -> today + 30 days inclusive
              const startISO = toISODate(new Date());
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + 30);
              const endISO = toISODate(endDate);
              if (fixedRangeEnd === endISO) { markUserInteracted(); setFixedRangeEnd(null); setPeriod(30); return; }
              const days = Math.ceil((new Date(`${endISO}T00:00:00`) - new Date(`${startISO}T00:00:00`)) / (1000*60*60*24)) + 1;
              markUserInteracted();
              setFixedRangeEnd(endISO);
              setPeriod(Math.max(1, days));
              setGranularity('day');
            }}>30 ngày tới</button>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className={`btn ${granularity === 'day' ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setGranularity('day'); }}>Ngày</button>
            <button className={`btn ${granularity === 'week' ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setGranularity('week'); }}>Tuần</button>
            <button className={`btn ${granularity === 'month' ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setGranularity('month'); }}>Tháng</button>
            <button className="btn btn-outline" onClick={downloadCSV}>Tải CSV</button>
            <button className={`btn ${sampleMode ? '' : 'btn-outline'}`} onClick={() => { markUserInteracted(); setSampleMode((s) => !s); }} disabled={!(stats && stats.dbError)} title={!stats || !stats.dbError ? 'Dữ liệu mẫu khả dụng khi có lỗi cơ sở dữ liệu' : ''}>{sampleMode ? 'Dữ liệu mẫu: Bật' : 'Dữ liệu mẫu'}</button>
          </div>
        </div>
      </div>

      <div style={{ height: 300, marginTop: 12 }}>
        {stats && stats.dbError && (
          <div className="small" style={{ color: 'var(--danger,#c53030)', textAlign: 'center', marginBottom: 8 }}>
            Cảnh báo: không thể truy vấn cơ sở dữ liệu — biểu đồ sẽ hiển thị dữ liệu thực khi DB sẵn sàng. Bạn có thể bật "Dữ liệu mẫu" để xem ví dụ.
          </div>
        )}

        {aggregated.length === 0 ? (
          <div className="emptyState">Không có dữ liệu để hiển thị</div>
        ) : (
          <>
            {sampleMode && (
              <div className="small" style={{ color: 'var(--admin-accent)', textAlign: 'center', marginBottom: 8 }}>Đang hiển thị dữ liệu mẫu (không phải dữ liệu thực)</div>
            )}

            {allZero && (
              <div className="small muted" style={{ textAlign: 'center', marginBottom: 8 }}>Không có đăng ký trong khoảng thời gian này — hiển thị đường 0.</div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aggregated} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,150,80,0.06)" />
                <XAxis dataKey="date" tickFormatter={xTickFormatter} interval={(() => {
                  if (granularity === 'day') return Math.max(0, Math.floor(aggregated.length / 7));
                  if (granularity === 'week') return Math.max(0, Math.floor(aggregated.length / 4));
                  // month or others
                  return Math.max(0, Math.floor(aggregated.length / 6));
                })()} />
                <YAxis domain={[0, adjMax]} ticks={ticks} allowDecimals={false} />
                <Tooltip labelFormatter={tooltipLabelFormatter} formatter={(v) => [v, 'Đăng ký']} />

                <Area type="monotone" dataKey="count" stroke="#16a34a" fill="rgba(22,163,74,0.12)" strokeWidth={2} />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={showDots ? { r: 3 } : false} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
