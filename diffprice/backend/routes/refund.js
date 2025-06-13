const express = require('express');
const router = express.Router();
const axios = require('axios');
const BridgePGUtil = require('../libs/BridgePGUtil');

router.post('/', async (req, res) => {
  try {
    console.log('=========== [REFUND WEBHOOK RECEIVED] ===========');
    const payload = req.body;
    console.log('[REFUND] Incoming Payload:', JSON.stringify(payload, null, 2));

    const orderId = payload.order_id;
    const refundNote = payload.note || 'Refund from Shopify Admin';
    const refundAmount = parseFloat(payload.transactions?.[0]?.amount || '0.00').toFixed(2);

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Missing order_id in webhook' });
    }

    console.log('[REFUND] order_id:', orderId);
    console.log('[REFUND] refundAmount:', refundAmount);
    console.log('[REFUND] refundNote:', refundNote);

    const orderResponse = await axios.get(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-04/orders/${orderId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
          'Content-Type': 'application/json',
        }
      }
    );

    const order = orderResponse.data?.order;
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found in Shopify' });
    }

    console.log('[REFUND] Order Fetched from Shopify:', JSON.stringify(order, null, 2));

    const noteAttributes = order.note_attributes || [];
    const getAttr = (name) => noteAttributes.find(n => n.name === name)?.value || '';

    const orderTotal = parseFloat(order.total_price || '0.00').toFixed(2);
    const isFullRefund = refundAmount === orderTotal;

    const refundData = {
      merchant_id: parseInt(process.env.MERCHANT_ID),
      merchant_txn: getAttr('merchant_txn'),
      csc_txn: getAttr('csc_txn'),
      product_id: getAttr('product_id'),
      merchant_txn_status: getAttr('txn_status') === '100' ? 'Success' : 'Failed',
      merchant_reference: getAttr('merchant_receipt_no'),
      refund_deduction: refundAmount,
      refund_mode: isFullRefund ? 'F' : 'P',
      merchant_txn_param: isFullRefund ? 'N' : Math.floor(100000 + Math.random() * 900000).toString(),
      refund_type: 'R', // You may extend this logic if needed
      refund_trigger: 'M',
      refund_reason: refundNote.substring(0, 50)
    };

    console.log('[REFUND] Prepared refundData:', refundData);

    // Validate all required fields
    const requiredFields = [
      'merchant_id', 'merchant_txn', 'csc_txn', 'product_id', 'merchant_txn_status',
      'merchant_reference', 'refund_deduction', 'refund_mode',
      'merchant_txn_param', 'refund_type', 'refund_trigger', 'refund_reason'
    ];

    const missingFields = requiredFields.filter(field => !refundData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const bridge = new BridgePGUtil();
    bridge.set_mid(refundData.merchant_id);

    console.log('[REFUND] Sending to CSC refund_log:', refundData);

    const refundResponse = await bridge.refund_log(
      refundData.merchant_txn,
      refundData.csc_txn,
      refundData.product_id,
      refundData.merchant_txn_status,
      refundData.merchant_reference,
      refundData.refund_deduction,
      refundData.refund_mode,
      refundData.refund_type,
      refundData.refund_trigger,
      refundData.refund_reason
    );

    const rawEncrypted = global.bridgeResponseMessage || 'NA';
    const decrypted = bridge.get_bridge_message({ bridgeResponseMessage: rawEncrypted });

    console.log('[REFUND] CSC Raw Encrypted Message:', rawEncrypted);
    console.log('[REFUND] CSC Decrypted Response:', decrypted);

    let refundReference = '';
    if (typeof decrypted === 'string') {
      decrypted.split('|').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key === 'refund_reference') {
          refundReference = value;
        }
      });
    }

    if (!refundReference) {
      console.warn('[REFUND] refund_reference not found in CSC response');
      return res.status(200).json({
        success: false,
        message: 'Refund log sent but refund_reference missing',
        raw: rawEncrypted,
        decrypted,
        refundData
      });
    }

    const statusResp = await bridge.refund_status(
      refundData.merchant_txn,
      refundData.csc_txn,
      refundReference
    );

    const statusDecrypted = global.bridgeResponseMessage || 'NA';
    const parsedStatus = bridge.decrypt_message(statusDecrypted);

    return res.status(200).json({
      success: true,
      message: 'Refund processed and status fetched',
      refund_reference: refundReference,
      refund_data: refundData,
      csc_refund_log_encrypted: rawEncrypted,
      csc_refund_log_decrypted: decrypted,
      csc_refund_status_raw: statusDecrypted,
      csc_refund_status_parsed: parsedStatus
    });

  } catch (err) {
    console.error('[REFUND] ERROR:', err.stack || err.message);
    return res.status(500).json({
      success: false,
      message: 'Refund webhook failed',
      error: err.message
    });
  }
});

module.exports = router;
