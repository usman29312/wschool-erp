function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

async function isAdmin(req, res, next) {
  if (req.session && req.session.userId) {
    if (req.session.role === 'admin') {
      return next();
    }
    try {
      const { User } = require('../models');
      const user = await User.findByPk(req.session.userId);
      if (user && user.role === 'admin') {
        req.session.role = 'admin';
        return next();
      }
    } catch (err) {
      console.error('isAdmin DB check error:', err);
    }
  }
  return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
}

async function isTeacher(req, res, next) {
  if (req.session && req.session.userId) {
    if (req.session.role === 'teacher') {
      return next();
    }
    try {
      const { User } = require('../models');
      const user = await User.findByPk(req.session.userId);
      if (user && (user.role === 'teacher' || user.role === 'admin')) {
        return next();
      }
    } catch (err) {
      console.error('isTeacher DB check error:', err);
    }
  }
  return res.status(403).json({ error: 'Access denied. Teacher privileges required.' });
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isTeacher
};
