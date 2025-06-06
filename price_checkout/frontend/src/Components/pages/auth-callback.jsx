import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useUser();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      login(token);
      navigate('/checkout'); // or any page you want
    } else {
      navigate('/');
    }
  }, []);

  return <p>Redirecting...</p>;
};

export default AuthCallback;
