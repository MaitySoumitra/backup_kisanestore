import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductDetails = ({ productId }) => {
  const [product, setProduct] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [userType, setUserType] = useState(null); // 'csc' or 'general'
  const [loading, setLoading] = useState(true);
  const [checkoutId, setCheckoutId] = useState(null);

  const STOREFRONT_API_URL = 'https://kisanestoredev.myshopify.com/api/2023-01/graphql.json';
  const STOREFRONT_ACCESS_TOKEN = '9fa0275c43c9d14f1ad4ab3478472f5c';

  // Check token
  useEffect(() => {
    const token = localStorage.getItem('customerAccessToken');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const fetchCustomer = async () => {
      const query = `{
        customer(customerAccessToken: "${token}") {
          id
          email
          tags
        }
      }`;

      try {
        const res = await axios.post(STOREFRONT_API_URL, { query }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN
          }
        });
        const customerData = res.data.data.customer;
        setCustomer(customerData);
        setUserType(customerData.tags.includes('csc_id') ? 'csc' : 'general');
      } catch (err) {
        localStorage.removeItem('customerAccessToken');
        window.location.href = '/login';
      }
    };

    fetchCustomer();
  }, []);

  // Fetch Product
  useEffect(() => {
    const fetchProduct = async () => {
      const query = `{
        product(id: "gid://shopify/Product/${productId}") {
          id
          title
          descriptionHtml
          images(first: 1) {
            edges { node { src altText } }
          }
          variants(first: 1) {
            edges {
              node {
                id
                priceV2 { amount currencyCode }
              }
            }
          }
        }
      }`;

      try {
        const res = await axios.post(STOREFRONT_API_URL, { query }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN
          }
        });

        setProduct(res.data.data.product);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load product:', err);
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Add to Cart Logic
  const handleAddToCartClick = async () => {
    alert('Add to Cart logic would go here.');
  };

  const handleBuyNowClick = () => {
    window.location.href = '/checkout';
  };

  if (loading || !product || !customer) return <div>Loading...</div>;

  const variant = product.variants.edges[0].node;
  const originalPrice = parseFloat(variant.priceV2.amount);
  const finalPrice = userType === 'csc' ? (originalPrice * 0.8).toFixed(2) : originalPrice.toFixed(2);

  return (
    <div>
      <h1>{product.title}</h1>
      <p><strong>User Type:</strong> {userType === 'csc' ? 'CSC User' : 'General User'}</p>
      <img src={product.images.edges[0].node.src} alt={product.title} />
      <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
      <p><strong>Price:</strong> {finalPrice} {variant.priceV2.currencyCode}</p>
      <button onClick={handleBuyNowClick}>Buy Now</button>
      <button onClick={handleAddToCartClick}>Add to Cart</button>
    </div>
  );
};

export default ProductDetails;
