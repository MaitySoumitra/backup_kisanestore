// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const { setUserData } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:3000/api/login',
        
        { email, password, productId: '8823165354234' }, // hardcoded product ID
        { withCredentials: true } // so backend sets the cookie
      );

      const { accessToken, user } = res.data;
      const { email: userEmail, firstName, tags } = user;

      setUserData({
        accessToken,
        email: userEmail,
        name: firstName,
        tags,
      });

      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3000/auth/google';
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '400px', margin: 'auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <hr />
      <button onClick={handleGoogleLogin}>
        Login with Google
      </button>
    </div>
  );
};

export default LoginPage;
