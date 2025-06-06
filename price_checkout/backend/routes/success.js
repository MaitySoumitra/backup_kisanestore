const express = require('express');
const router = express.Router();
const BridgePGUtil = require('../libs/BridgePGUtil');

router.post('/', async (req, res) => {
    try {
        const bridgePGUtil = new BridgePGUtil();
        const bridgeResponseMessage = req.body.bridgeResponseMessage;
        
        if (!bridgeResponseMessage) {
            return res.status(400).send('Invalid response from payment gateway');
        }

        let debugInfo = {
            rawResponse: req.body,
            encryptedMessage: bridgeResponseMessage,
            decryptedMessage: 'Failed to decrypt',
            parsedData: {},
            statusCheck: 'Not performed'
        };

        try {
            // Decrypt and parse the response
            const decryptedMessage = bridgePGUtil.get_bridge_message({ bridgeResponseMessage });
            debugInfo.decryptedMessage = decryptedMessage;
            
            const responseData = bridgePGUtil.decrypt_message(decryptedMessage);
            debugInfo.parsedData = responseData;

            // Check transaction status
            const txnStatus = responseData.txn_status;
            const errorCode = responseData.error_code;
            
            debugInfo.statusCheck = `Checking if txn_status '${txnStatus}' === '100' (success code)`;
            
            if (txnStatus === '100') {
                // Transaction successful - create complete debug info
                debugInfo.statusCheck = `Transaction status '${txnStatus}' === '100' (SUCCESS)`;
                debugInfo.extractedAmount = responseData.txn_amount || 'N/A';
                debugInfo.verificationResult = 'PASSED - Transaction is successful';
                
                const successData = {
                    transactionId: responseData.merchant_txn || responseData.txn_id || 'N/A',
                    amount: responseData.txn_amount || responseData.amount || 'N/A',
                    cscTxn: responseData.csc_txn || 'N/A',
                    status: 'Success',
                    debugInfo: debugInfo
                };
                
                res.render('success', successData);
            } else {
                // Transaction failed - add failure reason to debug info
                debugInfo.statusCheck = `Transaction status '${txnStatus}' !== '100' (FAILED)`;
                debugInfo.extractedAmount = responseData.txn_amount || 'N/A';
                debugInfo.verificationResult = `FAILED - Expected status '100', got '${txnStatus}'`;
                debugInfo.redirectReason = `Transaction status '${txnStatus}' is not success code '100'`;
                
                const failedData = {
                    errorMessage: responseData.error_message || 
                                 responseData.txn_status_message || 
                                 `Transaction failed with status: ${txnStatus}`,
                    transactionId: responseData.merchant_txn || 'N/A',
                    amount: responseData.txn_amount || responseData.amount || 'N/A',
                    debugInfo: debugInfo
                };
                
                res.render('failed', failedData);
            }
        } catch (decryptError) {
            debugInfo.error = decryptError.message;
            debugInfo.verificationResult = 'ERROR during processing';
            
            // Render failed page with error info
            res.render('failed', {
                errorMessage: 'Error processing payment response',
                transactionId: 'N/A',
                amount: 'N/A',
                debugInfo: debugInfo
            });
        }
    } catch (error) {
        res.render('failed', {
            errorMessage: 'An error occurred while processing your payment',
            transactionId: 'N/A',
            amount: 'N/A',
            debugInfo: {
                rawResponse: req.body || {},
                encryptedMessage: 'Error occurred',
                decryptedMessage: 'Error occurred',
                parsedData: {},
                error: error.message,
                verificationResult: 'ERROR - Outer exception occurred'
            }
        });
    }
});

// Also add a GET route for /success to handle any GET redirects
router.get('/', (req, res) => {
    res.render('failed', {
        errorMessage: 'Invalid access to success page. Payment gateway should use POST method.',
        transactionId: 'N/A',
        amount: 'N/A',
        debugInfo: {
            rawResponse: {},
            encryptedMessage: 'No POST data received',
            decryptedMessage: 'No POST data received',
            parsedData: {},
            accessMethod: 'GET (incorrect)',
            verificationResult: 'FAILED - Invalid access method',
            note: 'Payment gateway should send POST request with bridgeResponseMessage'
        }
    });
});

module.exports = router;