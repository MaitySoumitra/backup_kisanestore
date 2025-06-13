import React, { createContext, useState, useContext, useEffect } from 'react';

// Create a context for user
const UserContext = createContext();

export const useUser = () => {
  return useContext(UserContext); // Custom hook to access user context
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // On initial load, check localStorage for auth token and set the user
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setUser({ token }); // Optionally, you could fetch user details using this token
    }
  }, []);

  const loginUser = (token) => {
    localStorage.setItem('authToken', token);
    setUser({ token });
  };

  const logoutUser = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </UserContext.Provider>
  );
};
