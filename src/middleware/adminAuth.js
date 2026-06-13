const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Рухсат нест' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error();
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Рухсат нест' });
  }
};

module.exports = adminAuth;
