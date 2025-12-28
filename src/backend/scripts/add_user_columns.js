const pool = require('../src/db');

async function run() {
  try {
    console.log('Checking users table columns...');
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('chi_doan','is_locked')`
    );

    const existing = rows.map((r) => r.COLUMN_NAME);

    if (!existing.includes('chi_doan')) {
      console.log('Adding column chi_doan...');
      await pool.query("ALTER TABLE users ADD COLUMN chi_doan VARCHAR(255) NULL");
      console.log('Added chi_doan');
    } else {
      console.log('chi_doan already exists');
    }

    if (!existing.includes('is_locked')) {
      console.log('Adding column is_locked...');
      await pool.query("ALTER TABLE users ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0");
      console.log('Added is_locked');
    } else {
      console.log('is_locked already exists');
    }

    console.log('Migration finished');
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch(e){}
  }
}

if (require.main === module) run();

module.exports = run;
