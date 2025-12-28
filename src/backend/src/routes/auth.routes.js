const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * body: { fullName, studentId, email, password }
 */
router.post("/register", async (req, res) => {
  const { fullName, studentId, email, password } = req.body || {};

  if (!fullName || !studentId || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    // check email exists
    const [emailRows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (emailRows.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // check student id exists
    const [sidRows] = await pool.query("SELECT id FROM users WHERE student_id = ?", [studentId]);
    if (sidRows.length > 0) {
      return res.status(409).json({ message: "Student ID already exists" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, student_id, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'user')`,
      [fullName, studentId, email, passwordHash]
    );

    return res.json({
      id: result.insertId,
      fullName,
      studentId,
      email,
      role: "user",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      detail: String(err.message || err),
    });
  }
});

/**
 * POST /api/auth/login
 * body: { emailOrStudentId, password }
 * - Cho phép login bằng Email hoặc MSSV
 */
router.post("/login", async (req, res) => {
  const { emailOrStudentId, email, studentId, password } = req.body || {};

  // hỗ trợ nhiều kiểu frontend gửi lên:
  // 1) { emailOrStudentId, password }
  // 2) { email, password }
  // 3) { studentId, password }
  const identity = emailOrStudentId || email || studentId;

  if (!identity || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    let rows = [];
    try {
      const r = await pool.query(
        `SELECT id, full_name, student_id, email, password_hash, role, is_locked AS locked
         FROM users
         WHERE email = ? OR student_id = ?
         LIMIT 1`,
        [identity, identity]
      );
      rows = r[0];
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unknown column')) {
        const r = await pool.query(
          `SELECT id, full_name, student_id, email, password_hash, role
           FROM users
           WHERE email = ? OR student_id = ?
           LIMIT 1`,
          [identity, identity]
        );
        rows = r[0];
        if (rows.length > 0) rows[0].locked = false;
      } else throw err;
    }

    if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (user.locked) return res.status(403).json({ message: 'Tài khoản đã bị khóa' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        studentId: user.student_id,
        email: user.email,
        role: user.role,
        locked: Boolean(user.locked),
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      detail: String(err.message || err),
    });
  }
});


/**
 * POST /api/auth/change-password
 * body: { currentPassword, newPassword }
 * - Requires an authenticated user (JWT)
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });
  if (typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = rows[0];
    const ok = require('bcryptjs').compareSync(currentPassword, user.password_hash);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    const hash = require('bcryptjs').hashSync(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    return res.json({ message: 'Password changed' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;
