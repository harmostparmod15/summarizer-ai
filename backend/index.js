
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/auth');
const summaryRoutes = require('./src/routes/summary');


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.send('Status ok');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/summaries', summaryRoutes);


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log(' Connected to MongoDB');
})
.catch((err) => {
  console.error(' Failed to connect to MongoDB:', err);
});

// Start the server
app.listen(port, () => {
  console.log(`Server http://localhost:${port}`);
});
