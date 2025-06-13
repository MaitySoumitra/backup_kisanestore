import { Container, Row, Col, Image } from "react-bootstrap";
import Invoice from "../Images/invoice.png";
import Delivery from "../Images/delivery.png";
import Badge from "../Images/badge.png";
import OnlineOrder from "../Images/online-order.png";

const features = [
  {
    imgSrc: Badge,
    title: "100% Satisfaction",
  },
  {
    imgSrc: OnlineOrder,
    title: "Online Transaction",
  },
  {
    imgSrc: Invoice,
    title: "GST Invoice for All Orders",
  },
  {
    imgSrc: Delivery,
    title: "All India Free Delivery",
  },
];

export default function Features() {
  return (
    <Container className="text-center bg-light p-4 rounded">
      <Row className="justify-content-center">
        {features.map((feature, index) => (
          <Col key={index} xs={6} md={3} className="d-flex flex-column align-items-center">
            <Image src={feature.imgSrc} width={50} height={50} alt={feature.title} />
            <p className="mt-2 fw-semibold">{feature.title}</p>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
