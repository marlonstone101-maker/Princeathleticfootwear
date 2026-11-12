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
        const { items, customer, amount } = req.body;

        if (!items || !customer || !amount) {
            return res.status(400).json({ error: 'Missing required transaction fields (items, customer, amount).' });
        }

        
        const wipayAccountNumber = process.env.WIPAY_ACCOUNT_NUMBER || '123456789';
        const wipayApiKey = process.env.WIPAY_API_KEY || 'your_wipay_api_key_here';
        const environment = process.env.WIPAY_ENV || 'sandbox'; // change to 'live' for production

        const orderId = 'PA-' + Date.now();
        const successUrl = 'https://wa.me/8764023170';
        const cancelUrl = 'https://princeathleticfootwear-1.onrender.com';

        // Construct WiPay payload
        const wipayPayload = {
            account_number: wipayAccountNumber,
            api_key: wipayApiKey,
            environment: environment,
            total: Number(amount).toFixed(2),
            order_id: orderId,
            fee_structure: 'customer',
            currency: 'USD',
            country_code: 'JM',
            return_url: successUrl,
            cancel_url: cancelUrl,
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            response_url: 'https://princeathleticfootwear-1.onrender.com/api/wipay-response'
        };

        // If you are using WiPay's Hosted Checkout API or direct redirect URL generation:
        // For demonstration, we return a successful transaction response containing the payment gateway URL or client approval token.
        // In live integration, you would post this payload to WiPay's endpoint or redirect the client.
        
        console.log(`[WiPay] Processing transaction ${orderId} for ${customer.name} totaling $${amount} USD`);

        res.status(200).json({
            success: true,
            orderId: orderId,
            paymentUrl: `https://wipaycaribbean.com/checkout/index.php?order_id=${orderId}&amount=${Number(amount).toFixed(2)}`,
            message: 'WiPay transaction initialized successfully.'
        });

    } catch (error) {
        console.error('WiPay Server Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error while processing WiPay transaction.' });
    }
});

// WiPay IPN / Response Webhook Listener
app.post('/api/wipay-response', (req, res) => {
    try {
        const paymentData = req.body;
        console.log('[WiPay IPN Webhook Received]:', paymentData);

        // Here you can verify transaction status and update Firebase Firestore order fulfillment status if needed.

        res.status(200).send('IPN Received Successfully');
    } catch (err) {
        console.error('Error handling WiPay IPN:', err);
        res.status(500).send('Error handling IPN');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Prince Athletics backend server running on port ${PORT}`);
});