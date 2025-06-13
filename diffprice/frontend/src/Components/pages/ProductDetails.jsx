import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate, useParams } from 'react-router-dom';

const SHOPIFY_DOMAIN = '3r0c1m-ki.myshopify.com';
const SHOPIFY_TOKEN = 'ae0d12d8063879f083f964cf1cfb91bc';

const ProductDetails = ({ productId: hardcodedId }) => {
  const { accessToken, userType, name, email } = useUser();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [showGoToCart, setShowGoToCart] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = id || hardcodedId;

  useEffect(() => {
    if (!accessToken) {
      navigate('/login');
    }
  }, [accessToken, navigate]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3000/api/products/${productId}`);
        const data = await res.json();

        if (data && data.variants?.length > 0) {
          setProduct(data);
          setError(null);
        } else {
          setError('Product or variants not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) fetchProduct();
  }, [productId, accessToken]);

const createCheckout = async (variantId, quantity = 1) => {
   if (userType === 'csc') {
    navigate('/custom-checkout', {
      state: {
        variantId,
        quantity,
        customer: { name, email }
      }
    });
    return;
  } else {
    // 👉 Normal user — Shopify checkout flow
    try {
      const tokenRes = await fetch('http://localhost:3000/api/shopify/customer-token', {
        credentials: 'include'
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.customerAccessToken) {
        alert('User not logged in or session expired.');
        return;
      }

      const query = `
        mutation cartCreate($input: CartInput!) {
          cartCreate(input: $input) {
            cart {
              id
              checkoutUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          lines: [{ merchandiseId: variantId, quantity }],
          buyerIdentity: { customerAccessToken: tokenData.customerAccessToken }
        }
      };

      const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN
        },
        body: JSON.stringify({ query, variables })
      });

      const json = await response.json();
      const checkoutUrl = json?.data?.cartCreate?.cart?.checkoutUrl;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert(json?.data?.cartCreate?.userErrors?.[0]?.message || 'Failed to create checkout');
      }

    } catch (error) {
      console.error('Shopify checkout error:', error);
      alert('Error creating Shopify checkout');
    }
  }
};


  const addToCart = async (variantId) => {
  const quantity = quantities[variantId] || 1;
  let cartId = localStorage.getItem('cartId');

  const addLinesToCart = async (cartId) => {
    const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({
        query: `
          mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          cartId,
          lines: [{ merchandiseId: variantId, quantity }]
        }
      }),
    });

    const json = await res.json();
    const userErrors = json?.data?.cartLinesAdd?.userErrors;

    if (userErrors && userErrors.length > 0) {
      console.error('Error adding to cart:', userErrors);
      alert(userErrors[0]?.message || 'Error adding to cart.');
    } else {
      setShowGoToCart(true);
    }
  };

  if (!cartId) {
    const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({
        query: `
          mutation cartCreate($input: CartInput!) {
            cartCreate(input: $input) {
              cart {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            lines: [{ merchandiseId: variantId, quantity }]
          }
        }
      }),
    });

    const json = await res.json();
    const newCartId = json?.data?.cartCreate?.cart?.id;
    const userErrors = json?.data?.cartCreate?.userErrors;

    if (newCartId) {
      localStorage.setItem('cartId', newCartId);
      cartId = newCartId;
      setShowGoToCart(true);
    } else if (userErrors?.length > 0) {
      console.error('Cart creation error:', userErrors);
      alert(userErrors[0]?.message || 'Could not create cart');
      return;
    }
  } else {
    await addLinesToCart(cartId);
  }
};


  const goToCart = () => {
    navigate('/cart', { state: { cartItems } });
  };

  const filteredVariants = useMemo(() => {
    return product?.variants.filter((variant) =>
      userType === 'csc'
        ? variant.title.toLowerCase().includes('csc')
        : !variant.title.toLowerCase().includes('csc')
    );
  }, [product, userType]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!product) return <div>No product found</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto', backgroundColor: '#fff' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <div><strong>{name}</strong></div>
        <div>{email}</div>
      </div>

      <h1>{product.title}</h1>

      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.title} style={{ width: '100%', maxHeight: '400px' }} />
      ) : (
        <div style={{ width: '100%', height: '300px', backgroundColor: '#eee', textAlign: 'center', lineHeight: '300px' }}>
          No Image Available
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: product.description }} />

      <h3>Variants:</h3>
      {filteredVariants.length === 0 ? (
        <p>No variants available for your user type.</p>
      ) : (
        <ul>
          {filteredVariants.map((variant) => (
            <li key={variant.id} style={{ marginBottom: '1rem' }}>
              {variant.title} - {parseFloat(variant.price).toFixed(2)} {variant.currencyCode}
              <input
                type="number"
                min="1"
                value={quantities[variant.id] || 1}
                onChange={(e) => setQuantities({ ...quantities, [variant.id]: parseInt(e.target.value) })}
                style={{ width: '60px', marginLeft: '10px' }}
              />
              <button onClick={() => addToCart(variant.id)} style={{ marginLeft: '10px' }}>
                Add to Cart
              </button>
              <button onClick={() => createCheckout(variant.id, quantities[variant.id] || 1)} style={{ marginLeft: '10px' }}>
                Buy Now
              </button>
            </li>
          ))}
        </ul>
      )}

      {showGoToCart && (
        <button onClick={goToCart} style={{ marginTop: '2rem', backgroundColor: 'green', color: 'white', padding: '0.5rem 1rem' }}>
          Go to Cart
        </button>
      )}
    </div>
  );
};

export default ProductDetails;