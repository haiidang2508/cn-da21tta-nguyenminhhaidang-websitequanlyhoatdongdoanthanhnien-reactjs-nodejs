const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/activities?type=&unit=&q=
 */
router.get("/", async (req, res) => {
  const { type, unit, q } = req.query;

  try {
    let sql = "SELECT * FROM activities WHERE 1=1";
    const params = [];

    if (type && type !== "Tất cả") {
      sql += " AND type = ?";
      params.push(type);
    }
    if (unit && unit !== "Tất cả") {
      sql += " AND unit = ?";
      params.push(unit);
    }
    if (q) {
      sql +=
        " AND (LOWER(title) LIKE ? OR LOWER(type) LIKE ? OR LOWER(unit) LIKE ? OR LOWER(location) LIKE ?)";
      const kw = `%${String(q).toLowerCase()}%`;
      params.push(kw, kw, kw, kw);
    }

    sql += " ORDER BY activity_date DESC";
    const [rows] = await pool.query(sql, params);

    // backfill missing code for public listing as well
    const missing = rows.filter(r => !r.code);
    if (missing.length) {
      try {
        const db = process.env.DB_NAME;
        const [cols] = await pool.query("SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'code'", [db]);
        // if code column doesn't exist, attempt to add it
        if (!cols || !cols[0] || cols[0].c === 0) {
          try {
            await pool.query("ALTER TABLE activities ADD COLUMN code VARCHAR(3) DEFAULT NULL");
            await pool.query("ALTER TABLE activities ADD UNIQUE INDEX ux_activities_code (code)");
          } catch (e) { console.error('Could not add code column (public):', e.message || e); }
        }

        // generate codes for missing rows (if column now exists)
        const [cols2] = await pool.query("SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'code'", [db]);
        if (cols2 && cols2[0] && cols2[0].c > 0) {
          const gen3distinct = () => {
            const digits = '0123456789'.split('');
            for (let i = digits.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [digits[i], digits[j]] = [digits[j], digits[i]];
            }
            return digits.slice(0, 3).join('');
          };
          for (const r of missing) {
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
          }
        }
      } catch (e) { console.error('Backfill codes (public) failed:', e.message || e); }
    }

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      detail: String(err.message || err),
    });
  }
});

/**
 * GET /api/activities/me/registrations (JWT)
 * trả về danh sách hoạt động user đã đăng ký
 *
 * NOTE: phải đặt TRƯỚC route "/:id"
 */
router.get("/me/registrations", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT a.*, r.registered_at
      FROM registrations r
      JOIN activities a ON a.id = r.activity_id
      WHERE r.user_id = ?
      ORDER BY r.registered_at DESC
      `,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      detail: String(err.message || err),
    });
  }
});

/**
 * GET /api/activities/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM activities WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    // ensure activity has a code
    const r = rows[0];
    if (!r.code) {
      try {
        const db = process.env.DB_NAME;
        const [cols] = await pool.query("SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'code'", [db]);
        if (cols && cols[0] && cols[0].c > 0) {
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
        }
      } catch (e) { console.error('Backfill code (detail) failed', e.message || e); }
    }

    return res.json(r);
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      detail: String(err.message || err),
    });
  }
});

/**
 * POST /api/activities/:id/register (JWT)
 */
router.post("/:id/register", requireAuth, async (req, res) => {
  const activityId = req.params.id;

  try {
    const [act] = await pool.query("SELECT id FROM activities WHERE id = ?", [
      activityId,
    ]);
    if (act.length === 0) return res.status(404).json({ message: "Activity not found" });

    // Nếu đã đăng ký rồi (duplicate key) thì bỏ qua và trả ok
    try {
      await pool.query(
        "INSERT INTO registrations (user_id, activity_id) VALUES (?, ?)",
        [req.user.id, activityId]
      );
    } catch (e) {
      // duplicate -> ok
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      detail: String(err.message || err),
    });
  }
});

/**
 * DELETE /api/activities/:id/register (JWT)
 */
router.delete("/:id/register", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM registrations WHERE user_id = ? AND activity_id = ?",
      [req.user.id, req.params.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      detail: String(err.message || err),
    });
  }
});

module.exports = router;
