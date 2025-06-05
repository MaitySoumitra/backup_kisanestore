import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const ProductDetails = ({ productId: hardcodedId }) => {
  const { accessToken, userType } = useUser();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = id || hardcodedId;

  // Redirect if no access token
  useEffect(() => {
    const token = accessToken || sessionStorage.getItem('customerAccessToken');
    if (!token) navigate('/login');
  }, [accessToken, navigate]);

  // Fetch product from Shopify Storefront API
  useEffect(() => {
    const token = accessToken || sessionStorage.getItem('customerAccessToken');
    if (!token) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const query = `{
          product(id: "gid://shopify/Product/${productId}") {
            title
            descriptionHtml
            images(first: 1) {
              edges { node { src } }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  priceV2 { amount currencyCode }
                }
              }
            }
          }
        }`;

        const res = await axios.post(
          'https://kisanestoredev.myshopify.com/api/2023-01/graphql.json',
          { query },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': '9fa0275c43c9d14f1ad4ab3478472f5c',
            },
          }
        );

        const data = res.data?.data?.product;
        if (data) {
          setProduct(data);
          setError(null);
        } else {
          setError('Product not found');
          setProduct(null);
        }
      } catch (err) {
        console.error('Product fetch failed:', err);
        setError('Failed to load product');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, accessToken]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!product) return <div>No product found</div>;

  // Filter variants based on userType and presence of "CSC" in title (case-insensitive)
  const filteredVariants = product.variants.edges.filter(({ node }) =>
    userType === 'csc'
      ? node.title.toLowerCase().includes('csc')
      : !node.title.toLowerCase().includes('csc')
  );

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: '#fff',
        color: '#222',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        border: '1px solid #ccc',
      }}
    >
      <h2
        style={{
          color: '#4B3621',
          borderBottom: '2px solid #4B3621',
          paddingBottom: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '1.5rem',
        }}
      >
        {userType === 'csc' ? 'CSC User' : 'General User'}
      </h2>

      <h1 style={{ color: '#000', marginBottom: '1rem' }}>{product.title}</h1>

      <img
        src={product.images.edges[0].node.src}
        alt={product.title}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        }}
      />

      <div
        style={{ marginBottom: '1.5rem', color: '#444' }}
        dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
      />

      <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Variants:</h3>
      {filteredVariants.length === 0 ? (
        <p>No variants available for your user type.</p>
      ) : (
        <ul style={{ marginBottom: '1.5rem' }}>
          {filteredVariants.map(({ node }) => (
            <li key={node.id} style={{ marginBottom: '0.7rem' }}>
              {parseFloat(node.priceV2.amount).toFixed(2)}{' '}
              {node.priceV2.currencyCode} 
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() =>
          navigate('/checkout', {
            state: {
              productId,
              title: product.title,
              price: filteredVariants.length > 0
                ? parseFloat(filteredVariants[0].node.priceV2.amount).toFixed(2)
                : null,
            },
          })
        }
        style={{
          padding: '0.8rem 1.5rem',
          backgroundColor: '#4B3621',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem',
          transition: 'background 0.3s ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2E1B0E')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4B3621')}
      >
        Buy Now
      </button>
    </div>
  );
};

export default ProductDetails;
