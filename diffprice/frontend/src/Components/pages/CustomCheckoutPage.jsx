import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const CustomCheckoutPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const handlePayment = async () => {
  try {
    const queryParams = new URLSearchParams({
      variantId: state.variantId,
      quantity: state.quantity,
      name: state.customer?.name,
      email: state.customer?.email,
    });

    const res = await fetch(`http://localhost:3000/csc?${queryParams.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
 
    });

    const contentType = res.headers.get("content-type");
    if (contentType.includes("application/json")) {
      const data = await res.json();
      console.log('Payment response:', data);

      if (res.ok && data.paymentUrl) {
        // Redirect to CSC Payment URL
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || 'Payment failed');
      }
    } else {
      // If server renders HTML (like EJS), just open in new window
      const html = await res.text();
      const newWindow = window.open();
      newWindow.document.write(html);
      newWindow.document.close();
    }
  } catch (err) {
    console.error('Payment error:', err);
    alert('Payment error. See console for details.');
  }
};


  return (
    <div style={{ padding: '2rem' }}>
      <h2>Custom Checkout</h2>
      <p>Product Variant: {state.variantId}</p>
      <p>Quantity: {state.quantity}</p>
      <p>Customer: {state.customer?.name} ({state.customer?.email})</p>

      <button onClick={handlePayment} style={{ padding: '10px 20px' }}>
        Pay Now with CSC
      </button>
    </div>
  );
};

export default CustomCheckoutPage;
