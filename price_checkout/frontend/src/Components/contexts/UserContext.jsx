// src/contexts/UserContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [userType, setUserType] = useState('general');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const setUserData = ({ accessToken, email, name, tags = [] }) => {
    setAccessToken(accessToken);
    setEmail(email || '');
    setName(name || 'Guest');

    const isCSC = tags.some(tag => tag.startsWith('csc_id:'));
    setUserType(isCSC ? 'csc' : 'general');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/me', {
          withCredentials: true, // send cookie
        });

        const { accessToken, email, firstName, tags } = res.data;

        setUserData({
          accessToken,
          email,
          name: firstName,
          tags,
        });
      } catch (err) {
        console.error('User fetch failed. Possibly no cookie/session:', err);
        setAccessToken(null);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ accessToken, userType, email, name, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
