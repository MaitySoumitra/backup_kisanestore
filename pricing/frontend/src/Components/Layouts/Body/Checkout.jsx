// frontend/src/Components/Layouts/Body/Checkout.jsx
import React from 'react';
import { useUser } from '../../contexts/UserContext';  // Correct path

const Checkout = () => {
  const { token } = useUser();

  if (!token) {
    return <p>Please log in first</p>;
  }

  // Proceed with checkout using token
  return <h2>This is a protected checkout page</h2>;
};

export default Checkout;
