const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());

// Configure Nodemailer Transporter for Store Owner Notifications
// (Ensure you set EMAIL_USER and EMAIL_PASS in your .env file or environment variables)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'koolprincee@gmail.com',
        pass: process.env.EMAIL_PASS || 'your_email_app_password'
    }
});

// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Prince Athletics Footwear API Server Running' });
});

// Stripe Payment Intent & Owner Email Notification endpoint
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone, customerAddress, deliveryOption, items } = req.body;

        // 1. Create Stripe Payment Intent (Stripe automatically sends the receipt to customerEmail if configured)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert amount to cents
            currency: 'usd',
            description: `Prince Athletics Order - ${customerName}`,
            receipt_email: customerEmail,
            metadata: {
                customerName,
                customerEmail,
                customerPhone: customerPhone || 'N/A',
                deliveryOption: deliveryOption || 'Standard'
            }
        });

        // 2. Build Detailed Order Summary for Store Owner
        let itemsListText = '';
        let itemsListHtml = '';
        
        if (items && Array.isArray(items)) {
            items.forEach((item, index) => {
                const colorStr = item.color ? `Color: ${item.color}` : '';
                const sizeStr = item.size ? `Size: ${item.size}` : '';
                const optionsStr = [colorStr, sizeStr].filter(Boolean).join(' | ');
                
                itemsListText += `${index + 1}. ${item.name} ${optionsStr ? `(${optionsStr})` : ''} - Qty: ${item.qty} - $${(item.price * item.qty).toFixed(2)}\n`;
                
                itemsListHtml += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${optionsStr || 'Standard'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.qty}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.price * item.qty).toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        const ownerEmailSubject = `🔥 New Paid Order: ${customerName} ($${Number(amount).toFixed(2)} USD)`;
        
        const ownerEmailHtml = `
            <div style="font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 20px; border-radius: 10px;">
                <h2 style="color: #FFD700; border-bottom: 2px solid #00FF66; padding-bottom: 10px;">New Store Order Received!</h2>
                
                <h3 style="color: #00FF66; margin-top: 15px;">Customer Details:</h3>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>Phone:</strong> ${customerPhone || 'Not provided'}</p>
                <p><strong>Delivery Option:</strong> ${deliveryOption || 'Standard Delivery'}</p>
                <p><strong>Shipping Address:</strong><br>${customerAddress ? customerAddress.replace(/\n/g, '<br>') : 'Not provided'}</p>

                <h3 style="color: #00FF66; margin-top: 20px;">Purchased Items:</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: #1e1e1e; color: #ffffff; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #333; color: #FFD700; text-align: left;">
                            <th style="padding: 8px;">Item</th>
                            <th style="padding: 8px;">Options</th>
                            <th style="padding: 8px; text-align: center;">Qty</th>
                            <th style="padding: 8px; text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsListHtml}
                    </tbody>
                </table>

                <h2 style="color: #FFD700; text-align: right; margin-top: 15px;">Total Amount: $${Number(amount).toFixed(2)} USD</h2>
                <p style="font-size: 11px; color: #888; text-align: center; margin-top: 30px;">Prince Athletics Footwear E-Commerce Notification System</p>
            </div>
        `;

        // 3. Send Email Notification to Store Owner
        const mailOptions = {
            from: process.env.EMAIL_USER || 'koolprincee@gmail.com',
            to: 'koolprincee@gmail.com',
            subject: ownerEmailSubject,
            text: `New order from ${customerName}.\n\nTotal: $${Number(amount).toFixed(2)} USD\nDelivery: ${deliveryOption}\nAddress: ${customerAddress}\n\nItems:\n${itemsListText}`,
            html: ownerEmailHtml
        };

        transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
                console.error('Error sending owner notification email:', mailErr);
            } else {
                console.log('Store owner notification email sent successfully:', info.response);
            }
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Payment intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`⚡ Server listening on http://localhost:${PORT}`);
});