// Abandoned Cart Recovery Service with Dynamic Email Content
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import nodemailer from 'nodemailer';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface AbandonedCart {
  id: string;
  userId?: string;
  email: string;
  items: CartItem[];
  totalValue: number;
  abandonedAt: Date;
  lastEmailSent?: Date;
  emailSequence: number; // 0 = no emails sent, 1 = first email, 2 = second email, etc.
  recovered: boolean;
  recoveredAt?: Date;
  recoveryOrderId?: string;
  sessionId: string;
  source: 'web' | 'mobile_app' | 'mobile_web';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  userAgent?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  delayHours: number;
  discountOffer?: {
    type: 'percentage' | 'fixed';
    value: number;
    code: string;
    expiryHours: number;
  };
}

interface RecoveryEmailData {
  customerName: string;
  cartItems: CartItem[];
  totalValue: number;
  recoveryUrl: string;
  discountCode?: string;
  discountAmount?: string;
  expiryTime?: Date;
  personalizedRecommendations: Array<{
    name: string;
    price: number;
    imageUrl: string;
    url: string;
  }>;
  testimonials: Array<{
    text: string;
    author: string;
    useCase: string;
    rating: number;
  }>;
  urgencyMessage: string;
  socialProof: string;
}

// MongoDB Schema for Abandoned Carts
const AbandonedCartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, required: true, index: true },
  items: [{
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    imageUrl: { type: String }
  }],
  totalValue: { type: Number, required: true },
  abandonedAt: { type: Date, default: Date.now, index: true },
  lastEmailSent: { type: Date },
  emailSequence: { type: Number, default: 0 },
  recovered: { type: Boolean, default: false, index: true },
  recoveredAt: { type: Date },
  recoveryOrderId: { type: String },
  sessionId: { type: String, required: true },
  source: { type: String, enum: ['web', 'mobile_app', 'mobile_web'], default: 'web' },
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
  userAgent: { type: String },
  utm: {
    source: String,
    medium: String,
    campaign: String
  }
}, {
  timestamps: true
});

const AbandonedCartModel = mongoose.model('AbandonedCart', AbandonedCartSchema);

class AbandonedCartService {
  private emailTransporter: nodemailer.Transporter;
  private emailTemplates: Map<number, EmailTemplate> = new Map();
  private isProcessing: boolean = false;

  constructor() {
    this.initializeEmailTransporter();
    this.initializeEmailTemplates();
    this.startProcessingQueue();
  }

  private initializeEmailTransporter(): void {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  private initializeEmailTemplates(): void {
    const templates: EmailTemplate[] = [
      {
        id: 'first_reminder',
        name: 'First Reminder - 1 Hour',
        subject: '❄️ You left something cool behind at ICEPACA',
        delayHours: 1,
        htmlContent: this.getFirstReminderTemplate(),
        textContent: 'You have items waiting in your cart at ICEPACA...',
      },
      {
        id: 'second_reminder',
        name: 'Second Reminder - 24 Hours with Discount',
        subject: '🎁 Still thinking? Here\'s 10% off your ICEPACA order',
        delayHours: 24,
        discountOffer: {
          type: 'percentage',
          value: 10,
          code: 'COMEBACK10',
          expiryHours: 48
        },
        htmlContent: this.getSecondReminderTemplate(),
        textContent: 'Complete your order and save 10% with code COMEBACK10...',
      },
      {
        id: 'final_reminder',
        name: 'Final Reminder - 7 Days',
        subject: '🔥 Last chance - Your ICEPACA cart expires soon!',
        delayHours: 168, // 7 days
        discountOffer: {
          type: 'percentage',
          value: 15,
          code: 'LASTCHANCE15',
          expiryHours: 24
        },
        htmlContent: this.getFinalReminderTemplate(),
        textContent: 'This is your final reminder - cart expires in 24 hours...',
      }
    ];

    templates.forEach(template => {
      this.emailTemplates.set(template.delayHours, template);
    });
  }

  // Track cart abandonment
  public async trackAbandonedCart(cartData: {
    userId?: string;
    email: string;
    items: CartItem[];
    sessionId: string;
    source?: string;
    deviceType?: string;
    userAgent?: string;
    utm?: any;
  }): Promise<void> {
    try {
      const totalValue = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Check if we already have an abandoned cart for this session
      const existingCart = await AbandonedCartModel.findOne({ sessionId: cartData.sessionId });
      
      if (existingCart) {
        // Update existing cart
        existingCart.items = cartData.items;
        existingCart.totalValue = totalValue;
        existingCart.abandonedAt = new Date();
        await existingCart.save();
      } else {
        // Create new abandoned cart record
        const abandonedCart = new AbandonedCartModel({
          userId: cartData.userId,
          email: cartData.email,
          items: cartData.items,
          totalValue,
          sessionId: cartData.sessionId,
          source: cartData.source || 'web',
          deviceType: cartData.deviceType || 'desktop',
          userAgent: cartData.userAgent,
          utm: cartData.utm
        });

        await abandonedCart.save();
        console.log(`Tracked abandoned cart for ${cartData.email}, value: $${totalValue}`);
      }
    } catch (error) {
      console.error('Error tracking abandoned cart:', error);
    }
  }

  // Mark cart as recovered when order is completed
  public async markCartRecovered(sessionId: string, orderId: string): Promise<void> {
    try {
      await AbandonedCartModel.updateOne(
        { sessionId, recovered: false },
        { 
          recovered: true, 
          recoveredAt: new Date(),
          recoveryOrderId: orderId
        }
      );
      console.log(`Marked cart as recovered for session ${sessionId}`);
    } catch (error) {
      console.error('Error marking cart as recovered:', error);
    }
  }

  // Process abandoned cart email queue
  private startProcessingQueue(): void {
    setInterval(() => {
      if (!this.isProcessing) {
        this.processAbandonedCarts();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  private async processAbandonedCarts(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const now = new Date();
      
      // Find carts that need email reminders
      const cartsToProcess = await AbandonedCartModel.find({
        recovered: false,
        emailSequence: { $lt: 3 }, // Max 3 emails
        $or: [
          // First email after 1 hour
          { 
            emailSequence: 0,
            abandonedAt: { $lte: new Date(now.getTime() - 60 * 60 * 1000) }
          },
          // Second email after 24 hours
          { 
            emailSequence: 1,
            lastEmailSent: { $lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
          },
          // Final email after 7 days
          { 
            emailSequence: 2,
            lastEmailSent: { $lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
          }
        ]
      }).limit(50); // Process 50 at a time

      console.log(`Processing ${cartsToProcess.length} abandoned carts`);

      for (const cart of cartsToProcess) {
        await this.sendRecoveryEmail(cart);
      }
    } catch (error) {
      console.error('Error processing abandoned carts:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendRecoveryEmail(cart: any): Promise<void> {
    try {
      const templateDelayHours = cart.emailSequence === 0 ? 1 : 
                                cart.emailSequence === 1 ? 24 : 168;
      const template = this.emailTemplates.get(templateDelayHours);
      
      if (!template) {
        console.error(`No template found for delay ${templateDelayHours} hours`);
        return;
      }

      // Generate recovery URL with tracking
      const recoveryToken = this.generateRecoveryToken(cart._id);
      const recoveryUrl = `${process.env.FRONTEND_URL}/cart/recover?token=${recoveryToken}`;

      // Get user data for personalization
      const user = cart.userId ? await User.findById(cart.userId) : null;
      const customerName = user ? user.firstName : 'Valued Customer';

      // Generate dynamic content
      const emailData: RecoveryEmailData = {
        customerName,
        cartItems: cart.items,
        totalValue: cart.totalValue,
        recoveryUrl,
        discountCode: template.discountOffer?.code,
        discountAmount: template.discountOffer ? 
          `${template.discountOffer.value}${template.discountOffer.type === 'percentage' ? '%' : '$'}` : 
          undefined,
        expiryTime: template.discountOffer ? 
          new Date(Date.now() + template.discountOffer.expiryHours * 60 * 60 * 1000) : 
          undefined,
        personalizedRecommendations: await this.getPersonalizedRecommendations(cart),
        testimonials: await this.getRelevantTestimonials(cart),
        urgencyMessage: this.getUrgencyMessage(cart.emailSequence),
        socialProof: await this.getSocialProofMessage(cart)
      };

      // Render email content
      const htmlContent = this.renderEmailTemplate(template.htmlContent, emailData);
      const textContent = this.renderTextTemplate(template.textContent, emailData);

      // Send email
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || '"ICEPACA" <noreply@icepaca.com>',
        to: cart.email,
        subject: template.subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Campaign': 'abandoned-cart',
          'X-Sequence': cart.emailSequence.toString(),
          'X-Cart-Value': cart.totalValue.toString()
        }
      });

      // Update cart record
      cart.emailSequence += 1;
      cart.lastEmailSent = new Date();
      await cart.save();

      console.log(`Sent ${template.name} email to ${cart.email}`);
    } catch (error) {
      console.error(`Error sending recovery email to ${cart.email}:`, error);
    }
  }

  private generateRecoveryToken(cartId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(`${cartId}-${process.env.JWT_SECRET}-${Date.now()}`)
      .digest('hex');
  }

  private async getPersonalizedRecommendations(cart: any): Promise<RecoveryEmailData['personalizedRecommendations']> {
    // Mock implementation - in production, use your recommendation engine
    return [
      {
        name: 'ICEPACA Adventure Bundle',
        price: 45,
        imageUrl: '/images/bundle.jpg',
        url: `${process.env.FRONTEND_URL}/products/adventure-bundle`
      }
    ];
  }

  private async getRelevantTestimonials(cart: any): Promise<RecoveryEmailData['testimonials']> {
    // Mock testimonials - in production, fetch from your reviews database
    return [
      {
        text: "These ice packs are incredible! Kept everything cold for our entire camping trip.",
        author: "Sarah M.",
        useCase: "camping",
        rating: 5
      }
    ];
  }

  private getUrgencyMessage(sequenceNumber: number): string {
    const messages = [
      "Don't let your cool items slip away!",
      "Hurry! Your cart is waiting for you.",
      "Final notice - your items won't wait much longer!"
    ];
    return messages[sequenceNumber] || messages[0];
  }

  private async getSocialProofMessage(cart: any): Promise<string> {
    // Mock social proof - in production, calculate from real data
    return "Join 10,000+ happy customers who keep their adventures cool with ICEPACA!";
  }

  private renderEmailTemplate(template: string, data: RecoveryEmailData): string {
    let rendered = template;
    
    // Replace placeholders with actual data
    rendered = rendered.replace('{{customerName}}', data.customerName);
    rendered = rendered.replace('{{totalValue}}', `$${data.totalValue.toFixed(2)}`);
    rendered = rendered.replace('{{recoveryUrl}}', data.recoveryUrl);
    rendered = rendered.replace('{{urgencyMessage}}', data.urgencyMessage);
    rendered = rendered.replace('{{socialProof}}', data.socialProof);
    
    if (data.discountCode) {
      rendered = rendered.replace('{{discountCode}}', data.discountCode);
      rendered = rendered.replace('{{discountAmount}}', data.discountAmount || '');
    }
    
    // Render cart items
    const itemsHtml = data.cartItems.map(item => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; display: flex; align-items: center;">
        <img src="${item.imageUrl || '/images/placeholder.jpg'}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 16px;">
        <div>
          <h3 style="margin: 0; font-size: 18px; color: #1f2937;">${item.name}</h3>
          <p style="margin: 4px 0; color: #6b7280;">Quantity: ${item.quantity}</p>
          <p style="margin: 4px 0; font-weight: bold; color: #059669;">$${(item.price * item.quantity).toFixed(2)}</p>
        </div>
      </div>
    `).join('');
    
    rendered = rendered.replace('{{cartItems}}', itemsHtml);
    
    return rendered;
  }

  private renderTextTemplate(template: string, data: RecoveryEmailData): string {
    // Simple text version
    return template
      .replace('{{customerName}}', data.customerName)
      .replace('{{totalValue}}', `$${data.totalValue.toFixed(2)}`)
      .replace('{{recoveryUrl}}', data.recoveryUrl);
  }

  // Email templates
  private getFirstReminderTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You left something cool behind</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <header style="background: linear-gradient(135deg, #0ea5e9, #ec4899); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">❄️ ICEPACA</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Keep Your Adventures Cool</p>
        </header>
        
        <main style="padding: 40px 20px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi {{customerName}},</h2>
            <p style="font-size: 18px; color: #4b5563; margin-bottom: 30px;">
                You left some cool items in your cart! Don't let them slip away.
            </p>
            
            <div style="background-color: #f0f9ff; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                <h3 style="margin-top: 0; color: #0ea5e9;">Your Cart Items:</h3>
                {{cartItems}}
                <div style="border-top: 2px solid #0ea5e9; padding-top: 20px; margin-top: 20px; text-align: right;">
                    <p style="font-size: 20px; font-weight: bold; color: #1f2937; margin: 0;">
                        Total: {{totalValue}}
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{recoveryUrl}}" style="background: linear-gradient(135deg, #0ea5e9, #ec4899); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px;">
                    Complete Your Order 🛒
                </a>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 0; color: #92400e; font-weight: 500;">{{urgencyMessage}}</p>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
                <p>{{socialProof}}</p>
            </div>
        </main>
        
        <footer style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Questions? Reply to this email or visit our <a href="${process.env.FRONTEND_URL}/support" style="color: #0ea5e9;">Help Center</a>
            </p>
        </footer>
    </div>
</body>
</html>
`;
  }

  private getSecondReminderTemplate(): string {
    return this.getFirstReminderTemplate()
      .replace('You left some cool items in your cart!', 'Still thinking? We\'ve got a special offer for you!')
      .replace('{{urgencyMessage}}', '🎁 Use code {{discountCode}} for {{discountAmount}} off your order!');
  }

  private getFinalReminderTemplate(): string {
    return this.getFirstReminderTemplate()
      .replace('You left some cool items in your cart!', 'This is your final reminder - your cart expires soon!')
      .replace('{{urgencyMessage}}', '🔥 Last chance! Use code {{discountCode}} for {{discountAmount}} off - expires in 24 hours!');
  }

  // Analytics and reporting
  public async getAbandonedCartStats(timeRange: { start: Date; end: Date }) {
    const stats = await AbandonedCartModel.aggregate([
      {
        $match: {
          abandonedAt: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $group: {
          _id: null,
          totalCarts: { $sum: 1 },
          recoveredCarts: { $sum: { $cond: ['$recovered', 1, 0] } },
          totalValue: { $sum: '$totalValue' },
          recoveredValue: { 
            $sum: { $cond: ['$recovered', '$totalValue', 0] } 
          },
          avgCartValue: { $avg: '$totalValue' },
          emailsSent: { $sum: '$emailSequence' }
        }
      }
    ]);

    const result = stats[0] || {
      totalCarts: 0,
      recoveredCarts: 0,
      totalValue: 0,
      recoveredValue: 0,
      avgCartValue: 0,
      emailsSent: 0
    };

    return {
      ...result,
      recoveryRate: result.totalCarts > 0 ? (result.recoveredCarts / result.totalCarts) * 100 : 0,
      valueRecoveryRate: result.totalValue > 0 ? (result.recoveredValue / result.totalValue) * 100 : 0
    };
  }
}

export default new AbandonedCartService();
export { AbandonedCartService, AbandonedCartModel };