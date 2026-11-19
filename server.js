const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Root health check route
app.get('/', (req, res) => {
    res.status(200).send('Prince Athletics Footwear Backend Server (WiPay Integrated) is running successfully!');
});

app.post('/api/create-wipay-transaction', async (req, res) => {
    try {
        const { items, customer, amount, returnUrl } = req.body;

        if (!items || !customer || !amount) {
            return res.status(400).json({ error: 'Missing required transaction fields (items, customer, amount).' });
        }

        // Uses Render Environment Variables in production, or WiPay's official sandbox credentials for testing
        const wipayAccountNumber = process.env.WIPAY_ACCOUNT_NUMBER || '1234567890';
        const wipayApiKey = process.env.WIPAY_API_KEY || '123';
        const environment = process.env.WIPAY_ENV || 'sandbox'; // set WIPAY_ENV=live in Render for production

        const orderId = 'PA-' + Date.now();

        // Redirect back to the exact frontend page the customer checked out from
        const frontendReturnUrl = returnUrl || 'https://princeathleticsfootwear.com/index.html';

        // Construct valid WiPay Jamaica payload
        const wipayPayload = {
            account_number: wipayAccountNumber,
            api_key: wipayApiKey,
            country_code: 'JM',
            currency: 'USD',
            environment: environment,
            fee_structure: 'customer_pay',
            method: 'credit_card',
            order_id: orderId,
            origin: 'Prince Athletics Footwear',
            response_url: frontendReturnUrl,
            total: Number(amount).toFixed(2)
        };

        const wipayResponse = await axios.post(
            'https://jm.wipayfinancial.com/plugins/payments/request',
            wipayPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        const wipayData = wipayResponse.data;
        console.log('[WiPay API Response]:', wipayData);

        if (!wipayData || !wipayData.url) {
            return res.status(400).json({
                success: false,
                error: wipayData?.message || 'WiPay failed to generate payment URL'
            });
        }

        res.status(200).json({
            success: true,
            orderId,
            paymentUrl: wipayData.url,
            transaction_id: wipayData.transaction_id || null,
            message: 'WiPay transaction initialized successfully.'
        });

    } catch (error) {
        const errDetails = error.response?.data || error.message;
        console.error('WiPay Server Error:', errDetails);
        res.status(500).json({
            error: (typeof errDetails === 'object' ? errDetails.message : errDetails) || 'Internal server error while processing WiPay transaction.'
        });
    }
});

// WiPay IPN / Response Webhook Listener (supports both GET and POST)
app.all('/api/wipay-response', (req, res) => {
    try {
        const paymentData = { ...req.query, ...req.body };
        console.log('[WiPay Response Received]:', paymentData);
        res.status(200).send('WiPay Response Received Successfully');
    } catch (err) {
        console.error('Error handling WiPay response:', err);
        res.status(500).send('Error handling WiPay response');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Prince Athletics backend server running on port ${PORT}`);
});