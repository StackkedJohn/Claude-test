// BNPL (Buy Now Pay Later) Service for Klarna and Affirm integration
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export interface BNPLSessionData {
  amount: number;
  currency: string;
  customerInfo: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  orderItems: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  metadata?: { [key: string]: string };
}

export interface BNPLSession {
  sessionId: string;
  redirectUrl: string;
  provider: 'klarna' | 'affirm';
  status: 'pending' | 'approved' | 'declined' | 'expired';
  expiresAt: Date;
}

class BNPLService {
  
  // Create Klarna session using Stripe
  async createKlarnaSession(sessionData: BNPLSessionData): Promise<BNPLSession> {
    try {
      // Klarna is available through Stripe's payment methods
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(sessionData.amount * 100), // Convert to cents
        currency: sessionData.currency,
        payment_method_types: ['klarna'],
        metadata: {
          ...sessionData.metadata,
          provider: 'klarna',
          platform: 'ICEPACA'
        },
        shipping: {
          name: `${sessionData.customerInfo.firstName} ${sessionData.customerInfo.lastName}`,
          address: {
            line1: sessionData.shippingAddress.address1,
            line2: sessionData.shippingAddress.address2 || '',
            city: sessionData.shippingAddress.city,
            state: sessionData.shippingAddress.state,
            postal_code: sessionData.shippingAddress.zipCode,
            country: sessionData.shippingAddress.country
          }
        },
        capture_method: 'automatic'
      });

      return {
        sessionId: paymentIntent.id,
        redirectUrl: '', // Klarna redirects are handled by Stripe Elements
        provider: 'klarna',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

    } catch (error: any) {
      console.error('Error creating Klarna session:', error);
      throw new Error(`Failed to create Klarna session: ${error.message}`);
    }
  }

  // Create Affirm session (simulated - would use actual Affirm API in production)
  async createAffirmSession(sessionData: BNPLSessionData): Promise<BNPLSession> {
    try {
      // In production, you would integrate with Affirm's actual API
      // For now, we'll simulate the response structure
      const sessionId = `affirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Affirm configuration object (would be sent to Affirm API)
      const affirmConfig = {
        merchant: {
          user_confirmation_url: `${process.env.FRONTEND_URL}/checkout/affirm/confirm`,
          user_cancel_url: `${process.env.FRONTEND_URL}/checkout/affirm/cancel`,
          user_confirmation_url_action: 'POST'
        },
        order_id: sessionId,
        shipping_amount: 0, // Will be calculated
        tax_amount: Math.round(sessionData.amount * 0.08 * 100), // Estimated tax
        total: Math.round(sessionData.amount * 100),
        currency: sessionData.currency.toUpperCase(),
        items: sessionData.orderItems.map(item => ({
          display_name: item.name,
          sku: item.productId,
          unit_price: Math.round(item.price * 100),
          qty: item.quantity,
          item_image_url: `${process.env.FRONTEND_URL}/images/placeholder.jpg`,
          item_url: `${process.env.FRONTEND_URL}/shop`,
          categories: [['Ice Packs', 'Cooling', 'Reusable']]
        })),
        shipping: {
          name: {
            first: sessionData.customerInfo.firstName,
            last: sessionData.customerInfo.lastName
          },
          address: {
            line1: sessionData.shippingAddress.address1,
            line2: sessionData.shippingAddress.address2 || '',
            city: sessionData.shippingAddress.city,
            state: sessionData.shippingAddress.state,
            zipcode: sessionData.shippingAddress.zipCode,
            country: sessionData.shippingAddress.country
          },
          phone_number: sessionData.customerInfo.phone || ''
        },
        billing: {
          name: {
            first: sessionData.customerInfo.firstName,
            last: sessionData.customerInfo.lastName
          },
          address: {
            line1: sessionData.shippingAddress.address1,
            line2: sessionData.shippingAddress.address2 || '',
            city: sessionData.shippingAddress.city,
            state: sessionData.shippingAddress.state,
            zipcode: sessionData.shippingAddress.zipCode,
            country: sessionData.shippingAddress.country
          },
          phone_number: sessionData.customerInfo.phone || '',
          email: sessionData.customerInfo.email
        },
        metadata: sessionData.metadata
      };

      // In production, make actual API call to Affirm:
      // const affirmResponse = await fetch('https://sandbox.affirm.com/api/v2/checkout', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${Buffer.from(`${AFFIRM_PUBLIC_KEY}:${AFFIRM_PRIVATE_KEY}`).toString('base64')}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(affirmConfig)
      // });

      // For demo purposes, return mock response
      return {
        sessionId,
        redirectUrl: `https://sandbox.affirm.com/checkout/${sessionId}`, // Mock URL
        provider: 'affirm',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

    } catch (error: any) {
      console.error('Error creating Affirm session:', error);
      throw new Error(`Failed to create Affirm session: ${error.message}`);
    }
  }

  // Verify BNPL payment completion
  async verifyBNPLPayment(sessionId: string, provider: 'klarna' | 'affirm'): Promise<{
    status: 'approved' | 'declined' | 'pending';
    transactionId?: string;
    amount?: number;
    currency?: string;
  }> {
    try {
      if (provider === 'klarna') {
        // For Klarna through Stripe, verify the payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);
        
        return {
          status: paymentIntent.status === 'succeeded' ? 'approved' : 
                 paymentIntent.status === 'payment_failed' ? 'declined' : 'pending',
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        };
      } else if (provider === 'affirm') {
        // In production, verify with Affirm API:
        // const affirmResponse = await fetch(`https://sandbox.affirm.com/api/v2/charges/${sessionId}`, {
        //   method: 'GET',
        //   headers: {
        //     'Authorization': `Basic ${Buffer.from(`${AFFIRM_PUBLIC_KEY}:${AFFIRM_PRIVATE_KEY}`).toString('base64')}`
        //   }
        // });

        // For demo, simulate verification
        return {
          status: 'approved', // Mock approved status
          transactionId: sessionId,
          amount: 0, // Would get from Affirm API
          currency: 'usd'
        };
      }

      throw new Error(`Unsupported BNPL provider: ${provider}`);

    } catch (error: any) {
      console.error(`Error verifying ${provider} payment:`, error);
      throw new Error(`Failed to verify ${provider} payment: ${error.message}`);
    }
  }

  // Get available BNPL options based on order amount and customer location
  getAvailableBNPLOptions(amount: number, country: string = 'US'): Array<{
    provider: 'klarna' | 'affirm';
    name: string;
    description: string;
    minAmount: number;
    maxAmount: number;
    available: boolean;
    estimatedMonthlyPayment?: number;
  }> {
    const options = [
      {
        provider: 'klarna' as const,
        name: 'Klarna',
        description: 'Pay in 4 interest-free payments',
        minAmount: 1,
        maxAmount: 1000,
        available: country === 'US' && amount >= 1 && amount <= 1000,
        estimatedMonthlyPayment: Math.round((amount / 4) * 100) / 100
      },
      {
        provider: 'affirm' as const,
        name: 'Affirm',
        description: 'Monthly payments as low as 0% APR',
        minAmount: 50,
        maxAmount: 17500,
        available: country === 'US' && amount >= 50 && amount <= 17500,
        estimatedMonthlyPayment: Math.round((amount * 1.1 / 12) * 100) / 100 // Estimated with ~10% APR
      }
    ];

    return options.filter(option => option.available);
  }

  // Calculate installment breakdown
  calculateInstallments(amount: number, provider: 'klarna' | 'affirm'): Array<{
    installmentNumber: number;
    amount: number;
    dueDate: string;
    description: string;
  }> {
    const installments = [];

    if (provider === 'klarna') {
      // Klarna: 4 equal payments every 2 weeks
      const installmentAmount = Math.round((amount / 4) * 100) / 100;
      
      for (let i = 0; i < 4; i++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (i * 14)); // Every 2 weeks
        
        installments.push({
          installmentNumber: i + 1,
          amount: i === 3 ? amount - (installmentAmount * 3) : installmentAmount, // Ensure total is exact
          dueDate: dueDate.toLocaleDateString(),
          description: i === 0 ? 'Today' : `In ${i * 2} weeks`
        });
      }
    } else if (provider === 'affirm') {
      // Affirm: Typically 3, 6, or 12 months
      const months = amount < 100 ? 3 : amount < 500 ? 6 : 12;
      const monthlyPayment = Math.round((amount / months) * 100) / 100;
      
      for (let i = 0; i < months; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        
        installments.push({
          installmentNumber: i + 1,
          amount: i === months - 1 ? amount - (monthlyPayment * (months - 1)) : monthlyPayment,
          dueDate: dueDate.toLocaleDateString(),
          description: `Month ${i + 1}`
        });
      }
    }

    return installments;
  }
}

export default new BNPLService();