// src/pages/CartPage.js
import React, { useEffect, useState } from 'react';

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    setCartItems(cart);
  }, []);

  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0).toFixed(2);
  };

  const handleCheckout = () => {
    const lineItems = cartItems.map(
      item => `${item.variantId.split('/').pop()}:${item.quantity}`
    );
    const checkoutUrl = `https://kisanestoredev.myshopify.com/cart/${lineItems.join(',')}`;
    window.location.href = checkoutUrl;
  };

  return (
    <div>
      <h1>Cart</h1>
      {cartItems.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          <ul>
            {cartItems.map((item, i) => (
              <li key={i}>
                {item.title} - {item.quantity} x ₹{item.price}
              </li>
            ))}
          </ul>
          <p>Total: ₹{getTotal()}</p>
          <button onClick={handleCheckout}>Checkout</button>
        </>
      )}
    </div>
  );
};

export default CartPage;
