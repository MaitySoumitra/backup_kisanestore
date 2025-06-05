import React, { createContext, useContext, useState } from "react";

// Create CartContext
const CartContext = createContext();

// Create a custom hook to use the CartContext
export const useCart = () => {
  return useContext(CartContext);
};

// CartProvider to wrap your app and provide the cart state
export const CartProvider = ({ children }) => {
  const [cartItemCount, setCartItemCount] = useState(0); // Initially, the cart is empty

  // Function to update the cart item count
  const updateCartItemCount = (newCount) => {
    setCartItemCount(newCount);
  };

  return (
    <CartContext.Provider value={{ cartItemCount, updateCartItemCount }}>
      {children}
    </CartContext.Provider>
  );
};
