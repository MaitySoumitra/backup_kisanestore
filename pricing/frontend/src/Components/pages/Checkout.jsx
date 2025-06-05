import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { productId, title, price } = location.state || {};

  if (!productId || !title || !price) {
    return <div>Missing product details for checkout.</div>;
  }

  const handleCheckout = () => {
    alert(`Purchased "${title}" for ₹${price}`);
    navigate('/');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Checkout</h1>
      <p><strong>Product:</strong> {title}</p>
      <p><strong>Price:</strong> ₹{price}</p>
      <button
        onClick={handleCheckout}
        style={{
          padding: '0.8rem 1.2rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '1rem',
        }}
      >
        Confirm Purchase
      </button>
    </div>
  );
};

export default Checkout;
