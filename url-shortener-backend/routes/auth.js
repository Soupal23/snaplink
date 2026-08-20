const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// routes/auth.js — FIXED (both /register and /login)
const validator = require('validator');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Type + format guard — rejects objects, arrays, and invalid email strings
  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters.' });
  }

  try {
    // Normalize: always query with a sanitized lowercase string
    const normalizedEmail = validator.normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    // Constant-time: always run bcrypt.compare even when user not found
    const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Same email validation fix applies to /register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 50) {
    return res.status(400).json({ message: 'Username must be between 2 and 50 characters.' });
  }
  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = validator.normalizeEmail(email);
  try {
    let user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = new User({ username: username.trim(), email: normalizedEmail, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;