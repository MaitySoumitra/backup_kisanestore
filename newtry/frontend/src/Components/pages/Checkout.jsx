
import React from 'react';
import { useUser } from '../contexts/UserContext';

const Checkout = () => {
  const { token } = useUser();

  if (!token) return <p>Please log in first</p>;

  return <h2>This is a protected checkout page</h2>;
};

export default Checkout;
