const express = require('express');
const router = express.Router();
const axios = require('axios');
const BridgePGUtil = require('../libs/BridgePGUtil');
const Session = require('../models/Session');

router.get('/', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.cookies.customer_sid) {
      console.warn('Missing customer_sid cookie');
      return res.status(401).json({ error: 'Not logged in' });
    }

    const session = await Session.findOne({ sessionId: req.cookies.customer_sid });
    if (!session) {
      console.warn('Session not found');
      return res.status(401).json({ error: 'Session not found' });
    }

    const csc_id = session?.customer?.tags?.find(tag => tag.startsWith('csc_id:'))?.split(':')[1];
    if (!csc_id) {
      console.warn('CSC ID not found in customer tags');
      return res.status(400).send('CSC ID not found');
    }

 
    const shopifyProductId = '8930640429293';
    const isCscUser = session.customer.tags.some(tag => tag.startsWith('csc_id'));

    const productRes = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
      {
        query: `
          query getProduct($id: ID!) {
            product(id: $id) {
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    priceV2 {
                      amount
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: `gid://shopify/Product/${shopifyProductId}`,
        },
      },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const product = productRes.data?.data?.product;
    if (!product) {
      console.error('Failed to fetch product from Shopify', productRes.data);
      return res.status(500).send('Product not found');
    }

    const variantEdge = product.variants.edges.find(edge =>
      isCscUser
        ? edge.node.title.toLowerCase().includes('csc')
        : edge.node.title.toLowerCase().includes('default')
    );

    if (!variantEdge) {
      console.warn('No matching variant found');
      return res.status(404).json({ error: 'No matching variant found' });
    }

    const variant = variantEdge.node;
    const price = parseFloat(variant.priceV2.amount).toFixed(2);

    

    const now = new Date();
    const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const generateTransactionId = (prefix = 'KeSIN') => `${prefix}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const generateReceiptNumber = (prefix = 'KeSIN') => {
      const timestamp = Math.floor(Date.now() / 1000);
      const randomNum = Math.floor(Math.random() * 900000) + 100000;
      return `${prefix}-${String(timestamp).slice(-6)}${randomNum}`;
    };

    const transactionId = generateTransactionId();
    const receiptNumber = generateReceiptNumber();

    
    const bconn = new BridgePGUtil();

    const paymentDetails = {
      csc_id: csc_id,
      merchant_id: process.env.MERCHANT_ID,
      merchant_txn: transactionId,
      merchant_txn_date_time: formattedTime,
      product_id: '2729282462',
      product_name: product.title,
      txn_amount: price,
      amount_parameter: '',
      txn_mode: 'D',
      txn_type: 'D',
      merchant_receipt_no: receiptNumber,
      csc_share_amount: '19.96',
      pay_to_email: 'kisanestore(at)gmail.com',
      return_url: encodeURIComponent('http://localhost:3000/success'),
      cancel_url: encodeURIComponent('http://localhost:3000/failed'),
      Currency: 'INR',
      Discount: '0',
      param_1: variant.title,
      param_2: `${price}*1`,
      param_3: '',
      param_4: 'GSTIN=24AADCK7156P1Z1,HSN_SAC=38220090,invoice_value=499,gst_rate=0.00,IGST=0.00,CGST=0.00,SGST=0.00'
    };

    
    bconn.set_params(paymentDetails);


    const enc_text = bconn.get_parameter_string();


    const frac = bconn.get_fraction();
    const paymentUrl = `${process.env.PAY_URL}/${frac}`;

    

    res.render('payment', {
      paymentDetails,
      paymentUrl,
      enc_text
    });

  } catch (error) {
    console.error('[ERROR] Payment route failed:', error.stack || error.message || error);
    res.status(500).send('Error generating payment URL. Please try again later.');
  }
});

module.exports = router;
