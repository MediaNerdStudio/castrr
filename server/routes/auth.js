import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createToken } from '../middleware/auth.js';

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

router.post('/login', async (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(400).json({ error: 'Admin password not configured' });
  }
  const { username, password } = req.body || {};
  if (username !== 'admin') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  let match = false;
  if (ADMIN_PASSWORD.startsWith('$2')) {
    try {
      match = await bcrypt.compare(password, ADMIN_PASSWORD);
    } catch {
      match = false;
    }
  } else {
    match = password === ADMIN_PASSWORD;
  }
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createToken({ username: 'admin' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({ user: { username: 'admin' } });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.json({ user: { username: 'admin', passwordNotConfigured: true } });
  }
  const token = req.cookies?.token;
  if (!token) return res.json({ user: null });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret-change-me');
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

export default router;
