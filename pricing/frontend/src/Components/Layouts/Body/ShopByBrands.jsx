import { useEffect, useState } from "react";
import { Container, Row, Col, Button, Card, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom"; // Import Link for navigation
import "bootstrap/dist/css/bootstrap.min.css";
import "./ShopByBrands.css";

const ShopByBrands = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null); 

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("https://kisanestoredev.myshopify.com/api/2023-01/graphql.json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": "c2c0d5ac5aeae2d629915df7e7e422b6", // Your API token
          },
          body: JSON.stringify({
            query: `
              query {
                collections(first: 18) {
                  edges {
                    node {
                      id
                      title
                      handle
                      image {
                        src
                        altText
                      }
                    }
                  }
                }
              }
            `,
          }),
        });

        const data = await response.json();

        // Check if the response is valid
        if (data.errors) {
          throw new Error("Error fetching collections");
        }

        setCollections(data.data.collections.edges);
        setLoading(false); // Set loading to false once data is fetched
      } catch (err) {
        setError(err.message); // Handle errors
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);
  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" />
        <span className="ms-2">Loading collections...</span>
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
    <Container className="py-5 text-center">
    <div className="d-flex align-items-center justify-content-center">
      <h2 className="shop-by-brand-text">SHOP BY BRANDS</h2>
      <hr className="flex-grow-1 mx-3" />
      <Button className="view-brands-btn">View All Brands</Button>
    </div>
  
    <Row className="g-4 view-all-brands-list">
      {collections.map((collection, index) => (
        <Col key={index} xs={6} sm={4} md={3} lg={2} className="text-center">
          <Card
            className="view-all-brand-img"
            
          >
            <Link to={`/brands/${collection.node.handle}`}>
              {collection.node.image ? (
                <Card.Img
                  variant="top"
                  src={collection.node.image.src}
                  alt={collection.node.image.altText || collection.node.title}
                  className="card-img-centered"
                />
              ) : (
                <Card.Img
                  variant="top"
                  src="/path/to/default-image.jpg"
                  alt="Default Image"
                  className="card-img-centered"
                />
              )}
            </Link>
          </Card>
        </Col>
      ))}
    </Row>
  </Container>
  

  );
};

export default ShopByBrands;
