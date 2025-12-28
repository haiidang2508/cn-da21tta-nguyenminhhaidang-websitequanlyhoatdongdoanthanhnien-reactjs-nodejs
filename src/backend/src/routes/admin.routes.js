const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

/**
 * POST /api/admin/login
 * body: { emailOrStudentId, password }
 */
router.post("/login", async (req, res) => {
  const { emailOrStudentId, password } = req.body || {};
  if (!emailOrStudentId || !password) return res.status(400).json({ message: "Missing fields" });

  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, student_id, email, password_hash, role
       FROM users
       WHERE (email = ? OR student_id = ?) AND role IN ('admin', 'secretary')
       LIMIT 1`,
      [emailOrStudentId, emailOrStudentId]
    );

    if (rows.length === 0) return res.status(401).json({ message: "Invalid admin credentials" });

    const admin = rows[0];
    const ok = bcrypt.compareSync(password, admin.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid admin credentials" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        studentId: admin.student_id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", detail: String(err.message || err) });
  }
});

module.exports = router;
