import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import { createCheckout, addItemToCart } from './shopifyService';

const ProductDetails = ({ productId }) => {
  const { user } = useUser() || {};
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutId, setCheckoutId] = useState(null);

  const GOOGLE_CLIENT_ID = '397860189012-coo19acg8r97ims3rns82oe6cueu8e6v.apps.googleusercontent.com';  // Replace with your actual Google Client ID
  const GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';  

  const generateState = () => Math.random().toString(36).substring(2, 15);

  const redirectToGoogleLogin = () => {
    const state = generateState();
    sessionStorage.setItem('google_state', state);

    const scope = 'profile email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
      `&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&prompt=select_account`;

    window.location.href = authUrl;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      const query = `{
        product(id: "gid://shopify/Product/${productId}") {
          id
          title
          descriptionHtml
          images(first: 1) {
            edges {
              node {
                src
                altText
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                priceV2 {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }`;

      try {
        const response = await axios.post(
          'https://kisanestoredev.myshopify.com/api/2023-01/graphql.json',
          { query },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': '9fa0275c43c9d14f1ad4ab3478472f5c',
            },
          }
        );

        setProduct(response.data?.data?.product);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load product:', err);
        setError('Could not load product');
      }
    };

    fetchProduct();
  }, [productId]);

  const handleBuyNowClick = () => {
    if (user) {
      window.location.href = '/checkout';
    } else {
      redirectToGoogleLogin();
    }
  };

  const handleAddToCartClick = async () => {
    if (!user) {
      redirectToGoogleLogin();
      return;
    }

    const variantId = product?.variants?.edges[0]?.node?.id;

    if (!checkoutId) {
      const lineItems = [{ variant_id: variantId, quantity: 1 }];
      const newCheckout = await createCheckout(lineItems);
      setCheckoutId(newCheckout.id);
    } else {
      await addItemToCart(checkoutId, variantId, 1);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!product) return <div>No product data available</div>;

  const productImage = product.images.edges[0].node;

  return (
    <div className="product-details">
      <h1>{product.title}</h1>
      <img src={productImage.src} alt={productImage.altText || product.title} />
      <p dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
      <p>
        {product.variants.edges[0].node.priceV2.amount}{' '}
        {product.variants.edges[0].node.priceV2.currencyCode}
      </p>
      <div>
        <button onClick={handleBuyNowClick}>Buy Now</button>
        <button onClick={handleAddToCartClick}>Add to Cart</button>
      </div>
    </div>
  );
};

export default ProductDetails;
