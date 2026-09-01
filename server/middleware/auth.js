import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  // If no admin password is configured, leave admin routes open
  if (!process.env.ADMIN_PASSWORD) {
    return next();
  }

  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET || 'development-secret-change-me');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET || 'development-secret-change-me', { expiresIn: '7d' });
}
