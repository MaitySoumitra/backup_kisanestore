const express = require('express');
const router = express.Router();
const axios = require('axios');
const BridgePGUtil = require('../libs/BridgePGUtil');

router.post('/', async (req, res) => {
  const bridgePGUtil = new BridgePGUtil();
  const bridgeResponseMessage = req.body.bridgeResponseMessage;

  let debugInfo = {
    rawResponse: req.body,
    encryptedMessage: bridgeResponseMessage || 'Not received',
    decryptedMessage: '',
    parsedData: {},
    verificationResult: '',
    shopifyOrder: null,
    shopifyOrderError: null,
  };

  try {
    if (!bridgeResponseMessage) {
      debugInfo.verificationResult = 'FAILED - Missing bridgeResponseMessage';
      console.error('Missing bridgeResponseMessage in request body');
      return res.render('failed', {
        errorMessage: 'Invalid response from payment gateway (missing bridgeResponseMessage)',
        transactionId: 'N/A',
        amount: 'N/A',
        debugInfo,
      });
    }

    // Decrypt BridgePG message
    const decryptedBridgeMessage = bridgePGUtil.get_bridge_message({ bridgeResponseMessage });
    debugInfo.decryptedMessage = decryptedBridgeMessage;
    console.log('[BridgePG] Decrypted outer message:', decryptedBridgeMessage);

    const responseData = bridgePGUtil.decrypt_message(decryptedBridgeMessage);
    debugInfo.parsedData = responseData;
    console.log('[BridgePG] Parsed data:', responseData);

    const txnStatus = responseData.txn_status;
    const transactionId = responseData.merchant_txn || responseData.txn_id || 'N/A';
    const txnAmount = responseData.txn_amount || responseData.amount || 'N/A';
    const cscTxn = responseData.csc_txn || 'N/A';

    if (txnStatus === '100') {
      console.log('[PAYMENT SUCCESS] Transaction status is 100');

      // Shopify order creation
      try {
        const variantId = 47394262384890;
        const customerEmail = responseData.email || 'testuser@example.com';

        console.log('[SHOPIFY] Preparing to create order with:');
        console.log('Variant ID:', variantId);
        console.log('Customer Email:', customerEmail);
        console.log('Transaction Amount:', txnAmount);

        // Add full metadata into note_attributes
        const noteAttributes = [
          { name: "merchant_txn", value: responseData.merchant_txn },
          { name: "csc_txn", value: responseData.csc_txn },
          { name: "merchant_receipt_no", value: responseData.merchant_receipt_no },
          { name: "txn_status", value: responseData.txn_status },
          { name: "txn_amount", value: responseData.txn_amount },
          { name: "product_id", value: responseData.product_id },
          { name: "csc_id", value: responseData.csc_id },
          { name: "txn_mode", value: responseData.txn_mode },
          { name: "txn_type", value: responseData.txn_type },
          { name: "pay_to_email", value: responseData.pay_to_email },
          { name: "currency", value: responseData.currency },
          { name: "discount", value: responseData.discount }
        ].filter(attr => attr.value); // Remove undefined/null values

        const orderPayload = {
          order: {
            line_items: [
              {
                variant_id: variantId,
                quantity: 1
              }
            ],
            financial_status: "paid",
            customer: {
              email: customerEmail
            },
            transactions: [
              {
                kind: "sale",
                status: "success",
                amount: txnAmount
              }
            ],
            note_attributes: noteAttributes,
            note: `BridgePG Payment: ${responseData.merchant_txn} | CSC Txn: ${responseData.csc_txn}`
          }
        };

        console.log('[SHOPIFY] Sending order payload:', JSON.stringify(orderPayload, null, 2));

        const createOrderResponse = await axios.post(
          `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-07/orders.json`,
          orderPayload,
          {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('[SHOPIFY] Order creation response:', createOrderResponse.data);

        debugInfo.shopifyOrder = createOrderResponse.data;
        const orderId = createOrderResponse.data.order.id;

        return res.render('success', {
          transactionId,
          amount: txnAmount,
          cscTxn,
          status: 'Success',
          orderId,
          debugInfo
        });

      } catch (err) {
        console.error('[SHOPIFY ERROR] Failed to create order:');
        debugInfo.shopifyOrderError = err.response?.data || err.message;

        return res.render('success', {
          transactionId,
          amount: txnAmount,
          cscTxn,
          status: 'Success (but Shopify order creation failed)',
          debugInfo
        });
      }

    } else {
      console.warn('[PAYMENT FAILED] txn_status is:', txnStatus);
      debugInfo.verificationResult = `FAILED - txn_status is ${txnStatus}`;
      return res.render('failed', {
        errorMessage: responseData.txn_status_message || `Transaction failed with status: ${txnStatus}`,
        transactionId,
        amount: txnAmount,
        debugInfo
      });
    }

  } catch (error) {
    console.error('[UNHANDLED ERROR] While processing payment:', error.stack || error.message || error);
    debugInfo.verificationResult = 'ERROR during decryption or processing';
    debugInfo.error = error.message;

    return res.render('failed', {
      errorMessage: 'An error occurred while processing your payment',
      transactionId: 'N/A',
      amount: 'N/A',
      debugInfo
    });
  }
});

// Optional: prevent refresh-based duplicate access
router.get('/', (req, res) => {
  return res.render('failed', {
    errorMessage: 'Invalid access method. Please do not refresh this page.',
    transactionId: 'N/A',
    amount: 'N/A',
    debugInfo: {
      accessMethod: 'GET',
      verificationResult: 'FAILED - GET access not allowed',
    }
  });
});

module.exports = router;
