// CheckoutPage.jsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const CheckoutPage = () => {
  const { encodedCartId } = useParams();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cartId = decodeURIComponent(encodedCartId); // Decode the cart ID from URL
    const fetchCart = async () => {
      try {
        const res = await axios.post('http://localhost:3000/api/cart/fetch', { cartId }, { withCredentials: true });
        setCart(res.data); // Fetch full cart details from backend
      } catch (err) {
        setError('Failed to fetch cart details');
      }
    };

    fetchCart();
  }, [encodedCartId]);

  if (error) return <div>{error}</div>;
  if (!cart) return <div>Loading cart...</div>;

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f4f4f4' }}>
      <h2>Checkout</h2>
      <p>Cart ID: {cart.cartId}</p>
      {/* You can now display cart details here */}
      <div>
        {cart.items.map((item) => (
          <div key={item.variantId} style={{ padding: '10px', border: '1px solid #ddd', marginBottom: '10px' }}>
            <h3>Variant ID: {item.variantId}</h3>
            <p>Quantity: {item.quantity}</p>
          </div>
        ))}
      </div>
      {/* Implement payment and checkout functionality here */}
    </div>
  );
};

export default CheckoutPage;
