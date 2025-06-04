import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
  return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('shopify_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLogin = (userData) => {
    setToken(userData.token);
    sessionStorage.setItem('shopify_token', userData.token);
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('shopify_token');
  };

  const value = {
    token,
    handleLogin,
    handleLogout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
