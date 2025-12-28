const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const path = require('path');
const fs = require('fs');
let upload = null;
try {
  const multer = require('multer');
  const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'news');
  fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
      const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, Date.now() + '_' + safe);
    }
  });
  upload = multer({ storage });
} catch (e) {
  // multer not installed; file uploads won't be available
  upload = null;
}

// Ensure optional admin columns exist (safe for dev environments)
(async function ensureNewsColumns() {
  try {
    const cols = [
      { name: 'excerpt', sql: 'ALTER TABLE news ADD COLUMN excerpt TEXT' },
      { name: 'content', sql: 'ALTER TABLE news ADD COLUMN content LONGTEXT' },
      { name: 'author', sql: 'ALTER TABLE news ADD COLUMN author VARCHAR(255)' },
      { name: 'image_url', sql: 'ALTER TABLE news ADD COLUMN image_url VARCHAR(1024)' },
      { name: 'published', sql: 'ALTER TABLE news ADD COLUMN published TINYINT DEFAULT 0' },
      { name: 'publish_date', sql: 'ALTER TABLE news ADD COLUMN publish_date DATETIME NULL' },
    ];

    for (const col of cols) {
      try {
        const [rows] = await pool.query('SHOW COLUMNS FROM news LIKE ?', [col.name]);
        if (!rows || rows.length === 0) {
          await pool.query(col.sql);
        }
      } catch (e) {
        // ignore per-column failures (e.g., lacking ALTER perms)
        console.warn('admin.news.routes: could not add column', col.name, String(e.message || e));
      }
    }
  } catch (err) {
    // ignore - in case DB user doesn't have alter permissions or table schema differs
    console.warn('admin.news.routes: could not ensure columns', String(err.message || err));
  }
})();

// GET /api/admin/news
router.get('/news', requireAuth, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, q } = req.query;
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Number(limit));
  const offset = (p - 1) * l;

  try {
    let where = '';
    const params = [];
    if (q) {
      where = ' WHERE LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(author) LIKE ?';
      const qv = `%${String(q).toLowerCase()}%`;
      params.push(qv, qv, qv);
    }

    const [rows] = await pool.query(`SELECT SQL_CALC_FOUND_ROWS * FROM news${where} ORDER BY publish_date DESC LIMIT ? OFFSET ?`, [...params, l, offset]);
    const [[countObj]] = await pool.query('SELECT FOUND_ROWS() AS total');
    return res.json({ items: rows, total: countObj.total || 0 });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// GET /api/admin/news/:id
router.get('/news/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// POST /api/admin/news
router.post('/news', requireAuth, requireAdmin, upload ? upload.single('image') : (req, res, next) => next(), async (req, res) => {
  // Support both multipart (file) and JSON
  const { title, excerpt, content, author, published, publish_date, group_name, article_url } = req.body || {};
  let image_url = (req.body && req.body.image_url) || null;
  if (req.file) {
    // Save relative path
    const rel = `/uploads/news/${req.file.filename}`;
    image_url = rel;
  }

  if (!title) return res.status(400).json({ message: 'Missing title' });

  try {
    const [result] = await pool.query(
      'INSERT INTO news (title, excerpt, content, author, image_url, published, publish_date, group_name, article_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, excerpt || null, content || null, author || null, image_url || null, published ? 1 : 0, publish_date || new Date(), group_name || null, article_url || null]
    );
    const [row] = await pool.query('SELECT * FROM news WHERE id = ?', [result.insertId]);
    return res.json(row[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// PUT /api/admin/news/:id
router.put('/news/:id', requireAuth, requireAdmin, upload ? upload.single('image') : (req, res, next) => next(), async (req, res) => {
  const id = req.params.id;
  const { title, excerpt, content, author, published, publish_date, group_name, article_url } = req.body || {};
  let image_url = (req.body && req.body.image_url) || null;
  if (req.file) {
    image_url = `/uploads/news/${req.file.filename}`;
  }
  try {
    await pool.query(
      'UPDATE news SET title=?, excerpt=?, content=?, author=?, image_url=?, published=?, publish_date=?, group_name=?, article_url=? WHERE id=?',
      [title, excerpt || null, content || null, author || null, image_url || null, published ? 1 : 0, publish_date || null, group_name || null, article_url || null, id]
    );
    const [row] = await pool.query('SELECT * FROM news WHERE id = ?', [id]);
    return res.json(row[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// DELETE /api/admin/news/:id
router.delete('/news/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM news WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;
