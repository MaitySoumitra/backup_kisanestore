// src/pages/AdminDiscountPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDiscountPage.css';

const AdminDiscountPage = () => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchShopifyProducts = async () => {
      const query = `
        {
          products(first: 50) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `;

      try {
        const res = await axios.post(
          'https://kisanestoredev.myshopify.com/api/2023-01/graphql.json',
          { query },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': '9fa0275c43c9d14f1ad4ab3478472f5c',
            },
          }
        );

        const products = res.data.data.products.edges.map(edge => edge.node);
        setProducts(products);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    };

    fetchShopifyProducts();
  }, []);

  const handleSubmit = async () => {
    if (!selectedProductId || !discountPercentage || !couponCode) {
      setMessage('Please fill all fields.');
      return;
    }

    try {
      await axios.post('http://localhost:3000/api/discounts', {
        productId: selectedProductId,
        discountPercentage: Number(discountPercentage),
        couponCode,
      });

      setMessage(`Discount of ${discountPercentage}% saved for product.`);
      setDiscountPercentage('');
      setCouponCode('');
      setSelectedProductId('');
    } catch (err) {
      console.error('Failed to save discount:', err);
      setMessage('Error saving discount.');
    }
  };

  return (
    <div className="admin-container">
      <h2>Admin Discount Manager</h2>

      <div className="form-group">
        <label>Choose Product:</label>
        <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
          <option value="">-- Select Product --</option>
          {products.map(prod => (
            <option key={prod.id} value={prod.id}>
              {prod.title}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Discount Percentage:</label>
        <input
          type="number"
          value={discountPercentage}
          onChange={(e) => setDiscountPercentage(e.target.value)}
          placeholder="e.g. 10"
        />
      </div>

      <div className="form-group">
        <label>Coupon Code:</label>
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="e.g. SAVE10"
        />
      </div>

      <button onClick={handleSubmit}>Save Discount</button>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AdminDiscountPage;
