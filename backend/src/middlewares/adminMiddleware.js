const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'utkarzz1705@gmail.com';

/**
 * Middleware: allows access if user has admin role OR matches configured ADMIN_EMAIL.
 * Must be used AFTER the protect middleware so req.user is set.
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const isAdmin = req.user.role === 'admin' || req.user.email === ADMIN_EMAIL;
  if (!isAdmin) {
    return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
  }

  next();
};

module.exports = adminOnly;
