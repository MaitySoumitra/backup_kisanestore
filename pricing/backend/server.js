const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


app.use('/api/login',  require('./routes/login'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/product', require('./routes/product'));
app.use('/api/user', require('./routes/user')); 
app.use('/api/discounts', require('./routes/discountRoutes'));


  
app.listen(3000, () => console.log('Server running on port 3000'));
