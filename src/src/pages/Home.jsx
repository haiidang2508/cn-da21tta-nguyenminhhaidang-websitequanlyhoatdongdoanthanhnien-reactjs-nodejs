import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as newsData from "../data/news";
import { activities as activitiesFallback } from "../data/activities";
import { apiFetch } from "../services/api";
import { assetUrl } from "../utils/assetUrl";
import { getActivities } from "../services/activityService";

export default function Home() {
  const [tab, setTab] = useState("Tin mới");
  const [q, setQ] = useState("");

  const [featured, setFeatured] = useState(newsData.featuredNews || {
    title: "",
    time: "",
    views: 0,
    excerpt: "",
    image: "",
    url: "#",
    tags: [],
    content: [],
  });
  const [latestNews, setLatestNews] = useState(newsData.latestNews || []);
  const [loadingNews, setLoadingNews] = useState(true);

  const [sidebarActivities, setSidebarActivities] = useState((activitiesFallback || []).slice(0, 4));
  const [loadingActivities, setLoadingActivities] = useState(true);

  const [newsList, setNewsList] = useState(newsData.latestNews || []);

  useEffect(() => {
    (async () => {
      setLoadingNews(true);
      try {
        // fetch featured
        const f = await apiFetch("/news/featured").catch(() => null);
        if (f) setFeatured({
          title: f.title,
          time: f.time,
          views: f.views,
          excerpt: f.excerpt,
          image: f.image,
          url: f.url,
          tags: f.tags,
          content: f.content,
        });

        // fetch latest two groups
        const groups = ["Tin mới", "Tin cơ sở"];

        // fetch a small list of activities for sidebar
        try {
          const acts = await getActivities();
          if (Array.isArray(acts) && acts.length > 0) {
            // sort by date descending and take first 4
            const sorted = acts.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
            setSidebarActivities(sorted.slice(0, 4));
          }
        } catch (err) {
          // ignore and keep fallback
        } finally {
          setLoadingActivities(false);
        }

        // fetch latest news for the main grid (fallback to local data)
        try {
          const list = await apiFetch('/news');
          if (Array.isArray(list) && list.length > 0) {
            // exclude featured (if present) and dedupe by id
            const dedup = list.filter((x) => x.id !== (f && f.id));
            setNewsList(dedup);
          }
        } catch (err) {
          // keep fallback news
        }
        const all = [];
        for (const g of groups) {
          try {
            const list = await apiFetch(`/news?group=${encodeURIComponent(g)}`);
            // ensure group field
            const mapped = (list || []).map((x) => ({ ...x, group: g }));
            all.push(...mapped);
          } catch (err) {
            // ignore and keep fallback
          }
        }
        if (all.length > 0) setLatestNews(all);
      } catch (err) {
        // ignore - keep fallbacks
      } finally {
        setLoadingNews(false);
      }
    })();
  }, []);

  // helper: format date string (show only date in vi-VN)
  function formatDateOnly(d) {
    if (!d) return "";
    // if already looks like DD/MM/YYYY, return as-is
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) return d;
    try {
      const parsed = new Date(d);
      if (isNaN(parsed)) return d;
      return parsed.toLocaleDateString('vi-VN');
    } catch { return d; }
  }

  const filteredRightNews = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return latestNews
      .filter((x) => x.group === tab)
      .filter((x) => (keyword ? (x.title || "").toLowerCase().includes(keyword) : true))
      .slice(0, 6);
  }, [tab, q, latestNews]);

  // Show only upcoming or ongoing activities in the sidebar
  const displayedActivities = (sidebarActivities || []).filter((a) => /Sắp|Đang/i.test(a.status)).slice(0, 4);

  return (
    <div className="home2">
      {/* LEFT: Featured */}
      <section className="home2-left">
        <div className="home2-sectionTitle">
          <span className="home2-icon home2-icon--danger" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.9 5.88L21 9.24l-4.5 3.9L17.8 21 12 17.77 6.2 21l1.3-7.86L3 9.24l6.1-1.36L12 2z"/></svg>
          </span>
          <span>Tiêu điểm</span>
        </div>

        <article className="card home2-feature fadeInUp">
          <h1 className="home2-title">{featured?.title || ""}</h1>

          <div className="home2-meta">
            <span>{formatDateOnly(featured?.time)}</span>
            {!!featured?.views && featured.views > 0 && (
              <>
                <span className="home2-sep">•</span>
                <span>{featured.views} lượt xem</span>
              </>
            )}
          </div>

          <div className="home2-tags">
            {(featured?.tags || []).map((t) => (
              <span key={t} className="pill">{t}</span>
            ))}
          </div>

          <p className="home2-excerpt">{featured?.excerpt}</p>

          <a
            href={featured?.url || "#"}
            target="_blank"
            rel="noreferrer"
            className="home2-imgWrap"
            title="Mở bài viết chính thức"
          >
            {(featured?.image || featured?.image_url) ? (
              <img className="home2-img" src={featured?.image || featured?.image_url} alt={featured?.title || ""} />
            ) : (
              <div className="home2-img noImage" aria-hidden="true" />
            )}
          </a>

          <div className="home2-content">
            {(featured?.content || []).map((p, idx) => (
              <p key={idx} className="home2-paragraph">{p}</p>
            ))}
          </div>

          <div className="actions" style={{ marginTop: 12 }}>
            <a className="btn" href={featured?.url || "#"} target="_blank" rel="noreferrer">
              Xem bài viết chính thức
            </a>
            <a className="btn btn-outline" href="https://doanthanhnien.tvu.edu.vn/" target="_blank" rel="noreferrer">
              Trang Đoàn TVU
            </a>
          </div>
        </article>

        {/* News grid (two-column) */}
        <section className="home2-newsGridSection fadeInUp">
          <div className="home2-sectionTitle" style={{ marginTop: 18 }}>
            <span className="home2-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18"/><path d="M7 12h6"/></svg>
            </span>
            <span>Tin tức</span>
          </div>

          <div className="home2-newsGrid">
            { (newsList || []).slice(0, 8).map((n) => {
              const img = n.image || n.image_url;
              const imgSrc = img ? assetUrl(img) : null;
              const hrefVal = n.url ? n.url : `/news/${n.id}`;
              const target = n.url ? "_blank" : "_self";
              return (
                <a key={n.id} className="newsGridItem" href={hrefVal} target={target} rel={n.url ? "noreferrer" : undefined} title={n.title}>
                  {img ? <img className="newsGridThumb" src={imgSrc} alt={n.title} /> : <div className="newsGridThumb noImage" aria-hidden="true" />}
                  <div className="newsGridBody">
                    <div className="newsGridTitle">{n.title}</div>
                    <div className="newsGridDate">{formatDateOnly(n.date || n.time)}</div>
                  </div>
                </a>
              );
            }) }

            {/* Fill to at least 6 cards so layout doesn't look empty */}
            {Array.from({ length: Math.max(0, 6 - (newsList || []).slice(0,8).length) }).map((_, idx) => (
              <a key={`ph-${idx}`} className="newsGridItem placeholder" href="/news" title="Xem thêm tin tức">
                <div className="newsGridThumb noImage" aria-hidden="true" />
                <div className="newsGridBody">
                  <div className="newsGridTitle muted">Xem thêm tin tức</div>
                  <div className="newsGridDate muted">Truy cập trang Tin tức</div>
                </div>
              </a>
            ))}

            { (newsList || []).length > 8 && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Link to="/news" className="btn btn-outline">Xem thêm tin tức</Link>
              </div>
            ) }
          </div>
        </section>
      </section>

      {/* RIGHT: Sidebar */}
      <aside className="home2-right">
        {/* Search */}
        <div className="card home2-sideCard fadeInUp" style={{ padding: 14 }}>
          <div className="home2-search">
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm tin tức..."
            />
            <button className="btn home2-searchBtn" type="button" aria-label="Tìm kiếm">
              🔍
            </button>
          </div>
        </div>

        {/* Tabs + List (blue box like screenshot) */}
        <div className="card home2-sideCard newsBox fadeInUp">
          <div className="home2-tabs">
            <button
              className={tab === "Tin mới" ? "tab active" : "tab"}
              onClick={() => setTab("Tin mới")}
              type="button"
            >
              TIN MỚI
            </button>
            <button
              className={tab === "Tin cơ sở" ? "tab active" : "tab"}
              onClick={() => setTab("Tin cơ sở")}
              type="button"
            >
              TIN TỨC
            </button>
          </div>

          <div className="home2-list">
            {loadingNews ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, padding: 10 }}>
                  <div className="skeleton shimmer" style={{ width: 72, height: 54, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton shimmer" style={{ width: '60%', height: 16, marginBottom: 8 }} />
                    <div className="skeleton shimmer" style={{ width: '40%', height: 12 }} />
                  </div>
                </div>
              ))
            ) : (
            <>
              {filteredRightNews.map((x) => {
                const img = x.image || x.image_url;
                return (
                <a
                  key={x.id}
                  className="home2-item linkItem"
                  href={x.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Mở bài viết chính thức"
                >
                  {img ? <img className="home2-thumb" src={img} alt={x.title} /> : <div className="home2-thumb noImage" aria-hidden="true" />}
                  <div className="home2-itemBody">
                    <div className="home2-itemTitle">{x.title}</div>
                    <div className="muted">{formatDateOnly(x.date || x.time)}</div>
                  </div>
                </a>
                );
              })}

              {Array.from({ length: Math.max(0, 3 - filteredRightNews.length) }).map((_, i) => (
                <a key={`phside-${i}`} className="home2-item linkItem placeholder" href="/news">
                  <div className="home2-thumb noImage" aria-hidden="true" />
                  <div className="home2-itemBody">
                    <div className="home2-itemTitle muted">Xem thêm tin tức</div>
                    <div className="muted">Truy cập trang Tin tức</div>
                  </div>
                </a>
              ))}
            </>
            ) }

            {!loadingNews && filteredRightNews.length === 0 && (
              <div className="muted" style={{ padding: 10 }}>
                Không có kết quả phù hợp.
              </div>
            )}
          </div>
        </div>

        {/* Activities */}
        <div className="card home2-sideCard activitiesBox fadeInUp">
          <div className="home2-sectionTitle" style={{ marginBottom: 8 }}>
            <span className="home2-icon home2-icon--primary" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M16 2v4M8 2v4"/></svg>
            </span>
            <span>Hoạt động</span>
          </div>

          <div className="home2-list">
            {loadingActivities ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10 }}>
                  <div className="skeleton shimmer" style={{ width: '80%', height: 14 }} />
                  <div className="skeleton shimmer" style={{ width: '40%', height: 12 }} />
                </div>
              ))
            ) : (
              (displayedActivities || []).map((a) => {
                const statusClass = /Đang/i.test(a.status) ? 'open' : /Sắp/i.test(a.status) ? 'upcoming' : 'other';
                return (
                  <Link key={a.id} className="home2-item linkItem" to={`/activities/${a.id}`} title={a.title} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className={`activityDot ${statusClass}`} aria-hidden="true" />
                    <div className="home2-itemBody">
                      <div className="home2-itemTitle">{a.title}</div>
                      <div style={{ marginTop: 6 }}>
                        <span className={`statusPill ${statusClass}`}>{a.status}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}

            {!loadingActivities && (displayedActivities || []).length === 0 && (
              <div className="muted" style={{ padding: 10 }}>
                Không có hoạt động.
              </div>
            )}

            {/* See more if there are more upcoming activities */}
            {((sidebarActivities || []).filter((a) => /Sắp|Đang/i.test(a.status)).length > displayedActivities.length) && (
              <div style={{ padding: 10, textAlign: 'center' }}>
                <Link to="/activities" className="btn btn-outline">Xem thêm</Link>
              </div>
            )}
          </div>
        </div>

        {/* Media */}
        <div className="card home2-sideCard">
          <div className="home2-mediaTabs">
            <div className="mediaTag">VIDEO</div>
            <div className="mediaTag mediaTagOutline">AUDIO</div>
          </div>

          {(newsData.mediaItems || []).map((m) => (
            <a
              key={m.id}
              className="home2-media linkMedia"
              href={m.url}
              target="_blank"
              rel="noreferrer"
              title="Mở nội dung"
            >
              <div className="home2-mediaThumb">
                <img src={m.thumb} alt={m.title} />
                <div className="play">▶</div>
              </div>
              <div className="home2-mediaTitle">
                <b>{m.type}:</b> {m.title}
              </div>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}
