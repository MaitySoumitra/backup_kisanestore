import React from "react";
import { Navbar, Container, Button, Nav, Badge } from "react-bootstrap";
import { FaUserCircle, FaShoppingCart, FaGoogle } from "react-icons/fa";
import GoogleLogo from "../Images/language.png";
import "./TopHeader.css";

const TopHeader = () => {
  return (
    <Navbar variant="dark" className="top-header">
      <Container className="d-flex justify-content-between">

        <Button variant="outline-light" className="language-button">
          <img src={GoogleLogo} alt="Google Logo" className="google-icon" />
          Select Language
        </Button>

        {/* Right: My Account and Cart */}
        <Nav className="d-flex align-items-center gap-1">
          <Nav.Link href="#" className="d-flex align-items-center">
            <FaUserCircle className="nav-icon" />
          </Nav.Link>
          <Nav.Link
            href="#"
            className="d-flex align-items-center position-relative"
          >
            <FaShoppingCart className="nav-icon" />
            <Badge bg="danger" pill className="cart-badge">
              3
            </Badge>
          </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default TopHeader;
