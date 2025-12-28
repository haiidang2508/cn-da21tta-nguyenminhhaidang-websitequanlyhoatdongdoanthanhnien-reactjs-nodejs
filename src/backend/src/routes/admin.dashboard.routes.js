const express = require("express");
const pool = require("../db");
const { requireAuth, requireSecretary } = require("../middleware/auth"); // sửa đúng thư mục của bạn

const router = express.Router();

router.get("/dashboard", requireAuth, requireSecretary, async (req, res) => {
  try {
    const [[u]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[a]] = await pool.query("SELECT COUNT(*) AS totalActivities FROM activities");
    const [[r]] = await pool.query("SELECT COUNT(*) AS totalRegistrations FROM registrations");

    // count how many distinct activities have at least one registration
    let activitiesWithRegistrations = 0;
    try {
      const [[aw]] = await pool.query("SELECT COUNT(DISTINCT activity_id) AS activitiesWithRegistrations FROM registrations");
      activitiesWithRegistrations = aw.activitiesWithRegistrations || 0;
    } catch (err) {
      activitiesWithRegistrations = 0;
    }

    // Additional stats
    let openActivities = 0;
    let ongoingActivities = 0;
    let finishedActivities = 0;
    let totalNews = 0;
    let activeMembers = 0;

    try {
      const [[o]] = await pool.query("SELECT COUNT(*) AS c FROM activities WHERE LOWER(IFNULL(status, '')) LIKE '%mở%'");
      openActivities = o.c || 0;
    } catch (err) {
      // ignore per-db differences
      openActivities = 0;
    }

    try {
      const [[on]] = await pool.query("SELECT COUNT(*) AS c FROM activities WHERE LOWER(IFNULL(status, '')) LIKE '%đang%'");
      ongoingActivities = on.c || 0;
    } catch (err) {
      ongoingActivities = 0;
    }

    try {
      const [[f]] = await pool.query("SELECT COUNT(*) AS c FROM activities WHERE LOWER(IFNULL(status, '')) LIKE '%kết%'");
      finishedActivities = f.c || 0;
    } catch (err) {
      finishedActivities = 0;
    }

    try {
      const [[n]] = await pool.query("SELECT COUNT(*) AS totalNews FROM news");
      totalNews = n.totalNews || 0;
    } catch (err) {
      totalNews = 0;
    }

    try {
      const [[am]] = await pool.query(`
        SELECT COUNT(*) AS activeMembers FROM (
          SELECT user_id, COUNT(*) AS c FROM registrations WHERE registered_at >= DATE_SUB(NOW(), INTERVAL 90 DAY) GROUP BY user_id HAVING c >= 3
        ) t
      `);
      activeMembers = am.activeMembers || 0;
    } catch (err) {
      activeMembers = 0;
    }

    // Registrations time series (last 30 days)
    let registrationsSeries30 = [];
    try {
      const [rows30] = await pool.query(`
        SELECT DATE(registered_at) AS d, COUNT(*) AS c
        FROM registrations
        WHERE registered_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(registered_at)
        ORDER BY d ASC
      `);

      // build full 30-day array with zeros for missing days
      const dayMap = {};
      for (const r of rows30) dayMap[String(r.d)] = r.c;
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0,10);
        registrationsSeries30.push({ date: key, count: dayMap[key] || 0 });
      }
    } catch (err) {
      registrationsSeries30 = [];
    }

    // Top activities by participant count
    let topActivities = [];
    try {
      const [tops] = await pool.query(`
        SELECT a.id, a.title, COUNT(r.id) AS participants
        FROM activities a
        LEFT JOIN registrations r ON r.activity_id = a.id
        GROUP BY a.id
        ORDER BY participants DESC
        LIMIT 5
      `);
      topActivities = tops.map((t) => ({ id: t.id, title: t.title, participants: t.participants || 0 }));
    } catch (err) {
      topActivities = [];
    }

    // Participation rate: unique users who registered at least once / total users
    let participationRate = 0;
    let uniqueRegisteredUsers = 0;
    try {
      const [[uReg]] = await pool.query("SELECT COUNT(DISTINCT user_id) AS c FROM registrations");
      uniqueRegisteredUsers = uReg.c || 0;
      participationRate = u.totalUsers ? Math.round((uniqueRegisteredUsers / u.totalUsers) * 10000) / 100 : 0; // percent with 2 decimals
    } catch (err) {
      participationRate = 0;
    }

    return res.json({
      totalUsers: u.totalUsers,
      totalActivities: a.totalActivities,
      totalRegistrations: r.totalRegistrations,
      activitiesWithRegistrations: activitiesWithRegistrations,
      openActivities,
      ongoingActivities,
      finishedActivities,
      totalNews,
      activeMembers,
      registrationsSeries30,
      registrationsSeries14: registrationsSeries30.slice(Math.max(0, registrationsSeries30.length - 14)),
      registrationsSeries7: registrationsSeries30.slice(Math.max(0, registrationsSeries30.length - 7)),
      topActivities,
      participationRate,
      uniqueRegisteredUsers,
    });
  } catch (err) {
    // If anything fails while building dashboard stats (DB down, auth, etc.),
    // return a minimal but consistent payload so frontend can still render and
    // show a helpful message without throwing an HTTP 500. This improves
    // resilience in dev environments where DB may be temporarily unavailable.
    console.error('Admin dashboard error:', err);

    // build a zero-filled 30-day series ending today
    const registrationsSeries30 = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      registrationsSeries30.push({ date: key, count: 0 });
    }

    return res.json({
      totalUsers: 0,
      totalActivities: 0,
      totalRegistrations: 0,
      activitiesWithRegistrations: 0,
      openActivities: 0,
      ongoingActivities: 0,
      finishedActivities: 0,
      totalNews: 0,
      activeMembers: 0,
      registrationsSeries30,
      registrationsSeries14: registrationsSeries30.slice(Math.max(0, registrationsSeries30.length - 14)),
      registrationsSeries7: registrationsSeries30.slice(Math.max(0, registrationsSeries30.length - 7)),
      topActivities: [],
      participationRate: 0,
      uniqueRegisteredUsers: 0,
      dbError: String(err.message || err),
    });
  }
});

module.exports = router;
