import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductDetails from './Components/pages/ProductDetails';
import CheckoutPage from './Components/pages/CheckoutPage';
import { UserProvider } from './Components/contexts/UserContext'; // Correct path to UserContext
import AuthCallback from './Components/pages/auth-callback'; // Correct path to AuthCallback
import LoginPage from './Components/pages/LoginPage'; // Correct path to LoginPage
import AdminDiscountPage from './pages/AdminDiscountPage';
import CartPage from './Components/pages/CartPage';

const App = () => {
  const [user, setUser] = useState(null);

  // Effect to check if a token exists in sessionStorage or cookies
  useEffect(() => {
    const token = sessionStorage.getItem('shopify_token');
    if (token) {
      setUser({ token }); // You could store more user info here if needed
    }
  }, []);

  const handleLogin = (userData) => {
    // Set user data to state (this could be a token or full user info)
    setUser(userData);
    sessionStorage.setItem('shopify_token', userData.token);
  };

  const handleLogout = () => {
    // Clear user data
    setUser(null);
    sessionStorage.removeItem('shopify_token');
  };

  return (
    <UserProvider >
      <Router>
        <div className="App">


          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/" element={<ProductDetails productId="8930640429293" />} />
            <Route path="/checkout/:encodedCartId" element={<CheckoutPage />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/admin/discounts" element={<AdminDiscountPage />} /> 
            <Route path="/cart" element={<CartPage />} />
          </Routes>

        </div>
      </Router>
    </UserProvider>
  );
};

export default App;
