const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/registrations
router.get('/registrations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.id, r.registered_at, u.id as user_id, u.full_name as user_name, a.id as activity_id, a.title as activity_title
      FROM registrations r
      JOIN users u ON u.id = r.user_id
      JOIN activities a ON a.id = r.activity_id
      ORDER BY r.registered_at DESC
    `);

    return res.json(rows.map((r) => ({
      id: r.id,
      registered_at: r.registered_at,
      user: { id: r.user_id, fullName: r.user_name },
      activity: { id: r.activity_id, title: r.activity_title },
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Server error', detail: String(err.message || err) });
  }
});

module.exports = router;