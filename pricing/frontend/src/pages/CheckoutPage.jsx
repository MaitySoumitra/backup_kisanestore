// frontend/src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCheckout = async () => {
      const token = sessionStorage.getItem('shopify_token');
      if (!token) {
        navigate('/'); // Redirect to home if no token found
        return;
      }

      try {
        // Assuming the backend generates a checkout for the Shopify Store
        const response = await axios.get(`http://localhost:3000/checkout`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCheckout(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching checkout:', err);
        setError('Failed to load checkout');
        setLoading(false);
      }
    };

    fetchCheckout();
  }, [navigate]);

  const handleCompleteCheckout = async () => {
    const token = sessionStorage.getItem('shopify_token');
    if (!token) {
      navigate('/'); // Redirect to home if no token found
      return;
    }

    try {
      // Send request to backend to complete the checkout process
      const response = await axios.post(
        `http://localhost:3000/complete-checkout`,
        { checkoutId: checkout.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Assuming the backend returns a checkout URL to Shopify
      window.location.href = response.data.checkoutUrl;
    } catch (err) {
      console.error('Error completing checkout:', err);
      alert('Error completing checkout');
    }
  };

  if (loading) return <div>Loading checkout...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <p><strong>Items:</strong> {checkout.lineItems.length}</p>
      <ul>
        {checkout.lineItems.map(item => (
          <li key={item.id}>
            {item.title} - {item.quantity} x ${item.price}
          </li>
        ))}
      </ul>
      <p><strong>Total:</strong> ${checkout.totalPrice}</p>
      <button onClick={handleCompleteCheckout}>Complete Checkout</button>
    </div>
  );
};

export default CheckoutPage;
