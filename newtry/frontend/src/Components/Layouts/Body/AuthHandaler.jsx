// AuthHandler.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const redirectPath = params.get('state') || '/';

    if (token) {
      localStorage.setItem('authToken', token);
      // Optional: fetch user info with token
      navigate(redirectPath);
    } else {
      navigate('/');
    }
  }, [navigate]);

  return <div>Authenticating...</div>;
};

export default AuthHandler;
