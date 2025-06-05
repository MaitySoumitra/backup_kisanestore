// frontend/src/components/LoginWithCSC.jsx
import React from "react";

const LoginWithCSC = () => {
  const handleLogin = () => {
    const clientId = "b18d4433-d095-4b40-d712-720b7665d90c";
    const redirectUri = encodeURIComponent("https://kisanestoredev.myshopify.com/auth-callback");

    // 🔐 Safer: use random ID (prevents CSRF), and store current page separately
    const csrfState = crypto.randomUUID(); // Unique token
    const currentPath = window.location.pathname;

    // Store both for callback validation
    sessionStorage.setItem("oauth_csrf", csrfState);
    sessionStorage.setItem("pre_auth_path", currentPath);

    // Construct full CSC OAuth URL
    const url = `https://connectuat.csccloud.in/account/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${csrfState}`;

    window.location.href = url;
  };

  return <button onClick={handleLogin}>Login with CSC</button>;
};

export default LoginWithCSC;
