import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import storefrontRoutes from './routes/storefrontRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import committeeRoutes from './routes/committeeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import marketInsightRoutes from './routes/marketInsightRoutes.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in your .env file. See .env.example.');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

// Route groups — each teammate mainly touches their own prefix
app.use('/api/auth', authRoutes);                 // shared (Person B)
app.use('/api/storefronts', storefrontRoutes);     // Person A + B
app.use('/api/products', productRoutes);           // Person A + B
app.use('/api/orders', orderRoutes);               // Person A + B
app.use('/api/kameti/committees', committeeRoutes);// kameti feature (from Micro-Nisa)
app.use('/api/kameti/notifications', notificationRoutes); // kameti feature (from Micro-Nisa)
app.use('/api/chatbot', chatbotRoutes);            // Person C
app.use('/api/market-insights', marketInsightRoutes); // Person C

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Apna Karobar server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
  });
});
