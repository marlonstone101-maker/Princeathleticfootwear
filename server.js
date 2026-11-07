const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());

// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Prince Athletics Footwear API Server Running' });
});

// Stripe Payment Intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, customerName, customerEmail } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert amount to cents
            currency: 'usd',
            description: `Prince Athletics Order - ${customerName}`,
            receipt_email: customerEmail,
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`⚡ Server listening on http://localhost:${PORT}`);
});