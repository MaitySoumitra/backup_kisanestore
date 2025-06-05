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

    sessionStorage.setItem('customerAccessToken', accessToken);
  };

  useEffect(() => {
    const token = sessionStorage.getItem('customerAccessToken');
    if (!token) return;

    setAccessToken(token);

    const fetchUser = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/user?token=${token}`);
        const { email, firstName, tags } = res.data;

        setUserData({
          accessToken: token,
          email,
          name: firstName || 'Guest',
          tags: tags || [],
        });
      } catch (err) {
        console.error('Invalid token or failed to fetch user:', err);
        sessionStorage.removeItem('customerAccessToken');
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
