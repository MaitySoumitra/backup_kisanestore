const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const mongoose = require('mongoose');
const Session = require('./models/Session'); // Assuming you have a Session model defined

// Initialize Express app
const app = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
// Middlewares
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true if using HTTPS
    sameSite: 'None',  // Required for cross-origin requests
    maxAge: 3 * 24 * 60 * 60 * 1000  // Cookie expiration (3 days)
  }
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', require('./routes/login'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/user', require('./routes/user'));  // Assuming user-related routes
app.use('/api/products', require('./routes/product'));  // Assuming product-related routes
app.use('/csc', require('./routes/payment'));
app.get('/api/shopify/customer-token', async (req, res) => {
  const sessionId = req.cookies.customer_sid; // ✅ Correct cookie name
  if (!sessionId) return res.status(401).json({ error: 'No session ID' });

  try {
    const session = await Session.findOne({ sessionId }); // Ensure correct model is used
    if (!session || !session.accessToken) {
      return res.status(401).json({ error: 'Invalid session or missing token' });
    }

    res.json({ customerAccessToken: session.accessToken });
  } catch (error) {
    console.error('Token lookup failed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/csc/payment', async (req, res) => {
  const orderId = req.query.order_id;
  const email = req.query.email;

  // ✅ 1. Validate required query params
  if (!orderId || !email) {
    return res.status(400).send('Missing order_id or email.');
  }

  try {
    // ✅ 2. Fetch order details from Shopify
    const response = await axios.get(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/orders/${orderId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    const order = response.data.order;

    // ✅ 3. Check if the provided email matches the order's email
    if (order.email !== email) {
      return res.status(403).send('Invalid customer email for this order.');
    }

    // ✅ 4. Continue to payment step
    res.send(`
      <h1>Payment for Order #${order.id}</h1>
      <p>Total: ${order.total_price} ${order.currency}</p>
      <p>Email verified: ${order.email}</p>
      <form method="POST" action="/csc/payment/complete">
        <input type="hidden" name="order_id" value="${order.id}" />
        <button type="submit">Confirm Payment</button>
      </form>
    `);

  } catch (error) {
    console.error('Error fetching order:', error.message);
    res.status(500).send('Error verifying order.');
  }
});



// Start the server
app.listen(3000, () => console.log('Server running on port 3000'));
