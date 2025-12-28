const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const path = require('path');
const fs = require('fs');
let upload = null;
try {
  const multer = require('multer');
  const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'documents');
  fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
      const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, Date.now() + '_' + safe);
    }
  });
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const ALLOWED_EXTS = ['pdf','doc','docx','xls','xlsx','csv'];
  upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    // Accept by mimetype OR file extension (some browsers send application/octet-stream)
    const mimetypeOk = ALLOWED_TYPES.includes(file.mimetype);
    const orig = (file.originalname || '').toLowerCase();
    const ext = orig.includes('.') ? orig.split('.').pop() : '';
    const extOk = ALLOWED_EXTS.includes(ext);
    if (mimetypeOk || extOk) return cb(null, true);
    return cb(new Error('Invalid file type'));
  } });
} catch (e) {
  upload = null;
}

// Diagnostics: log uploader status at startup
console.log('admin.documents.routes: multer configured =', !!upload);
if (!upload) console.warn('admin.documents.routes: multer is NOT available — file uploads will return a 500 error until multer is installed');

(async function ensureDocumentsTable() {
  try {
    // ensure basic columns exist on `documents` table if table exists
    const cols = [
      { name: 'title', sql: 'ALTER TABLE documents ADD COLUMN title VARCHAR(1024)' },
      { name: 'filename', sql: 'ALTER TABLE documents ADD COLUMN filename VARCHAR(1024)' },
      { name: 'file_name', sql: 'ALTER TABLE documents ADD COLUMN file_name VARCHAR(1024)' },
      { name: 'file_path', sql: "ALTER TABLE documents ADD COLUMN file_path VARCHAR(1024)" },
      { name: 'file_ext', sql: "ALTER TABLE documents ADD COLUMN file_ext VARCHAR(20)" },
      { name: 'original_name', sql: 'ALTER TABLE documents ADD COLUMN original_name VARCHAR(1024)' },
      { name: 'source', sql: "ALTER TABLE documents ADD COLUMN source VARCHAR(255)" },
      { name: 'file_type', sql: "ALTER TABLE documents ADD COLUMN file_type VARCHAR(64)" },
      { name: 'created_at', sql: "ALTER TABLE documents ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP" },
    ];

    // If table does not exist, attempt to create it
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(1024) NOT NULL,
        filename VARCHAR(1024) NOT NULL,
        file_name VARCHAR(1024) DEFAULT NULL,
        file_path VARCHAR(1024) DEFAULT NULL,
        file_ext VARCHAR(20) DEFAULT NULL,
        original_name VARCHAR(1024) DEFAULT NULL,
        source VARCHAR(255) DEFAULT NULL,
        file_type VARCHAR(64) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    } catch (e) {
      console.warn('admin.documents.routes: could not create documents table', String(e.message || e));
    }

    // Ensure columns exist (for older DBs)
    for (const col of cols) {
      try {
        const [rows] = await pool.query('SHOW COLUMNS FROM documents LIKE ?', [col.name]);
        if (!rows || rows.length === 0) {
          await pool.query(col.sql);
        }
      } catch (e) {
        console.warn('admin.documents.routes: could not add column', col.name, String(e.message || e));
      }
    }
  } catch (err) {
    console.warn('admin.documents.routes: ensure check failed', String(err.message || err));
  }
})();

// GET list: /api/admin/documents?source=doan-ktcn
router.get('/documents', requireAuth, requireAdmin, async (req, res) => {
  const { source, q, page = 1, limit = 50 } = req.query;
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Number(limit));
  const offset = (p - 1) * l;

  try {
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

    const [rows] = await pool.query(`SELECT SQL_CALC_FOUND_ROWS * FROM documents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, l, offset]);
    const [[countObj]] = await pool.query('SELECT FOUND_ROWS() AS total');
    return res.json({ items: rows, total: countObj.total || 0 });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// GET detail
router.get('/documents/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// GET file content -- stream the binary file with correct headers
router.get('/documents/:id/file', requireAuth, requireAdmin, async (req, res) => {
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
    console.error('GET /documents/:id/file error', String(err.message || err));
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// POST upload
router.post('/documents', requireAuth, requireAdmin,
  // pre-multer diagnostics
  (req, res, next) => {
    console.log('POST /documents incoming', { method: req.method, url: req.originalUrl, contentType: req.headers['content-type'], contentLength: req.headers['content-length'] });
    next();
  },
  upload ? upload.single('file') : (req, res, next) => {
    // If multer isn't available at startup, return a helpful error rather than silently skipping file handling
    if (!upload) return res.status(500).json({ message: 'Server not configured to accept file uploads (multer missing). Please install multer and restart the server.' });
    next();
  }, async (req, res) => {
  const { title, source } = req.body || {};
  try {
    console.log('POST /documents content-type:', req.headers['content-type']);
    if (!req.file) {
      console.warn('POST /documents: no file received');
      return res.status(400).json({ message: 'Missing file' });
    }
    console.log('POST /documents: received file', req.file.originalname);
    const filename = req.file.filename;
    const file_type = req.file.mimetype || null;
    const original_name = req.file.originalname || null;
    // Some older DBs have a NOT NULL unit_name column; provide a sensible default (source or empty string)
    const unit_name = source || '';
    const file_path = `/uploads/documents/${filename}`;
    const file_ext = (original_name || filename || '').split('.').pop().toLowerCase();
    const insert = await pool.query('INSERT INTO documents (title, filename, file_name, file_path, file_ext, original_name, source, file_type, unit_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [title || original_name, filename, filename, file_path, file_ext, original_name, source || null, file_type, unit_name]);
    const [row] = await pool.query('SELECT * FROM documents WHERE id = ?', [insert[0].insertId]);
    return res.json(row[0]);
  } catch (err) {
    console.error('POST /documents error', String(err.message || err));
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// PUT / update (allow metadata update and optional file replacement)
router.put('/documents/:id', requireAuth, requireAdmin, upload ? upload.single('file') : (req, res, next) => {
  if (!upload) return res.status(500).json({ message: 'Server not configured to accept file uploads (multer missing). Please install multer and restart the server.' });
  next();
}, async (req, res) => {
  const id = req.params.id;
  const { title, source } = req.body || {};
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const doc = rows[0];

    let filename = doc.filename;
    let file_type = doc.file_type;

    if (req.file) {
      // delete old file
      const oldName = doc.filename || doc.file_name || (doc.file_path ? path.basename(doc.file_path) : null);
      if (oldName) {
        const oldPath = path.resolve(__dirname, '..', '..', 'uploads', 'documents', oldName);
        fs.unlink(oldPath, (err) => { if (err) console.warn('Could not delete old file', oldPath, String(err && err.message || err)); });
      }
      filename = req.file.filename;
      file_type = req.file.mimetype || null;
      // update file_path when a new file is provided
      doc.file_path = `/uploads/documents/${filename}`;
      // derive extension from provided originalname if available, otherwise fallback to saved filename
      const origName = req.file.originalname || doc.original_name || filename;
      doc.file_ext = (origName || filename || '').split('.').pop().toLowerCase();
    }

    // keep unit_name consistent for older schemas where it's required
    const unit_name = source || doc.source || '';
    await pool.query('UPDATE documents SET title=?, filename=?, file_name=?, file_path=?, file_ext=?, source=?, file_type=?, unit_name=? WHERE id = ?', [title || doc.title, filename, filename, doc.file_path || null, doc.file_ext || null, source || doc.source, file_type, unit_name, id]);
    const [updated] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    return res.json(updated[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// DELETE
router.delete('/documents/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const doc = rows[0];
    // Delete DB row
    await pool.query('DELETE FROM documents WHERE id = ?', [id]);
    // Remove file if exists. Support older schemas that may use `file_name`, `filename`, or `file_path`.
    const savedName = doc.filename || doc.file_name || (doc.file_path ? path.basename(doc.file_path) : null);
    if (savedName) {
      const filePath = path.resolve(__dirname, '..', '..', 'uploads', 'documents', savedName);
      fs.unlink(filePath, (err) => { if (err) console.warn('Could not delete file', filePath, String(err && err.message || err)); });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// Multer/route error handler for friendly messages
router.use((err, req, res, next) => {
  if (!err) return next();
  // Log full error for debugging
  console.error('admin.documents.routes: error handler got error', err && (err.stack || err));
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'File too large' });
  if (err && String(err.message || '').toLowerCase().includes('invalid file type')) return res.status(400).json({ message: 'Invalid file type' });
  // any other multer/common errors
  if (err && String(err.message || '').toLowerCase().includes('multer')) return res.status(500).json({ message: String(err.message || 'Server error') });
  // otherwise propagate as generic server error
  return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
});

module.exports = router;
