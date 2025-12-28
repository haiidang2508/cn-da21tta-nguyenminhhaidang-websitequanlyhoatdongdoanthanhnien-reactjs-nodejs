const express = require('express');
const pool = require('../db');

const router = express.Router();

// Public GET list: /api/forms
router.get('/forms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, url, created_at FROM forms ORDER BY created_at DESC');
    return res.json({ items: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;