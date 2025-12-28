const express = require('express');
const pool = require('../db');
const { requireAuth, requireSecretary } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/activities
router.get('/activities', requireAuth, requireSecretary, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM activities ORDER BY activity_date DESC');

    // if some rows lack a code, generate and persist codes for them
    const missing = rows.filter(r => !r.code);
    if (missing.length) {
      for (const r of missing) {
        try {
          // reuse generateUniqueCode from POST logic (duplicate here to avoid refactor)
          const gen3distinct = () => {
            const digits = '0123456789'.split('');
            for (let i = digits.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [digits[i], digits[j]] = [digits[j], digits[i]];
            }
            return digits.slice(0, 3).join('');
          };
          let codeVal = null;
          for (let t = 0; t < 1000; t++) {
            const c = gen3distinct();
            const [rchk] = await pool.query('SELECT COUNT(*) AS c FROM activities WHERE code = ?', [c]);
            if (rchk && rchk[0] && rchk[0].c === 0) { codeVal = c; break; }
          }
          if (codeVal) {
            await pool.query('UPDATE activities SET code = ? WHERE id = ?', [codeVal, r.id]);
            r.code = codeVal;
          }
        } catch (e) { console.error('Could not backfill code for activity', r.id, e.message || e); }
      }
    }

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// POST /api/admin/activities
router.post('/activities', requireAuth, requireSecretary, async (req, res) => {
  const { title, type, unit, activity_date, location, status, description } = req.body || {};
  if (!title) return res.status(400).json({ message: 'Missing title' });

  // basic validation & normalization
  const MAX = { title: 255, type: 100, unit: 100, status: 30, location: 255, description: 2000 };
  if (status && status.length > MAX.status) return res.status(400).json({ message: `Trường 'status' quá dài (tối đa ${MAX.status} ký tự)` });
  if (title.length > MAX.title) return res.status(400).json({ message: `Trường 'title' quá dài (tối đa ${MAX.title} ký tự)` });

  // validate date
  let dateVal = null;
  if (activity_date) {
    const d = new Date(activity_date);
    if (isNaN(d.getTime())) return res.status(400).json({ message: "Ngày không hợp lệ" });
    dateVal = d.toISOString().slice(0, 19).replace('T', ' ');
  }

  // helper: ensure code column exists and add if missing
  async function ensureCodeColumn() {
    try {
      const db = process.env.DB_NAME;
      const [cols] = await pool.query("SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'code'", [db]);
      if (cols && cols[0] && cols[0].c === 0) {
        // add column and unique index
        await pool.query("ALTER TABLE activities ADD COLUMN code VARCHAR(3) DEFAULT NULL");
        await pool.query("ALTER TABLE activities ADD UNIQUE INDEX ux_activities_code (code)");
      }
    } catch (e) {
      // non-fatal: log and continue; uniqueness may not be enforced
      console.error('Could not ensure code column:', e.message || e);
    }
  }

  function gen3distinct() {
    const digits = '0123456789'.split('');
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, 3).join('');
  }

  async function generateUniqueCode() {
    const MAX_TRIES = 1000;
    for (let i = 0; i < MAX_TRIES; i++) {
      const c = gen3distinct();
      const [rows] = await pool.query('SELECT COUNT(*) AS c FROM activities WHERE code = ?', [c]);
      if (rows && rows[0] && rows[0].c === 0) return c;
    }
    throw new Error('Không thể tạo mã hoạt động duy nhất');
  }

  try {
    await ensureCodeColumn();

    // generate a unique id for activity (prefix 'hd')
    const idVal = 'hd' + Date.now().toString().slice(-12);
    const codeVal = await generateUniqueCode();

    await pool.query(
      'INSERT INTO activities (id, code, title, type, unit, activity_date, location, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [idVal, codeVal, title.trim(), type || null, unit || null, dateVal, location || null, status || null, description || null]
    );
    const [row] = await pool.query('SELECT * FROM activities WHERE id = ?', [idVal]);
    return res.status(201).json(row[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// PUT /api/admin/activities/:id
router.put('/activities/:id', requireAuth, requireSecretary, async (req, res) => {
  const id = req.params.id;
  const { title, type, unit, activity_date, location, status, description } = req.body || {};

  if (!title) return res.status(400).json({ message: 'Missing title' });
  const MAX = { title: 255, type: 100, unit: 100, status: 30, location: 255, description: 2000 };
  if (status && status.length > MAX.status) return res.status(400).json({ message: `Trường 'status' quá dài (tối đa ${MAX.status} ký tự)` });
  if (title.length > MAX.title) return res.status(400).json({ message: `Trường 'title' quá dài (tối đa ${MAX.title} ký tự)` });

  let dateVal = null;
  if (activity_date) {
    const d = new Date(activity_date);
    if (isNaN(d.getTime())) return res.status(400).json({ message: "Ngày không hợp lệ" });
    dateVal = d.toISOString().slice(0, 19).replace('T', ' ');
  }

  try {
    await pool.query(
      'UPDATE activities SET title=?, type=?, unit=?, activity_date=?, location=?, status=?, description=? WHERE id=?',
      [title.trim(), type || null, unit || null, dateVal, location || null, status || null, description || null, id]
    );
    const [row] = await pool.query('SELECT * FROM activities WHERE id = ?', [id]);
    return res.json(row[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// DELETE /api/admin/activities/:id
router.delete('/activities/:id', requireAuth, requireSecretary, async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM activities WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;