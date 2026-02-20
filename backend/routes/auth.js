import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUsers, addUser } from '../store/users.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ecoride-jwt-secret-change-in-production';
const SALT_ROUNDS = 10;

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register — регистрация, в ответе сразу JWT (автовход)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = {
      id: String(Date.now()),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      name: (name || '').trim() || email.split('@')[0],
    };
    addUser(user);
    const token = createToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }
    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const token = createToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

export default router;
