const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/users
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    let rows;
    try {
      const [r] = await pool.query(
        `SELECT id, full_name AS fullName, student_id AS studentId, email, role, is_locked AS locked FROM users ORDER BY id DESC`
      );
      rows = r;
    } catch (err) {
      // If the column doesn't exist, fall back and mark locked=false
      if (String(err.message || '').toLowerCase().includes('unknown column')) {
        const [r] = await pool.query(
          `SELECT id, full_name AS fullName, student_id AS studentId, email, role FROM users ORDER BY id DESC`
        );
        rows = r.map((x) => ({ ...x, locked: false }));
      } else throw err;
    }

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error", detail: String(err.message || err) });
  }
});

// POST /api/admin/users
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const { fullName, studentId, email, password, role = 'user' } = req.body || {};
  if (!fullName || !studentId || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['admin', 'user', 'secretary'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

  try {
    const [emailRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (emailRows.length > 0) return res.status(409).json({ message: 'Email already exists' });

    const [sidRows] = await pool.query('SELECT id FROM users WHERE student_id = ?', [studentId]);
    if (sidRows.length > 0) return res.status(409).json({ message: 'Student ID already exists' });

    const passwordHash = bcrypt.hashSync(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (full_name, student_id, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [fullName, studentId, email, passwordHash, role]
    );

    const [[row]] = await pool.query('SELECT id, full_name AS fullName, student_id AS studentId, email, role FROM users WHERE id = ?', [result.insertId]);
    return res.status(201).json(row || null);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// PUT /api/admin/users/:id/role  { role: 'admin'|'user'|'secretary' }
router.put("/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (!id || !role || !["admin", "user", "secretary"].includes(role)) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  try {
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    // attempt to return locked status if available
    try {
      const [[row]] = await pool.query("SELECT id, full_name AS fullName, student_id AS studentId, email, role, is_locked AS locked FROM users WHERE id = ?", [id]);
      return res.json(row || null);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unknown column')) {
        const [[row]] = await pool.query("SELECT id, full_name AS fullName, student_id AS studentId, email, role FROM users WHERE id = ?", [id]);
        return res.json({ ...(row || {}), locked: false });
      }
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ message: "Server error", detail: String(err.message || err) });
  }
});

// PUT /api/admin/users/:id
router.put("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { fullName, studentId, email, role } = req.body || {};

  if (!id || !fullName || !studentId || !email || !role) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  if (!["admin", "user", "secretary"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const [emailRows] = await pool.query("SELECT id FROM users WHERE email = ? AND id <> ?", [email, id]);
    if (emailRows.length > 0) return res.status(409).json({ message: "Email already exists" });

    const [sidRows] = await pool.query("SELECT id FROM users WHERE student_id = ? AND id <> ?", [studentId, id]);
    if (sidRows.length > 0) return res.status(409).json({ message: "Student ID already exists" });

    await pool.query(
      "UPDATE users SET full_name = ?, student_id = ?, email = ?, role = ? WHERE id = ?",
      [fullName, studentId, email, role, id]
    );

    try {
      const [[row]] = await pool.query("SELECT id, full_name AS fullName, student_id AS studentId, email, role, is_locked AS locked FROM users WHERE id = ?", [id]);
      return res.json(row || null);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unknown column')) {
        const [[row]] = await pool.query("SELECT id, full_name AS fullName, student_id AS studentId, email, role FROM users WHERE id = ?", [id]);
        return res.json({ ...(row || {}), locked: false });
      }
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ message: "Server error", detail: String(err.message || err) });
  }
});

// PUT /api/admin/users/:id/lock  { lock: true|false }
router.put('/users/:id/lock', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { lock } = req.body || {};
  if (!id || typeof lock !== 'boolean') return res.status(400).json({ message: 'Invalid parameters' });

  try {
    // try to update is_locked; if column missing, inform client to run migration
    try {
      await pool.query('UPDATE users SET is_locked = ? WHERE id = ?', [lock ? 1 : 0, id]);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unknown column')) {
        return res.status(501).json({ message: 'Lock feature not available on server. Please run DB migration to add is_locked column.' });
      }
      throw err;
    }

    try {
      const [[row]] = await pool.query('SELECT id, full_name AS fullName, student_id AS studentId, email, role, is_locked AS locked FROM users WHERE id = ?', [id]);
      return res.json(row || null);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unknown column')) {
        const [[row]] = await pool.query('SELECT id, full_name AS fullName, student_id AS studentId, email, role FROM users WHERE id = ?', [id]);
        return res.json({ ...(row || {}), locked: Boolean(lock) });
      }
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  try {
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error", detail: String(err.message || err) });
  }
});

module.exports = router;
