import { Container, Row, Col } from "react-bootstrap";
import "./Footer.css"
const categories = [
  { title: "SEEDS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "MUSHROOM", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "FERTILIZERS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "CERTIFIED ORGANIC PRODUCTS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907"] },
  { title: "BIO PRODUCTS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "INSECTS TRAPS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "SPRAY PUMPS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "HYDROPONICS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "FARM MACHINERY", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt"] },
  { title: "FARM TOOLS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt"] },
  { title: "ENGINES", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt", "Iris F1 Cabbage"] },
  { title: "WATER PUMPS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt"] },
  { title: "SOLAR PRODUCTS", items: ["Brinjal PK-27", "Lauki Fi Julie", "Brinjal Gulabo", "Patta Gobi INDU", "Hot Pepper Balaram 5907", "Pepper F1 Iris Bolt"] },
];

const benefits = [
  "Farmers will get Agro-input Products at lower rates than market rates, as manufacturers supply directly to farmers, saving huge margins.",
  "Farmers will get FREE home delivery of Agro-input Products.",
  "Farmers will get Agro-input Products within time limits.",
  "Farmers can get & know about the latest technology in agricultural products.",
  "Farmers will also get awareness of the latest technology in Eco-Friendly Products, Organic Farming, and Integrated Pest Management."
];

const deliveryInfo = [
  {
    title: "1. Indian Postal Department / Private Courier",
    description: "Parcels up to 20 kg are home delivered by Indian Postal Department or Private Courier. We deliver products in all the deepest parts of rural India."
  },
  {
    title: "2. Other Transports",
    description: "Parcels above 20 kg will be delivered by transport to your nearest town place. You have to take delivery from the transport office & manage further transportation at your own cost."
  },
  {
    title: "3. Tracking",
    description: "As we dispatch the parcel, we send you an email with all tracking details. If you cannot track your parcel, please contact our helpdesk, provide your order number & they will tell you the status of your parcel."
  },
  {
    title: "4. Delivery Time",
    description: "Delivery time is 7 working days, but it may vary due to product type, source, and destination."
  }
];

export default function MostSearched() {
  return (
    <Container className=" btm-ftr">
      <h4 className="fw-bold-kisan-label">Most Searched on Kisan E-Store</h4>
      <Row>
        {categories.map((category, index) => (
          <Col xs={12} key={index} className="">
          <div className="d-flex align-items-center">
            <p className="fw-bol mb-0 btm-ctg-title">{category.title}:</p>
            <p className="text-muted-product mb-0">
              {category.items.map((item, i) => (
                <span key={i}>
                  {item} {i < category.items.length - 1 && " | "}
                </span>
              ))}
            </p>
           
          </div>
          <hr className="cntr-line-product"/>
        </Col>
        
        ))}
        <p className="fw-bold btm-view-all-ctg">VIEW ALL CATEGORY</p>
      </Row>
      

      <h5 className="ftr-benefits-frm">Benefits to Farmers</h5>
        {/* Added horizontal line for separation */}
      <ul className="m-0 text-muted-bullet">
        {benefits.map((benefit, i) => (
          <li key={i} className="p-1 txt-bullet-benefit">{benefit}</li>
        ))}
        
      </ul>

      <h5 className="ftr-benefits-frm">Delivery Information</h5>
      
  {deliveryInfo.map((info, i) => (
    <div key={i} className="mb-3 ">
      {/* Title in bold */}
      <p><strong style={{color:"#4AAE37"}}>{info.title}</strong> : {info.description}</p> {/* Description under the title */}
    </div>
  ))}
  <hr style={{marginTop: "60px", marginBottom: "0px", fontSize:"2px"}}/>


    </Container>
  );
}
