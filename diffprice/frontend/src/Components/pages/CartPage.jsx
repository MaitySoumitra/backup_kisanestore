import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SHOPIFY_DOMAIN = 'ke0tzw-ac.myshopify.com';
const SHOPIFY_TOKEN = 'd807988c944cfe8a7a76b02aa92ac35c';

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Create a new cart if none exists
  const createNewCart = async () => {
    const mutation = `
      mutation {
        cartCreate {
          cart {
            id
          }
        }
      }
    `;

    const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query: mutation }),
    });

    const json = await res.json();
    const newCartId = json?.data?.cartCreate?.cart?.id;

    if (newCartId) {
      localStorage.setItem('cartId', newCartId); // Save new cart ID to localStorage
    }

    return newCartId;
  };

  const fetchCart = async (cartId) => {
    const query = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      featuredImage {
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables: { cartId } }),
    });

    const json = await res.json();
    return json?.data?.cart;
  };

  useEffect(() => {
    const initCart = async () => {
      let cartId = localStorage.getItem('cartId');

      // If no cart ID, create a new one
      if (!cartId) {
        cartId = await createNewCart();
      }

      if (!cartId) {
        setLoading(false);
        return;
      }

      const fetchedCart = await fetchCart(cartId);

      // If the cart is not found (possibly expired), create a new one
      if (!fetchedCart) {
        const newCartId = await createNewCart();
        if (newCartId) {
          const newCart = await fetchCart(newCartId);
          setCart(newCart);
        }
      } else {
        setCart(fetchedCart);
      }

      setLoading(false);
    };

    initCart();
  }, []);

  if (loading) return <div>Loading cart...</div>;
  if (!cart) return <div>Your cart is empty.</div>;

  const items = cart.lines.edges;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <h1>Your Cart</h1>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map(({ node }) => {
            const variant = node.merchandise;
            return (
              <li key={node.id} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
                <h3>{variant.product.title} - {variant.title}</h3>
                {variant.product.featuredImage?.url && (
                  <img src={variant.product.featuredImage.url} alt={variant.title} style={{ maxWidth: '150px' }} />
                )}
                <p>Quantity: {node.quantity}</p>
                <p>Price: ₹{parseFloat(variant.price.amount).toFixed(2)}</p>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => window.location.href = cart.checkoutUrl}
        style={{ marginTop: '1rem' }}
      >
        Proceed to Checkout
      </button>
    </div>
  );
};

export default CartPage;
