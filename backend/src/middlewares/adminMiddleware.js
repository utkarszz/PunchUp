const ADMIN_EMAIL = 'utkarzz1705@gmail.com';

/**
 * Middleware: only allows the designated admin (by email) to proceed.
 * Must be used AFTER the protect middleware so req.user is set.
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
  }

  next();
};

module.exports = adminOnly;
