import React, { useState } from 'react';
import axios from 'axios';

const GOOGLE_CLIENT_ID = '397860189012-coo19acg8r97ims3rns82oe6cueu8e6v.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3000/api/login', { email, password }); // your backend
      localStorage.setItem('customerAccessToken', res.data.accessToken);
      window.location.href = '/';
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleGoogleLogin = () => {
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('google_state', state);

    const scope = 'profile email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
      `&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&prompt=select_account`;

    window.location.href = authUrl;
  };

  return (
    <div>
      <h2>Login to Continue</h2>
      <form onSubmit={handleEmailLogin}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <hr />
      <button onClick={handleGoogleLogin}>Login with Google</button>
    </div>
  );
};

export default LoginPage;



