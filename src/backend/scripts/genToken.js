const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'change_this_secret_123';
const token = jwt.sign({ id: 1, role: 'admin', email: 'admin@example.com' }, secret, { expiresIn: '1d' });
console.log(token);
