const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/news/featured
 */
router.get("/featured", async (req, res) => {
  try {
    const [featuredRows] = await pool.query("SELECT * FROM featured_news LIMIT 1");
    if (featuredRows.length === 0) return res.json(null);

    const featured = featuredRows[0];

    const [tagsRows] = await pool.query(
      "SELECT tag FROM featured_news_tags WHERE featured_id = ?",
      [featured.id]
    );

    const [contentRows] = await pool.query(
      "SELECT paragraph FROM featured_news_content WHERE featured_id = ?",
      [featured.id]
    );

    return res.json({
      id: featured.id,
      title: featured.title,
      time: featured.publish_time,
      views: featured.views,
      excerpt: featured.excerpt,
      image: featured.image_url,
      url: featured.article_url,
      tags: tagsRows.map((t) => t.tag),
      content: contentRows.map((c) => c.paragraph),
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", detail: String(err.message || err) });
  }
});

/**
 * GET /api/news?group=Tin%20mới&q=
 */
router.get("/", async (req, res) => {
  const { group, q } = req.query;

  try {
    let sql = "SELECT * FROM news WHERE 1=1";
    const params = [];

    if (group) { sql += " AND group_name = ?"; params.push(group); }
    if (q) { sql += " AND LOWER(title) LIKE ?"; params.push(`%${String(q).toLowerCase()}%`); }

    sql += " ORDER BY publish_date DESC";
    const [rows] = await pool.query(sql, params);

    // map fields cho giống frontend bạn đang dùng
    const mapped = rows.map((x) => ({
      id: x.id,
      group: x.group_name,
      title: x.title,
      date: x.publish_date,     // YYYY-MM-DD
      image: x.image_url,
      url: x.article_url,
    }));

    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ message: "Server error", detail: String(err.message || err) });
  }
});

/**
 * GET /api/news/:id  -- public detail page
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const x = rows[0];
    return res.json({
      id: x.id,
      title: x.title,
      content: x.content,
      author: x.author,
      publish_date: x.publish_date,
      image_url: x.image_url,
      article_url: x.article_url,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;
