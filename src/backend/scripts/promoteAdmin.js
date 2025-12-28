#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const pool = require('../src/db');

(async () => {
  try {
    const email = process.argv[2] || 'admin@tvu.edu.vn';
    const [res] = await pool.query("UPDATE users SET role='admin' WHERE email = ?", [email]);
    console.log('updated rows:', res.affectedRows);

    const [rows] = await pool.query('SELECT id, full_name, student_id, email, role FROM users WHERE email = ?', [email]);
    console.log(rows);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    try { await pool.end?.(); } catch {}
  }
})();
