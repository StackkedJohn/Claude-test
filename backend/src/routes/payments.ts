import { Router } from 'express';
import Stripe from 'stripe';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import bnplService from '../services/bnplService';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', payment_method_types = ['card'], metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe expects amount in cents
      currency,
      payment_method_types,
      metadata: {
        ...metadata,
        platform: 'ICEPACA'
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      capture_method: 'automatic',
      setup_future_usage: 'off_session' // For future payments if customer saves payment method
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirm payment and create order
router.post('/confirm-payment', async (req, res) => {
  try {
    const { 
      payment_intent_id, 
      customer_info, 
      shipping_address, 
      cart_items,
      session_id 
    } = req.body;

    if (!payment_intent_id || !customer_info || !cart_items) {
      return res.status(400).json({ error: 'Missing required payment information' });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not successful',
        status: paymentIntent.status 
      });
    }

    // Verify cart exists and get latest inventory
    let cart;
    if (session_id) {
      cart = await Cart.findOne({ sessionId: session_id }).populate('items.productId');
    }

    // Create order record
    const orderData = {
      orderNumber: `ICEPACA-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      customer: {
        email: customer_info.email,
        firstName: customer_info.firstName,
        lastName: customer_info.lastName
      },
      shipping: shipping_address,
      items: cart_items.map((item: any) => ({
        productId: item.productId || item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      })),
      payment: {
        method: 'stripe',
        stripePaymentIntentId: payment_intent_id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: 'completed',
        completedAt: new Date()
      },
      totals: {
        subtotal: paymentIntent.metadata?.subtotal ? parseFloat(paymentIntent.metadata.subtotal) : paymentIntent.amount / 100,
        tax: paymentIntent.metadata?.tax ? parseFloat(paymentIntent.metadata.tax) : 0,
        shipping: paymentIntent.metadata?.shipping ? parseFloat(paymentIntent.metadata.shipping) : 0,
        discount: paymentIntent.metadata?.discount ? parseFloat(paymentIntent.metadata.discount) : 0,
        total: paymentIntent.amount / 100
      },
      status: 'confirmed',
      orderDate: new Date()
    };

    const order = new Order(orderData);
    await order.save();

    // Update product inventory
    for (const item of cart_items) {
      try {
        const product = await Product.findById(item.productId || item.product_id);
        if (product) {
          await product.completePurchase(item.quantity);
        }
      } catch (error) {
        console.error(`Error updating inventory for product ${item.productId}:`, error);
      }
    }

    // Clear the cart
    if (cart) {
      await Cart.findOneAndDelete({ sessionId: session_id });
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.totals.total,
        customerEmail: order.customer.email
      },
      payment: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100
      }
    });

  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Handle Apple Pay/Google Pay payment methods
router.post('/create-payment-method', async (req, res) => {
  try {
    const { type, customer_info } = req.body;

    if (!type || !['apple_pay', 'google_pay'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment method type' });
    }

    // Create customer in Stripe if needed
    let customer;
    if (customer_info?.email) {
      const existingCustomers = await stripe.customers.list({
        email: customer_info.email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customer_info.email,
          name: customer_info.firstName ? `${customer_info.firstName} ${customer_info.lastName}` : undefined,
          metadata: {
            platform: 'ICEPACA'
          }
        });
      }
    }

    res.json({
      customer_id: customer?.id,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
    });

  } catch (error: any) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ 
      error: 'Failed to create payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get payment intent status
router.get('/payment-intent/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });

  } catch (error: any) {
    console.error('Error retrieving payment intent:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment intent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get available BNPL options
router.post('/bnpl/options', async (req, res) => {
  try {
    const { amount, currency = 'usd', country = 'US' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = bnplService.getAvailableBNPLOptions(amount, country);

    res.json({
      options,
      currency,
      country
    });

  } catch (error: any) {
    console.error('Error getting BNPL options:', error);
    res.status(500).json({ 
      error: 'Failed to get BNPL options',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create BNPL session
router.post('/bnpl/create-session', async (req, res) => {
  try {
    const { provider, sessionData } = req.body;

    if (!provider || !['klarna', 'affirm'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid BNPL provider' });
    }

    if (!sessionData || !sessionData.amount || !sessionData.customerInfo || !sessionData.shippingAddress) {
      return res.status(400).json({ error: 'Missing required session data' });
    }

    let session;
    if (provider === 'klarna') {
      session = await bnplService.createKlarnaSession(sessionData);
    } else if (provider === 'affirm') {
      session = await bnplService.createAffirmSession(sessionData);
    }

    res.json({
      session,
      installments: bnplService.calculateInstallments(sessionData.amount, provider)
    });

  } catch (error: any) {
    console.error('Error creating BNPL session:', error);
    res.status(500).json({ 
      error: 'Failed to create BNPL session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify BNPL payment
router.post('/bnpl/verify', async (req, res) => {
  try {
    const { sessionId, provider } = req.body;

    if (!sessionId || !provider || !['klarna', 'affirm'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid session ID or provider' });
    }

    const verificationResult = await bnplService.verifyBNPLPayment(sessionId, provider);

    res.json({
      verification: verificationResult,
      provider,
      sessionId
    });

  } catch (error: any) {
    console.error('Error verifying BNPL payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify BNPL payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get installment breakdown for preview
router.post('/bnpl/installments', async (req, res) => {
  try {
    const { amount, provider } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!provider || !['klarna', 'affirm'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid BNPL provider' });
    }

    const installments = bnplService.calculateInstallments(amount, provider);

    res.json({
      installments,
      provider,
      amount,
      totalInstallments: installments.length
    });

  } catch (error: any) {
    console.error('Error calculating installments:', error);
    res.status(500).json({ 
      error: 'Failed to calculate installments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Missing Stripe webhook secret');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Update order status if needed
        const order = await Order.findOne({ 'payment.stripePaymentIntentId': paymentIntent.id });
        if (order && order.status === 'pending') {
          order.status = 'confirmed';
          order.payment.status = 'completed';
          order.payment.completedAt = new Date();
          await order.save();
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        
        // Update order status and release inventory
        const failedOrder = await Order.findOne({ 'payment.stripePaymentIntentId': failedPayment.id });
        if (failedOrder) {
          failedOrder.status = 'failed';
          failedOrder.payment.status = 'failed';
          await failedOrder.save();

          // Release reserved inventory
          for (const item of failedOrder.items) {
            try {
              const product = await Product.findById(item.productId);
              if (product) {
                await product.releaseStock(item.quantity);
              }
            } catch (error) {
              console.error(`Error releasing inventory for product ${item.productId}:`, error);
            }
          }
        }
        break;

      case 'charge.dispute.created':
        const dispute = event.data.object as Stripe.Dispute;
        console.log('Dispute created:', dispute.id);
        // Handle dispute logic here
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;