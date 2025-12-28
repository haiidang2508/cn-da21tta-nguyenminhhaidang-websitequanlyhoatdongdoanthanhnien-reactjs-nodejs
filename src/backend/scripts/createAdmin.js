#!/usr/bin/env node
/*
  Create an admin user in the database.
  Usage:
    ADMIN_FULLNAME="Admin" ADMIN_STUDENTID=admin001 ADMIN_EMAIL=admin@tvu.edu.vn ADMIN_PASSWORD=Pass123 node scripts/createAdmin.js
  or run interactively (password will be visible when typed):
    node scripts/createAdmin.js

  Warning: do not commit credentials. Use in local/dev only.
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const pool = require('../src/db');
const bcrypt = require('bcryptjs');

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  try {
    console.log('Create admin user (press Ctrl+C to cancel)');

    const fullName = process.env.ADMIN_FULLNAME || (await question('Full name: '));
    const studentId = process.env.ADMIN_STUDENTID || (await question('Student ID: '));
    const email = process.env.ADMIN_EMAIL || (await question('Email: '));
    const password = process.env.ADMIN_PASSWORD || (await question('Password (visible): '));

    if (!fullName || !studentId || !email || !password) {
      console.error('Missing required fields. Aborting.');
      process.exit(1);
    }

    // confirm
    const confirm = process.env.CONFIRM || (await question('Create admin with above values? (yes/no): '));
    if (!/^(y|yes)$/i.test(confirm)) {
      console.log('Aborted.');
      process.exit(0);
    }

    // check duplicates
    const [emailRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (emailRows.length > 0) {
      console.error('Email already exists. Aborting.');
      process.exit(1);
    }

    const [sidRows] = await pool.query('SELECT id FROM users WHERE student_id = ?', [studentId]);
    if (sidRows.length > 0) {
      console.error('Student ID already exists. Aborting.');
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (full_name, student_id, email, password_hash, role) VALUES (?, ?, ?, ?, "admin")',
      [fullName, studentId, email, passwordHash]
    );

    console.log('✅ Admin created with id:', result.insertId);
    console.log('You can now login via POST /api/admin/login or at /admin/login');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  } finally {
    try { await pool.end?.(); } catch {}
    rl.close();
  }
}

main();
