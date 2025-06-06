import { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Card } from "react-bootstrap";
import "./ProductList.css"

const ShopifyProducts = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.post(
          "https://kisanestoredev.myshopify.com/api/2023-01/graphql.json",
          {
            query: `{
                products(first: 8) {
                    edges {
                        node {
                            id
                            title
                            images(first: 1) {
                                edges {
                                    node {
                                        src
                                    }
                                }
                            }
                            variants(first: 1) {
                                edges {
                                    node {
                                        priceV2 {
                                            amount
                                            currencyCode
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }`
          },
          {
            headers: {
              "X-Shopify-Storefront-Access-Token":
                "c2c0d5ac5aeae2d629915df7e7e422b6",
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Shopify API Response:", response.data); // Debugging

        if (
          response.data &&
          response.data.data &&
          response.data.data.products
        ) {
          setProducts(response.data.data.products.edges);
        } else {
          console.error("Unexpected API response structure", response.data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  return (
    <Container className="py-4">
    <Row className="g-4">
        {products.map(({ node: product }) => (
            <Col key={product.id} xs={12} sm={6} md={4} lg={3}>
                <Card className="product-card">
                    <Card.Img variant="top" src={product.images.edges[0]?.node.src} alt={product.title} className="product-image" />
                    <Card.Body>
                        <Card.Title className="product-title">{product.title}</Card.Title>
                        <Card.Text className="product-price">
                            {product.variants.edges[0]?.node.priceV2.amount} {product.variants.edges[0]?.node.priceV2.currencyCode}
                        </Card.Text>
                    </Card.Body>
                </Card>
            </Col>
        ))}
    </Row>
</Container>
  );
};

export default ShopifyProducts;
