// bridgePGUtil.js

const axios = require('axios');
const { BridgePG } = require('./BridgePG');
const { MERCHANT_ID } = process.env;

if (!MERCHANT_ID) {
  throw new Error('MERCHANT_ID not defined in environment variables.');
}

class BridgePGUtil {
  constructor() {
    this.bridgePG = new BridgePG();
    this.bridge_parameters = this.getDefaultParameters();
    this.merchant_id = MERCHANT_ID;
  }

  getDefaultParameters() {
    return {
      merchant_id: MERCHANT_ID,
      merchant_txn: 'P121' + Date.now() + Math.floor(Math.random() * 90 + 10),
      merchant_txn_date_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      product_id: '1112101',
      product_name: 'my product',
      txn_amount: '100',
      amount_parameter: 'NA',
      txn_mode: 'D',
      txn_type: 'D',
      merchant_receipt_no: new Date().toISOString().slice(0, 19).replace('T', ' '),
      csc_share_amount: '0',
      pay_to_email: 'a@abc.com',
      return_url: '',
      cancel_url: '',
      Currency: 'INR',
      Discount: '0',
      param_1: 'NA',
      param_2: 'NA',
      param_3: 'NA',
      param_4: 'NA',
    };
  }

  setParams(params) {
    Object.assign(this.bridge_parameters, params);
  }

  getParameterString() {
    const messageText = Object.entries(this.bridge_parameters)
      .map(([key, val]) => `${key}=${val}`)
      .join('|') + '|';

    const messageCipher = this.bridgePG.encrypt_message_for_wallet(messageText, false);
    return `${this.bridge_parameters.merchant_id}|${messageCipher}`;
  }

  getBridgeMessage(bridgeResponseMessage) {
    if (!bridgeResponseMessage) return 'Invalid Bridge message';
    const decrypted = this.bridgePG.decrypt_wallet_message(bridgeResponseMessage, 'Invalid Bridge message', false);
    return decrypted || bridgeResponseMessage;
  }

  getFraction(ddhhmm = '') {
    const timeFormat = new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(2, 14);
    const value = ddhhmm || timeFormat;
    const algoNum = '883';
    let frac = this.largeOp1(value, algoNum);
    frac = this.largeOp2(frac, (1000 - parseInt(algoNum)).toString());
    return frac;
  }

  largeOp1(n0, x0) {
    let n = n0.toString();
    let x = parseInt(x0);
    let vals = [];
    let tens = 0;

    for (let i = n.length - 1; i >= 0; i--) {
      const d = parseInt(n[i]);
      const res = d * x + tens;
      vals.unshift(res % 10);
      tens = Math.floor(res / 10);
    }

    if (tens > 0) vals.unshift(tens);
    return vals.join('');
  }

  largeOp2(n0, x0) {
    let n = n0.toString();
    let x = parseInt(x0);
    let vals = [];
    let tens = 0;

    for (let i = n.length - 1; i >= 0; i--) {
      let res = parseInt(n[i]) + (i === n.length - 1 ? x : tens);
      vals.unshift(res % 10);
      tens = Math.floor(res / 10);
    }

    if (tens > 0) vals.unshift(tens);
    return vals.join('');
  }

  async callBridgeAPI(method, data) {
    data.merchant_id = this.merchant_id;
    const messageText = Object.entries(data).map(([k, v]) => `${k}=${v}`).join('|') + '|';
    const messageCipher = this.bridgePG.encrypt_message_for_wallet(messageText, false);

    const jsonPayload = {
      merchant_id: this.merchant_id,
      request_data: messageCipher,
    };

    const url = `http://bridgeapi.csccloud.in/v1/${method.replace(/^\/+/, '')}/format/json`;

    try {
      const res = await axios.post(url, jsonPayload, {
        headers: { 'Content-Type': 'application/json' },
      });

      return this.parseAPIResponse(res.data);
    } catch (err) {
      console.error('Bridge API Error:', err.response?.data || err.message);
      throw new Error('Error calling Bridge API');
    }
  }

  parseAPIResponse(resp) {
    if (!resp) return null;

    const result = {};
    for (let [key, val] of Object.entries(resp)) {
      if (key === 'response_data' && val?.trim()) {
        result[key] = this.getBridgeMessage(val);
      } else {
        result[key] = val?.toString().trim();
      }
    }
    return result;
  }

  async getEnquiry(tid) {
    if (!this.merchant_id) throw new Error('Merchant ID not set.');
    return this.callBridgeAPI('transaction/enquiry', { merchant_txn: tid });
  }

  async getStatus(tid, csc_txn) {
    if (!this.merchant_id) throw new Error('Merchant ID not set.');
    return this.callBridgeAPI('transaction/status', { merchant_txn: tid, csc_txn });
  }

  async refundLog(data) {
    if (!this.merchant_id) throw new Error('Merchant ID not set.');
    return this.callBridgeAPI('refund/log', data);
  }

  async refundStatus(tid, csc_txn, refund_reference) {
    if (!this.merchant_id) throw new Error('Merchant ID not set.');
    return this.callBridgeAPI('refund/status', { merchant_txn: tid, csc_txn, refund_reference });
  }

  async reconLog(data) {
    if (!this.merchant_id) throw new Error('Merchant ID not set.');
    return this.callBridgeAPI('recon/log', data);
  }
}

module.exports = { BridgePGUtil };
