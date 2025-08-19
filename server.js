const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const realmRoutes = require('./routes/realms');
const clientRoutes = require('./routes/clients');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const Token = require('./models/Token');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/realms', realmRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Wait a bit for PostgreSQL to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Start periodic token cleanup (every 30 minutes)
    setInterval(async () => {
      try {
        await Token.cleanupExpiredTokens();
        console.log('Token cleanup completed');
      } catch (error) {
        console.error('Token cleanup error:', error);
      }
    }, 30 * 60 * 1000);
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
