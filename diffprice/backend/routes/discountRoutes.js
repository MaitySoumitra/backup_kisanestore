const express = require('express');
const router = express.Router();
const Discount = require('../models/Discount'); // Ensure your model is set up

// Create or update a discount for a product
router.post('/', async (req, res) => {
  let { productId, discountPercentage, couponCode } = req.body;

  if (!productId || discountPercentage == null) {
    return res.status(400).json({ error: 'productId and discountPercentage are required' });
  }

  // Extract the numeric part from the productId string
  const match = productId.match(/(\d+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid productId format' });
  }

  productId = match[1]; // Get only the numeric ID

  try {
    const discount = await Discount.findOneAndUpdate(
      { productId },
      {
        productId,
        discountPercentage,
        couponCode,
        isActive: true,
        startsAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, discount });
  } catch (err) {
    console.error('Error saving discount:', err);
    res.status(500).json({ error: 'Failed to save discount' });
  }
});

// Get discount by product ID
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const discount = await Discount.findOne({ productId, isActive: true });

    if (!discount) {
      return res.status(404).json({ message: 'No discount found for this product' });
    }

    res.json({ success: true, discount });
  } catch (err) {
    console.error('Error fetching discount:', err);
    res.status(500).json({ error: 'Failed to fetch discount' });
  }
});

// Optional: Deactivate a discount
router.patch('/:productId/deactivate', async (req, res) => {
  const { productId } = req.params;

  try {
    const updated = await Discount.findOneAndUpdate(
      { productId },
      { isActive: false },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    res.json({ success: true, discount: updated });
  } catch (err) {
    console.error('Error deactivating discount:', err);
    res.status(500).json({ error: 'Failed to deactivate discount' });
  }
});

// GET Discount for productId if user is CSC
router.post('/getDiscount', async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const discount = await Discount.findOne({ productId, isActive: true });

    if (!discount) {
      return res.status(404).json({ error: 'No discount found for this product' });
    }

    return res.json({
      discountPercentage: discount.discountPercentage,
    });
  } catch (err) {
    console.error('Error fetching discount:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
