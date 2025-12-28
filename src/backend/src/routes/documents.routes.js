const express = require('express');
const pool = require('../db');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Public GET list: /api/documents?source=doan-ktcn
router.get('/documents', async (req, res) => {
  try {
    const { source, q, page = 1, limit = 100 } = req.query;
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const offset = (p - 1) * l;

    let where = '';
    const params = [];
    if (source) {
      where += (where ? ' AND ' : ' WHERE ') + 'source = ?';
      params.push(source);
    }
    if (q) {
      where += (where ? ' AND ' : ' WHERE ') + '(LOWER(title) LIKE ?)';
      params.push(`%${String(q).toLowerCase()}%`);
    }

    const [rows] = await pool.query(`SELECT id, title, original_name, file_path, source, file_type, created_at FROM documents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, l, offset]);
    return res.json({ items: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// Public file download: /api/documents/:id/file
router.get('/documents/:id/file', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const doc = rows[0];
    const filePath = path.resolve(__dirname, '..', '..', 'uploads', 'documents', doc.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    const filename = doc.original_name || doc.title || doc.filename;
    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(filename));
    return res.sendFile(filePath);
  } catch (err) {
    console.error('documents.routes: error', String(err.message || err));
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;
