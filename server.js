const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

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

// Create WiPay Checkout Transaction
app.post('/api/create-wipay-transaction', async (req, res) => {
    const accountNumber = (process.env.WIPAY_ACCOUNT_NUMBER || '').trim();
    if (!accountNumber) {
        console.error('Missing WIPAY_ACCOUNT_NUMBER environment variable.');
        return res.status(500).json({ error: 'Server configuration error: WIPAY_ACCOUNT_NUMBER is not set.' });
    }

    const {
        order_id,
        total,
        amount,
        currency,
        customer_name,
        customer_email,
        customer_phone,
        customer,
        returnUrl
    } = req.body || {};

    const finalOrderId = String(order_id || `PA-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || `PA${Date.now()}`;
    const finalTotal = Number(total ?? amount);
    const customerName = customer_name || customer?.name || '';
    const customerEmail = customer_email || customer?.email || '';
    const customerPhone = customer_phone || customer?.phone || '';
    const responseUrl = returnUrl || 'https://princeathletics.com/index.html';

    if (!finalTotal || isNaN(finalTotal) || finalTotal <= 0) {
        return res.status(400).json({ error: 'Invalid order total amount.' });
    }

    const formData = new URLSearchParams();
    formData.append('account_number', accountNumber);
    formData.append('avs', '0');
    formData.append('country_code', 'JM');
    formData.append('currency', currency || 'JMD');
    formData.append('data', JSON.stringify({ order_id: finalOrderId }));
    formData.append('environment', process.env.WIPAY_ENVIRONMENT || 'live');
    formData.append('fee_structure', 'customer_pay');
    formData.append('method', 'credit_card_co');
    formData.append('order_id', finalOrderId);
    formData.append('origin', 'PrinceAthletics');
    formData.append('response_url', responseUrl);
    formData.append('total', finalTotal.toFixed(2));

    if (customerName) formData.append('name', customerName);
    if (customerEmail) formData.append('email', customerEmail);
    if (customerPhone) formData.append('phone', customerPhone);

    try {
        const response = await fetch('https://jm.wipayfinancial.com/plugins/payments/request', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        console.log('[WiPay HTTP Status]:', response.status, response.statusText);
        const rawText = await response.text();
        console.log('[WiPay Raw Response]:', rawText);

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            return res.status(502).json({
                success: false,
                error: 'WiPay returned a non-JSON response',
                status: response.status,
                raw: rawText.slice(0, 500)
            });
        }

        if (data && data.url) {
            res.status(200).json({
                success: true,
                orderId: finalOrderId,
                paymentUrl: data.url,
                checkoutUrl: data.url,
                transaction_id: data.transaction_id || null
            });
        } else {
            console.error('WiPay Error:', data);
            res.status(400).json({ error: data?.message || 'Failed to initialize WiPay checkout' });
        }
    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ error: 'Internal server error connecting to WiPay' });
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