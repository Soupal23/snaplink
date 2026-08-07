const express = require('express');
const cors = require('cors'); // 1. Require cors
const dns = require('dns');

require('dotenv').config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = require('./config/db');

const app = express();

// 2. Enable CORS middleware (must be before routes)
app.use(cors());

// Middleware to parse incoming JSON payloads
app.use(express.json());


// Global Rate Limiter

const { apiLimiter } = require('./middleware/rateLimiter');
app.use(apiLimiter);


// Connect to MongoDB
connectDB();

// Mount Routes
app.use('/', require('./routes/index'));
app.use('/api/url', require('./routes/url'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));