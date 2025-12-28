const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

(async function ensureFormsTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS forms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(1024) NOT NULL,
      url VARCHAR(2048) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  } catch (err) {
    console.warn('admin.forms.routes: could not ensure forms table', String(err.message || err));
  }
})();

// GET list: /api/admin/forms
router.get('/forms', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
    return res.json({ items: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// POST create
router.post('/forms', requireAuth, requireAdmin, async (req, res) => {
  const { title, url } = req.body || {};
  if (!url || !title) return res.status(400).json({ message: 'Missing title or url' });
  try {
    const [insert] = await pool.query('INSERT INTO forms (title, url) VALUES (?, ?)', [title, url]);
    const [rows] = await pool.query('SELECT * FROM forms WHERE id = ?', [insert.insertId]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// PUT update
router.put('/forms/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, url } = req.body || {};
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM forms WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    await pool.query('UPDATE forms SET title = ?, url = ? WHERE id = ?', [title || rows[0].title, url || rows[0].url, id]);
    const [updated] = await pool.query('SELECT * FROM forms WHERE id = ?', [id]);
    return res.json(updated[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// DELETE
router.delete('/forms/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM forms WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    await pool.query('DELETE FROM forms WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;