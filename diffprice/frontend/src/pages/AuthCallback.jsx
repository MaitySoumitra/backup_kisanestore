// frontend/src/pages/AuthCallback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const returnedState = params.get("state");

    const expectedState = sessionStorage.getItem("oauth_csrf");
    const redirectPath = sessionStorage.getItem("pre_auth_path") || "/";

    if (!code || !returnedState || returnedState !== expectedState) {
      alert("Invalid login or CSRF token mismatch.");
      return;
    }

    // Send code to backend to exchange it for the access token
    fetch(`http://localhost:3000/auth-callback?code=${code}&state=${returnedState}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customerAccessToken) {
          sessionStorage.setItem("shopify_token", data.customerAccessToken);
          navigate(redirectPath); // 🎯 redirect to where the user started
        } else {
          alert("Login failed.");
        }
      })
      .catch((err) => {
        console.error("Error during CSC login:", err);
        alert("Something went wrong.");
      });
  }, [navigate]);

  return <p>Authenticating via CSC...</p>;
};

export default AuthCallback;
