import { useState } from "react";
import {
  Navbar,
  Container,
  Row,
  Col,
  Form,
  Button,
  Nav,
  Offcanvas,
} from "react-bootstrap";
import { FaSearch } from "react-icons/fa";
import { BiSolidMessageSquareError, BiSolidStore } from "react-icons/bi";
import "./Header.css";
import Logo from "../Images/Logo.png";
import LogoMobile from "../Images/LogoMobile.png"; // Mobile logo

const Header = () => {
  const [showMenu, setShowMenu] = useState(false);
  const toggleMenu = () => setShowMenu(!showMenu);

  return (
    <>
      <Navbar bg="white" className="main-navbar" expand="lg">
        <Container className="header-container">
          <Row className="w-100 align-items-center">
            <Col
              
              lg={3}
              className="d-flex justify-content-between align-items-center"
            >
              <Navbar.Toggle
                aria-controls="offcanvasNavbar"
                onClick={toggleMenu}
                className="d-lg-none  toggle-header"
              />
              <Navbar.Brand className="d-flex justify-content-between w-100 header-logo">
                <img
                  src={Logo}
                  alt="Kisan e-Store"
                  className="header-dekstop-logo"
                />
                <img
                  src={LogoMobile}
                  alt="Kisan e-Store Mobile"
                  className="header-mobile-logo d-md-none"
                />
              </Navbar.Brand>
              <div className="d-md-none d-flex justify-content-between ">
                <div className="me-2 icon-enquiry mobile-icon-enquiry-seller">
                  <BiSolidMessageSquareError />
                </div>

                <div className="me-2 icon-seller mobile-icon-enquiry-seller">
                  <BiSolidStore />
                </div>
              </div>
            </Col>
            <Col lg={9}>
              <Row className="align-items-center search-bulk-seller">
                <Col lg={8} className="mb-lg-0">
                  <Form className="search-bar">
                    <Form.Control
                      type="text"
                      placeholder="Search products by name, brand, crop..."
                      className="search-input "
                    />
                    <Button variant="success" className="search-btn">
                      <FaSearch />
                    </Button>
                  </Form>
                </Col>

                <Col
                 
                  lg={2}
                  className="d-none d-lg-block text-center d-flex"
                >
                  <Button variant="success" className="bulk-inquiry-btn me-1">
                    Bulk Inquiry
                  </Button>
                </Col>

                <Col
                 
                  lg={2}
                  className="d-none d-lg-block text-center d-flex "
                >
                  <Button variant="outline-primary" className="seller-btn me-1">
                    Become a Seller
                  </Button>
                </Col>
              </Row>

              <hr className="my-3 d-none d-lg-block" />
              <Row>
                <Col>
                  <Nav className="justify-content-center justify-content-lg-between d-none d-md-flex">
                    <Nav.Link href="#">Home</Nav.Link>
                    <Nav.Link href="#">Categories</Nav.Link>
                    <Nav.Link href="#">Brands</Nav.Link>
                    <Nav.Link href="#">Contact Us</Nav.Link>
                    <Nav.Link href="#">Feedback Form</Nav.Link>
                    <Nav.Link href="#">Inquiry</Nav.Link>
                  </Nav>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </Navbar>
      <Offcanvas show={showMenu} onHide={toggleMenu} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column ">
            <Nav.Link href="#">Home</Nav.Link>
            <Nav.Link href="#">Categories</Nav.Link>
            <Nav.Link href="#">Brands</Nav.Link>
            <Nav.Link href="#">Contact Us</Nav.Link>
            <Nav.Link href="#">Feedback Form</Nav.Link>
            <Nav.Link href="#">Inquiry</Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default Header;
