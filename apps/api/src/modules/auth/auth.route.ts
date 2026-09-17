import {
  currentUserResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
} from '@macrointel/contracts';
import { Router } from 'express';
import { User } from './user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from './auth.middleware.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const input = registerRequestSchema.safeParse(req.body);

  if (!input.success) {
    res.status(400).json({ error: `Invalid email or password` });
    return;
  }

  const email = input.data.email.toLowerCase();
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(input.data.password, 12);

  const newUser = await User.create({
    email,
    passwordHash,
  });

  const response = registerResponseSchema.parse({
    id: newUser._id.toString(),
    email: newUser.email,
  });
  res.status(201).json(response);
});

authRouter.post('/login', async (req, res) => {
  const input = loginRequestSchema.safeParse(req.body);

  if (!input.success) {
    res.status(400).json({ error: 'Invalid email or password' });
    return;
  }
  const email = input.data.email.toLowerCase();

  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const passwordMatches = await bcrypt.compare(
    input.data.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const token = jwt.sign(
    {
      sub: user._id.toString(),
    },
    jwtSecret,
    {
      expiresIn: '1h',
    },
  );

  const response = loginResponseSchema.parse({
    id: user._id.toString(),
    email: user.email,
    token,
  });

  res.status(200).json(response);
});

authRouter.get('/me', requireAuth, async (_req, res) => {
  const user = await User.findById(res.locals.userId);

  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }

  const response = currentUserResponseSchema.parse({
    id: user._id.toString(),
    email: user.email,
  });

  res.json(response);
});
