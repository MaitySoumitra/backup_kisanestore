import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom'; // Import to get the collection handle from the URL
import "bootstrap/dist/css/bootstrap.min.css";

const CollectionPage = () => {
  const { handle } = useParams(); // Get collection handle from URL
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = `
      query($handle: String!) {
        collection(handle: $handle) {
          products(first: 10) {
            edges {
              node {
                id
                title
                handle
                images(first: 1) {
                  edges {
                    node {
                      src
                      altText
                    }
                  }
                }
                priceRange {
                  minVariantPrice {
                    amount
                  }
                }
              }
            }
          }
        }
      }
    `;

    const fetchProducts = async () => {
      try {
        const response = await fetch('https://tse30w-sr.myshopify.com/api/2023-01/graphql.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': '1f5697d1c1ab4265bf17c22b7931c34d', // Your API token
          },
          body: JSON.stringify({
            query: query,
            variables: {
              handle: handle, // Pass the handle as a variable to the GraphQL query
            },
          }),
        });

        const data = await response.json();
        console.log(data); // Log the response for debugging

        if (data.errors) {
          throw new Error('Error fetching products');
        }

        setProducts(data.data.collection.products.edges);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProducts();
  }, [handle]);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" />
        <span className="ms-2">Loading products...</span>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5 text-center">
        <h3>Error: {error}</h3>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="text-center">Products in {handle} Collection</h2>
      <Row className="g-3">
        {products.map((product, index) => (
          <Col key={index} xs={6} sm={4} md={3} lg={2} className="text-center">
            <Card className="shadow-sm">
              {product.node.images && product.node.images.edges.length > 0 ? (
                <Card.Img
                  variant="top"
                  src={product.node.images.edges[0].node.src}
                  alt={product.node.images.edges[0].node.altText || product.node.title}
                />
              ) : (
                <Card.Img
                  variant="top"
                  src="/path/to/default-image.jpg"
                  alt="Default Image"
                />
              )}
              <Card.Body>
                <Card.Title>{product.node.title}</Card.Title>
                <Card.Text>
                  Rs {product.node.priceRange.minVariantPrice.amount}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default CollectionPage;
