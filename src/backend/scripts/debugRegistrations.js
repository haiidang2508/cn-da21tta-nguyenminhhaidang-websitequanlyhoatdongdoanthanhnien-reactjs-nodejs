const pool = require('../src/db');

(async function() {
  try {
    const [rows30] = await pool.query(`
      SELECT DATE(registered_at) AS d, COUNT(*) AS c
      FROM registrations
      WHERE registered_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(registered_at)
      ORDER BY d ASC
    `);
    console.log('rows30 count:', rows30.length);
    console.table(rows30);

    const [[total]] = await pool.query('SELECT COUNT(*) AS c FROM registrations');
    console.log('total registrations:', total.c);

    const [[recentTotal]] = await pool.query(`SELECT COUNT(*) AS c FROM registrations WHERE registered_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
    console.log('registrations last 30 days:', recentTotal.c);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
})();