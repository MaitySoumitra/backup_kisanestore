const BridgePG = require('./BridgePG');
const axios = require('axios'); // You'll need to install this: npm install axios

class BridgePGUtil {
    constructor() {
        if (!process.env.MERCHANT_ID) {
            throw new Error('MERCHANT_ID is required in environment variables');
        }
        
        this.bridgePG = new BridgePG();
        this.bridge_parameters = this.get_default_parameters();
        this.merchant_id = null; // For API calls
    }

    // Static method to get default parameters
    get_default_parameters() {
        const now = new Date();
        const timestamp = Math.floor(now.getTime() / 1000);
        const randomNum = Math.floor(Math.random() * 90) + 10;
        const dateTimeString = now.toISOString().slice(0, 19).replace('T', ' ');
        
        return {
            merchant_id: process.env.MERCHANT_ID,
            merchant_txn: 'P121' + timestamp + randomNum,
            merchant_txn_date_time: dateTimeString,
            product_id: '1112101',
            product_name: 'my product',
            txn_amount: '100',
            amount_parameter: 'NA',
            txn_mode: 'D',
            txn_type: 'D',
            merchant_receipt_no: dateTimeString,
            csc_share_amount: '0',
            pay_to_email: 'NA',
            return_url: '',
            cancel_url: '',
            Currency: 'INR',
            Discount: '0',
            param_1: 'NA',
            param_2: 'NA',
            param_3: 'NA',
            param_4: 'NA'
        };
    }

    // Set parameters foreach logic
    set_params(params) {
        for (const [p, v] of Object.entries(params)) {
            this.bridge_parameters[p] = v;
        }
    }

    // Legacy camelCase version
    setParams(params) {
        return this.set_params(params);
    }

    // Get parameter string logic
    get_parameter_string() {
        let message_text = '';
        for (const [p, v] of Object.entries(this.bridge_parameters)) {
            message_text += p + '=' + v + '|';
        }
        
        // IMPORTANT: Use FALSE for urlEncode parameter
        const message_cipher = this.bridgePG.encrypt_message_for_wallet(message_text, false);
        return this.bridge_parameters.merchant_id + '|' + message_cipher;
    }

    // Legacy camelCase version
    getParameterString() {
        return this.get_parameter_string();
    }

    // Get bridge message from response logic
    get_bridge_message(postData = null) {
        let d = "Invalid Bridge message";
        
        // Use provided postData or check global POST equivalent
        const bridgeResponseMessage = postData?.bridgeResponseMessage || 
                                    process.env.bridgeResponseMessage || 
                                    global.bridgeResponseMessage;
        
        if (bridgeResponseMessage) {
            try {
                const result = this.bridgePG.decrypt_wallet_message(bridgeResponseMessage, false, false);
                if (result && result.message) {
                    d = result.message;
                } else if (!result.isValid) {
                    d = bridgeResponseMessage;
                } else {
                    d = bridgeResponseMessage;
                }
            } catch (error) {
                d = bridgeResponseMessage;
            }
        }
        
        return d;
    }

    // Legacy camelCase version
    getBridgeMessage(postData = null) {
        return this.get_bridge_message(postData);
    }

    // Get fraction logic
    get_fraction(ddhhmm = "") {
        const time_format = "ymdHis";
        const algo_num = "883";
        
        if (!ddhhmm) {
            const now = new Date();
            // Format date('ymdHis')
            ddhhmm = now.getFullYear().toString().slice(-2) +
                    String(now.getMonth() + 1).padStart(2, '0') +
                    String(now.getDate()).padStart(2, '0') +
                    String(now.getHours()).padStart(2, '0') +
                    String(now.getMinutes()).padStart(2, '0') +
                    String(now.getSeconds()).padStart(2, '0');
        }
        
        let frac = this.large_op1(ddhhmm, algo_num);
        frac = this.large_op2(frac, "" + (1000 - parseInt(algo_num)));
        return frac;
    }

    // Legacy camelCase version
    getFraction(ddhhmm = "") {
        return this.get_fraction(ddhhmm);
    }

    // Large operation 1 logic
    large_op1(n0, x0) {
        const n = '' + n0;
        const x = '' + x0;
        const sz = n.length;
        const vals = [];
        let tens = 0;
        
        for (let i = 0; i < sz; i++) {
            const d = parseInt(n[sz - i - 1]);
            const res = d * parseInt(x) + tens;
            const ones = res % 10;
            tens = Math.floor(res / 10);
            vals.unshift(ones);
        }
        
        if (tens > 0) {
            vals.unshift(tens);
        }
        return vals.join("");
    }

    // Large operation 2 logic
    large_op2(n0, x0) {
        const n = '' + n0;
        const x = '' + x0;
        const sz = n.length;
        const vals = [];
        let tens = 0;
        
        for (let i = 0; i < sz; i++) {
            const d = parseInt(n[sz - i - 1]);
            let res;
            if (i === 0) {
                res = d + parseInt(x);
            } else {
                res = d + tens;
            }
            const ones = res % 10;
            tens = Math.floor(res / 10);
            vals.unshift(ones);
        }
        
        if (tens > 0) {
            vals.unshift(tens);
        }
        return vals.join("");
    }

    // API Methods implementation

    // Set merchant ID
    set_mid(mid) {
        this.merchant_id = mid;
    }

    // Get enquiry
    async get_enquiry(tid) {
        if (!this.merchant_id) {
            throw new Error("Merchant ID not set. Please call set_mid first.");
        }
        const data = {
            merchant_txn: tid
        };
        const result = await this._call_bridge_api('transaction/enquiry', data);
        return 1;
    }

    // Get status
    async get_status(tid, csc_txn) {
        if (!this.merchant_id) {
            throw new Error("Merchant ID not set. Please call set_mid first.");
        }
        const data = {
            merchant_txn: tid,
            csc_txn: csc_txn
        };
        const result = await this._call_bridge_api('transaction/status', data);
        return 1;
    }

    // Refund log
    async refund_log(
        merchant_txn,
        csc_txn,
        product_id,
        merchant_txn_status,
        merchant_reference,
        refund_deduction,
        refund_mode,
        refund_type,
        refund_trigger,
        refund_reason
    ) {
        if (!this.merchant_id) {
            throw new Error("Merchant ID not set. Please call set_mid first.");
        }
        const data = {
            merchant_txn,
            csc_txn,
            product_id,
            merchant_txn_status,
            merchant_reference,
            refund_deduction,
            refund_mode,
            refund_type,
            refund_trigger,
            refund_reason
        };
        const result = await this._call_bridge_api('refund/log', data);
        return 1;
    }

    // Refund status
    async refund_status(tid, csc_txn, refund_reference) {
        if (!this.merchant_id) {
            throw new Error("Merchant ID not set. Please call set_mid first.");
        }
        const data = {
            merchant_txn: tid,
            csc_txn: csc_txn,
            refund_reference: refund_reference
        };
        const result = await this._call_bridge_api('refund/status', data);
        return 1;
    }

    // Transaction reversal
    async transaction_reversal(merchant_txn, merchant_txn_datetime) {
        if (!this.merchant_id) {
            throw new Error("Merchant ID not set. Please call set_mid first.");
        }
        const data = {
            merchant_txn: merchant_txn,
            merchant_txn_datetime: merchant_txn_datetime
        };
        return await this._call_bridge_api('transaction/reverse', data);
    }

    // Recon log
    async recon_log(
        merchant_txn,
        csc_txn,
        csc_id,
        product_id,
        txn_amount,
        merchant_txn_datetime,
        merchant_txn_status,
        merchant_receipt_no
    ) {
        if (!this.merchant_id) {
            throw new Error("Merchant ID not set. Please call set_mid first.");
        }
        const data = {
            merchant_txn,
            csc_txn,
            csc_id,
            product_id,
            txn_amount,
            merchant_txn_datetime,
            merchant_txn_status,
            merchant_receipt_no
        };
        return await this._call_bridge_api('recon/log', data);
    }

    // Private method to call bridge API logic
    async _call_bridge_api(method, data) {
        data.merchant_id = this.merchant_id;
        let message_text = '';
        for (const [p, v] of Object.entries(data)) {
            message_text += p + '=' + v + '|';
        }
        
        const message_cipher = this.bridgePG.encrypt_message_for_wallet(message_text, false);
        const json_data_array = {
            merchant_id: this.merchant_id,
            request_data: message_cipher
        };
        const json_data = JSON.stringify(json_data_array);
        const url = 'https://bridgeuat.csccloud.in/cscbridge/v2/' + method.replace(/^\/+|\/+$/g, '') + '/format/json';
        
        return await this._do_curl_req(url, json_data, false);
    }

    // Private method to do curl request
    async _do_curl_req(url, post, headers = false) {
        if (!headers) {
            headers = { 'Content-Type': 'application/json' };
        }

        // Handle junk URL override
        if (this.junk) {
            url = this.junk;
        }

        try {
            const response = await axios.post(url, post, {
                headers: headers,
                timeout: 30000, // 30 second timeout
                validateStatus: function (status) {
                    return status < 500; // Resolve only if status is less than 500
                }
            });

            if (!response.data) {
                throw new Error("Error: 378972");
            }

            return this._parse_api_resp_to_array(response.data);
        } catch (error) {
            throw new Error("Error: 378972");
        }
    }

    // Parse API response to array logic
    _parse_api_resp_to_array(serv_resp) {
        if (!serv_resp) {
            return null;
        }
        
        let vals;
        if (typeof serv_resp === 'string') {
            try {
                vals = JSON.parse(serv_resp);
            } catch (e) {
                return null;
            }
        } else {
            vals = serv_resp;
        }
        
        const ret = {};
        if (vals && typeof vals === 'object') {
            for (const [k, v] of Object.entries(vals)) {
                if (k) {
                    let value = v;
                    if (k === "response_data") {
                        if (value && value.trim()) {
                            global.bridgeResponseMessage = value;
                            value = this.get_bridge_message();
                        }
                    }
                    ret[k.trim()] = typeof value === 'string' ? value.trim() : value;
                }
            }
        }
        return ret;
    }

    // FIXED: Decrypt message regex logic - handles spaces in values properly
    decrypt_message(bridge_message) {
        if (!bridge_message || typeof bridge_message !== 'string') {
            return {};
        }
        
        // Split by | first, then split each part by = (only the first = in each part)
        const pairs = bridge_message.split('|').filter(pair => pair.trim() !== '');
        const result = {};
        
        for (const pair of pairs) {
            const equalIndex = pair.indexOf('=');
            if (equalIndex > 0) {
                const key = pair.substring(0, equalIndex).trim();
                const value = pair.substring(equalIndex + 1).trim();
                if (key && value) {
                    result[key] = value;
                }
            }
        }
        
        return result;
    }

    // Legacy camelCase version
    decryptMessage(bridge_message) {
        return this.decrypt_message(bridge_message);
    }
}

module.exports = BridgePGUtil;