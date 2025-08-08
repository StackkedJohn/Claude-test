// Post-purchase notification service for email and SMS tracking updates
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import cron from 'node-cron';
import shippingService, { TrackingInfo } from './shippingService';
import { Order } from '../models/Order';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  emailAddress?: string;
  phoneNumber?: string;
  trackingUpdates: boolean;
  deliveryReminders: boolean;
  promotionalEmails: boolean;
}

export interface NotificationTemplate {
  type: 'order_confirmation' | 'shipment_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  subject: string;
  emailHtml: string;
  emailText: string;
  smsText: string;
  variables: { [key: string]: string };
}

class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: any;
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }

    this.initializeTemplates();
    this.startTrackingMonitoring();
  }

  private initializeTemplates(): void {
    // Order confirmation template
    this.templates.set('order_confirmation', {
      type: 'order_confirmation',
      subject: '🧊 Your ICEPACA Order Confirmation - {{orderNumber}}',
      emailHtml: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%); padding: 2rem;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #00008B; font-size: 2rem; margin-bottom: 0.5rem;">🧊 ICEPACA</h1>
            <h2 style="color: #4169E1; margin: 0;">Order Confirmed!</h2>
          </div>
          
          <div style="background: white; border-radius: 15px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);">
            <h3 style="color: #00008B; margin-bottom: 1rem;">Order Details</h3>
            <p><strong>Order Number:</strong> {{orderNumber}}</p>
            <p><strong>Order Date:</strong> {{orderDate}}</p>
            <p><strong>Total:</strong> ${{total}}</p>
            <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
          </div>

          <div style="background: white; border-radius: 15px; padding: 2rem; margin-bottom: 2rem;">
            <h3 style="color: #00008B; margin-bottom: 1rem;">What's Next?</h3>
            <ul style="padding-left: 1rem;">
              <li style="margin-bottom: 0.5rem;">✅ Your order is being processed</li>
              <li style="margin-bottom: 0.5rem;">📦 You'll receive tracking info when shipped</li>
              <li style="margin-bottom: 0.5rem;">❄️ Your ice packs will arrive fresh and ready!</li>
            </ul>
          </div>

          <div style="text-align: center; color: #666;">
            <p>Questions? Reply to this email or visit our <a href="{{websiteUrl}}" style="color: #4169E1;">support center</a>.</p>
            <p style="font-size: 0.9rem; color: #999;">Thank you for choosing sustainable cooling with ICEPACA! 🌱</p>
          </div>
        </div>
      `,
      emailText: `
        ICEPACA Order Confirmation

        Hi {{customerName}},

        Your order #{{orderNumber}} has been confirmed!

        Order Details:
        - Order Number: {{orderNumber}}
        - Order Date: {{orderDate}}
        - Total: ${{total}}
        - Estimated Delivery: {{estimatedDelivery}}

        What's Next:
        ✅ Your order is being processed
        📦 You'll receive tracking info when shipped
        ❄️ Your ice packs will arrive fresh and ready!

        Questions? Reply to this email or visit {{websiteUrl}}

        Thank you for choosing sustainable cooling with ICEPACA! 🌱
      `,
      smsText: '🧊 ICEPACA: Order #{{orderNumber}} confirmed! Total: ${{total}}. Estimated delivery: {{estimatedDelivery}}. Track at: {{trackingUrl}}',
      variables: {
        orderNumber: '',
        orderDate: '',
        total: '',
        estimatedDelivery: '',
        customerName: '',
        websiteUrl: process.env.FRONTEND_URL || 'https://icepaca.com',
        trackingUrl: ''
      }
    });

    // Shipment created template
    this.templates.set('shipment_created', {
      type: 'shipment_created',
      subject: '📦 Your ICEPACA Order is on its way! - {{trackingNumber}}',
      emailHtml: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%); padding: 2rem;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #00008B; font-size: 2rem; margin-bottom: 0.5rem;">🧊 ICEPACA</h1>
            <h2 style="color: #4169E1; margin: 0;">Your Order Has Shipped!</h2>
          </div>
          
          <div style="background: white; border-radius: 15px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);">
            <h3 style="color: #00008B; margin-bottom: 1rem;">Shipping Details</h3>
            <p><strong>Tracking Number:</strong> <code style="background: #E0F6FF; padding: 0.25rem 0.5rem; border-radius: 5px;">{{trackingNumber}}</code></p>
            <p><strong>Carrier:</strong> {{carrier}}</p>
            <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
            <p><strong>Shipping Method:</strong> {{shippingMethod}}</p>
          </div>

          <div style="background: rgba(50, 205, 50, 0.1); border-left: 4px solid #32CD32; border-radius: 0 15px 15px 0; padding: 2rem; margin-bottom: 2rem;">
            <h3 style="color: #228B22; margin-bottom: 1rem;">🌱 Eco-Friendly Shipping</h3>
            <p><strong>Carbon Footprint:</strong> {{carbonFootprint}}g CO2</p>
            <p><strong>Offset Cost:</strong> ${{offsetCost}} (automatically included)</p>
            <p>Thank you for choosing sustainable shipping! Your eco-friendly choice helps reduce environmental impact.</p>
          </div>

          <div style="text-align: center;">
            <a href="{{trackingUrl}}" style="background: linear-gradient(135deg, #00008B 0%, #4169E1 100%); color: white; padding: 1rem 2rem; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block; margin-bottom: 1rem;">
              🚚 Track Your Package
            </a>
          </div>

          <div style="text-align: center; color: #666;">
            <p>Your ice packs are on their way to keep your adventures cool! ❄️</p>
          </div>
        </div>
      `,
      emailText: `
        ICEPACA - Your Order Has Shipped!

        Hi {{customerName}},

        Great news! Your ICEPACA order is on its way.

        Shipping Details:
        - Tracking Number: {{trackingNumber}}
        - Carrier: {{carrier}}
        - Estimated Delivery: {{estimatedDelivery}}
        - Shipping Method: {{shippingMethod}}

        Eco-Friendly Shipping:
        🌱 Carbon Footprint: {{carbonFootprint}}g CO2
        💚 Offset Cost: ${{offsetCost}} (included)

        Track your package: {{trackingUrl}}

        Your ice packs are on their way to keep your adventures cool! ❄️
      `,
      smsText: '📦 ICEPACA shipped! Tracking: {{trackingNumber}} via {{carrier}}. Est. delivery: {{estimatedDelivery}}. Track: {{trackingUrl}}',
      variables: {
        trackingNumber: '',
        carrier: '',
        estimatedDelivery: '',
        shippingMethod: '',
        carbonFootprint: '',
        offsetCost: '',
        trackingUrl: '',
        customerName: ''
      }
    });

    // In transit template
    this.templates.set('in_transit', {
      type: 'in_transit',
      subject: '🚚 ICEPACA Update: Your order is in transit - {{trackingNumber}}',
      emailHtml: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%); padding: 2rem;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #00008B; font-size: 2rem; margin-bottom: 0.5rem;">🧊 ICEPACA</h1>
            <h2 style="color: #4169E1; margin: 0;">Package Update</h2>
          </div>
          
          <div style="background: white; border-radius: 15px; padding: 2rem; margin-bottom: 2rem;">
            <h3 style="color: #00008B; margin-bottom: 1rem;">📍 Current Status: In Transit</h3>
            <p><strong>Last Update:</strong> {{lastUpdate}}</p>
            <p><strong>Current Location:</strong> {{currentLocation}}</p>
            <p><strong>Next Stop:</strong> {{nextLocation}}</p>
            <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
          </div>

          <div style="text-align: center;">
            <a href="{{trackingUrl}}" style="background: linear-gradient(135deg, #00008B 0%, #4169E1 100%); color: white; padding: 1rem 2rem; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block;">
              View Full Tracking Details
            </a>
          </div>
        </div>
      `,
      emailText: `
        ICEPACA Package Update

        Your order is in transit!

        Status Details:
        - Last Update: {{lastUpdate}}
        - Current Location: {{currentLocation}}
        - Estimated Delivery: {{estimatedDelivery}}

        Track: {{trackingUrl}}
      `,
      smsText: '🚚 ICEPACA in transit from {{currentLocation}}. Est. delivery: {{estimatedDelivery}}. Track: {{trackingUrl}}',
      variables: {
        lastUpdate: '',
        currentLocation: '',
        nextLocation: '',
        estimatedDelivery: '',
        trackingUrl: ''
      }
    });

    // Out for delivery template
    this.templates.set('out_for_delivery', {
      type: 'out_for_delivery',
      subject: '🚛 ICEPACA: Out for delivery today! - {{trackingNumber}}',
      emailHtml: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%); padding: 2rem;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #00008B; font-size: 2rem; margin-bottom: 0.5rem;">🧊 ICEPACA</h1>
            <h2 style="color: #32CD32; margin: 0;">Out for Delivery Today!</h2>
          </div>
          
          <div style="background: white; border-radius: 15px; padding: 2rem; margin-bottom: 2rem; border: 2px solid #32CD32;">
            <h3 style="color: #228B22; margin-bottom: 1rem;">🚛 Your Package Arrives Today</h3>
            <p><strong>Delivery Window:</strong> {{deliveryWindow}}</p>
            <p><strong>Delivery Address:</strong> {{deliveryAddress}}</p>
            <p>Please ensure someone is available to receive your ICEPACA delivery!</p>
          </div>

          <div style="background: rgba(50, 205, 50, 0.1); border-radius: 15px; padding: 1.5rem; margin-bottom: 2rem;">
            <h4 style="color: #228B22; margin-bottom: 1rem;">📋 Delivery Tips</h4>
            <ul style="margin: 0; padding-left: 1rem;">
              <li style="margin-bottom: 0.5rem;">Have your ID ready if signature is required</li>
              <li style="margin-bottom: 0.5rem;">Clear a cool, dry space for your ice packs</li>
              <li style="margin-bottom: 0.5rem;">Consider refrigerating them for best performance</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="{{trackingUrl}}" style="background: linear-gradient(135deg, #32CD32 0%, #228B22 100%); color: white; padding: 1rem 2rem; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block;">
              Track Live Delivery
            </a>
          </div>
        </div>
      `,
      emailText: `
        ICEPACA - Out for Delivery Today!

        Your ice packs are on the delivery truck and will arrive today!

        Delivery Details:
        - Delivery Window: {{deliveryWindow}}
        - Delivery Address: {{deliveryAddress}}

        Delivery Tips:
        - Have your ID ready if signature is required
        - Clear a cool, dry space for your ice packs
        - Consider refrigerating them for best performance

        Track: {{trackingUrl}}
      `,
      smsText: '🚛 ICEPACA out for delivery today! Window: {{deliveryWindow}}. Be ready to receive your package. Track: {{trackingUrl}}',
      variables: {
        deliveryWindow: '',
        deliveryAddress: '',
        trackingUrl: ''
      }
    });

    // Delivered template
    this.templates.set('delivered', {
      type: 'delivered',
      subject: '✅ ICEPACA Delivered! Enjoy your cooling adventure',
      emailHtml: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%); padding: 2rem;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #00008B; font-size: 2rem; margin-bottom: 0.5rem;">🧊 ICEPACA</h1>
            <h2 style="color: #32CD32; margin: 0;">🎉 Package Delivered!</h2>
          </div>
          
          <div style="background: white; border-radius: 15px; padding: 2rem; margin-bottom: 2rem; border: 2px solid #32CD32;">
            <h3 style="color: #228B22; margin-bottom: 1rem;">✅ Successfully Delivered</h3>
            <p><strong>Delivered At:</strong> {{deliveredTime}}</p>
            <p><strong>Delivered To:</strong> {{deliveryLocation}}</p>
            <p><strong>Signed By:</strong> {{signedBy}}</p>
          </div>

          <div style="background: rgba(0, 0, 139, 0.05); border-radius: 15px; padding: 2rem; margin-bottom: 2rem;">
            <h3 style="color: #00008B; margin-bottom: 1rem;">🧊 Using Your ICEPACA Products</h3>
            <ul style="margin: 0; padding-left: 1rem;">
              <li style="margin-bottom: 0.75rem;"><strong>First Use:</strong> Freeze for 4-6 hours before first use</li>
              <li style="margin-bottom: 0.75rem;"><strong>Best Performance:</strong> Store in freezer when not in use</li>
              <li style="margin-bottom: 0.75rem;"><strong>Care:</strong> Clean with mild soap and water</li>
              <li><strong>Lifespan:</strong> Your ice packs are good for 1000+ uses!</li>
            </ul>
          </div>

          <div style="background: rgba(50, 205, 50, 0.1); border-radius: 15px; padding: 2rem; margin-bottom: 2rem;">
            <h3 style="color: #228B22; margin-bottom: 1rem;">🌱 Environmental Impact</h3>
            <p>Congratulations! By choosing ICEPACA, you've made an eco-friendly choice:</p>
            <ul style="margin: 0; padding-left: 1rem;">
              <li style="margin-bottom: 0.5rem;">💚 Reduced plastic waste vs. disposable ice</li>
              <li style="margin-bottom: 0.5rem;">🌍 Lower carbon footprint over product lifetime</li>
              <li style="margin-bottom: 0.5rem;">♻️ 100% recyclable materials</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="{{reviewUrl}}" style="background: linear-gradient(135deg, #00008B 0%, #4169E1 100%); color: white; padding: 1rem 2rem; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0.5rem;">
              ⭐ Leave a Review
            </a>
            <a href="{{supportUrl}}" style="background: rgba(173, 216, 230, 0.2); color: #00008B; border: 2px solid #ADD8E6; padding: 1rem 2rem; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0.5rem;">
              💬 Contact Support
            </a>
          </div>

          <div style="text-align: center; color: #666; margin-top: 2rem;">
            <p style="font-size: 0.9rem;">Thank you for choosing ICEPACA! Stay cool! ❄️</p>
          </div>
        </div>
      `,
      emailText: `
        ICEPACA - Package Delivered!

        Great news! Your ICEPACA order has been successfully delivered.

        Delivery Details:
        - Delivered At: {{deliveredTime}}
        - Delivered To: {{deliveryLocation}}
        - Signed By: {{signedBy}}

        Using Your ICEPACA Products:
        🧊 First Use: Freeze for 4-6 hours before first use
        ❄️ Best Performance: Store in freezer when not in use
        🧽 Care: Clean with mild soap and water
        ♻️ Lifespan: Your ice packs are good for 1000+ uses!

        Environmental Impact:
        💚 Reduced plastic waste vs. disposable ice
        🌍 Lower carbon footprint over product lifetime
        ♻️ 100% recyclable materials

        Leave a review: {{reviewUrl}}
        Need help: {{supportUrl}}

        Thank you for choosing ICEPACA! Stay cool! ❄️
      `,
      smsText: '✅ ICEPACA delivered to {{deliveryLocation}} at {{deliveredTime}}! Freeze 4-6 hours before use. Enjoy your cooling adventure! ❄️',
      variables: {
        deliveredTime: '',
        deliveryLocation: '',
        signedBy: '',
        reviewUrl: '',
        supportUrl: ''
      }
    });
  }

  // Send order confirmation
  async sendOrderConfirmation(order: any, preferences: NotificationPreferences): Promise<void> {
    const template = this.templates.get('order_confirmation');
    if (!template) return;

    const variables = {
      ...template.variables,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate.toLocaleDateString(),
      total: order.totals.total.toFixed(2),
      estimatedDelivery: order.estimatedDelivery || 'Within 5-7 business days',
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      trackingUrl: `${process.env.FRONTEND_URL}/track/${order.trackingNumber}`
    };

    if (preferences.email && preferences.emailAddress) {
      await this.sendEmail(preferences.emailAddress, template, variables);
    }

    if (preferences.sms && preferences.phoneNumber) {
      await this.sendSMS(preferences.phoneNumber, template, variables);
    }
  }

  // Send shipment notification
  async sendShipmentNotification(
    order: any, 
    trackingInfo: TrackingInfo,
    shippingRate: any,
    preferences: NotificationPreferences
  ): Promise<void> {
    const template = this.templates.get('shipment_created');
    if (!template) return;

    const variables = {
      ...template.variables,
      trackingNumber: trackingInfo.trackingNumber,
      carrier: trackingInfo.carrier,
      estimatedDelivery: trackingInfo.estimatedDelivery || 'Unknown',
      shippingMethod: shippingRate.displayName,
      carbonFootprint: shippingRate.carbonFootprint?.co2Grams?.toString() || '0',
      offsetCost: shippingRate.carbonFootprint?.offsetCost?.toFixed(2) || '0.00',
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      trackingUrl: `${process.env.FRONTEND_URL}/track/${trackingInfo.trackingNumber}`
    };

    if (preferences.email && preferences.trackingUpdates && preferences.emailAddress) {
      await this.sendEmail(preferences.emailAddress, template, variables);
    }

    if (preferences.sms && preferences.trackingUpdates && preferences.phoneNumber) {
      await this.sendSMS(preferences.phoneNumber, template, variables);
    }
  }

  // Send tracking update
  async sendTrackingUpdate(
    order: any,
    trackingInfo: TrackingInfo,
    preferences: NotificationPreferences
  ): Promise<void> {
    let templateKey = 'in_transit';
    
    const status = trackingInfo.status.toLowerCase();
    if (status.includes('out') && status.includes('delivery')) {
      templateKey = 'out_for_delivery';
    } else if (status.includes('delivered')) {
      templateKey = 'delivered';
    }

    const template = this.templates.get(templateKey);
    if (!template) return;

    const latestEvent = trackingInfo.events[trackingInfo.events.length - 1];
    const variables = {
      ...template.variables,
      trackingNumber: trackingInfo.trackingNumber,
      lastUpdate: latestEvent?.date || trackingInfo.lastUpdate,
      currentLocation: latestEvent?.location || 'In Transit',
      estimatedDelivery: trackingInfo.estimatedDelivery || 'Unknown',
      deliveryWindow: 'Between 9 AM - 8 PM',
      deliveryAddress: `${order.shipping.address1}, ${order.shipping.city}, ${order.shipping.state}`,
      deliveredTime: templateKey === 'delivered' ? latestEvent?.date || 'Unknown' : '',
      deliveryLocation: templateKey === 'delivered' ? latestEvent?.location || 'Front door' : '',
      signedBy: templateKey === 'delivered' ? 'Recipient' : '',
      trackingUrl: `${process.env.FRONTEND_URL}/track/${trackingInfo.trackingNumber}`,
      reviewUrl: `${process.env.FRONTEND_URL}/review/${order._id}`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    if (preferences.email && preferences.trackingUpdates && preferences.emailAddress) {
      await this.sendEmail(preferences.emailAddress, template, variables);
    }

    if (preferences.sms && preferences.trackingUpdates && preferences.phoneNumber) {
      await this.sendSMS(preferences.phoneNumber, template, variables);
    }
  }

  private async sendEmail(
    to: string, 
    template: NotificationTemplate, 
    variables: { [key: string]: string }
  ): Promise<void> {
    try {
      const subject = this.replaceVariables(template.subject, variables);
      const html = this.replaceVariables(template.emailHtml, variables);
      const text = this.replaceVariables(template.emailText, variables);

      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'ICEPACA <noreply@icepaca.com>',
        to,
        subject,
        html,
        text
      });

      console.log(`Email sent successfully to ${to} - ${template.type}`);
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
    }
  }

  private async sendSMS(
    to: string, 
    template: NotificationTemplate, 
    variables: { [key: string]: string }
  ): Promise<void> {
    if (!this.twilioClient) {
      console.log('Twilio not configured, skipping SMS');
      return;
    }

    try {
      const message = this.replaceVariables(template.smsText, variables);

      await this.twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
        body: message
      });

      console.log(`SMS sent successfully to ${to} - ${template.type}`);
    } catch (error) {
      console.error(`Failed to send SMS to ${to}:`, error);
    }
  }

  private replaceVariables(text: string, variables: { [key: string]: string }): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  // Start monitoring tracking updates
  private startTrackingMonitoring(): void {
    // Check for tracking updates every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      console.log('Starting tracking update check...');
      await this.checkTrackingUpdates();
    });

    console.log('Tracking monitoring started - checking every 2 hours');
  }

  private async checkTrackingUpdates(): Promise<void> {
    try {
      // Find orders with tracking numbers that are not delivered
      const activeOrders = await Order.find({
        trackingNumber: { $exists: true, $ne: null },
        status: { $in: ['confirmed', 'processing', 'shipped'] }
      });

      for (const order of activeOrders) {
        try {
          const trackingInfo = await shippingService.getTrackingInfo(
            order.trackingNumber, 
            order.shipping?.carrier || 'USPS'
          );

          if (trackingInfo) {
            // Check if status has changed
            const currentStatus = order.trackingStatus || 'UNKNOWN';
            if (trackingInfo.status !== currentStatus) {
              // Update order status
              order.trackingStatus = trackingInfo.status;
              
              // Update order status based on tracking
              if (trackingInfo.status.toLowerCase().includes('delivered')) {
                order.status = 'delivered';
                order.deliveredDate = new Date();
              } else if (trackingInfo.status.toLowerCase().includes('transit')) {
                order.status = 'shipped';
              }

              await order.save();

              // Send notification if preferences allow
              const preferences: NotificationPreferences = {
                email: true,
                sms: false, // Conservative default
                emailAddress: order.customer.email,
                trackingUpdates: true,
                deliveryReminders: true,
                promotionalEmails: false
              };

              await this.sendTrackingUpdate(order, trackingInfo, preferences);
            }
          }
        } catch (error) {
          console.error(`Error checking tracking for order ${order.orderNumber}:`, error);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Checked tracking for ${activeOrders.length} active orders`);
    } catch (error) {
      console.error('Error in tracking update check:', error);
    }
  }

  // Admin dashboard notification functionality
  async sendNotification(notification: {
    type: string;
    channel: 'email' | 'sms' | 'push' | 'webhook';
    message: string;
    timestamp: Date;
    priority: 'low' | 'normal' | 'high' | 'critical';
    recipient?: string;
  }): Promise<void> {
    try {
      switch (notification.channel) {
        case 'email':
          if (notification.recipient) {
            await this.sendAdminEmail(notification.recipient, notification);
          }
          break;
        
        case 'sms':
          if (notification.recipient) {
            await this.sendAdminSMS(notification.recipient, notification);
          }
          break;
        
        case 'push':
          await this.sendPushNotification(notification);
          break;
        
        case 'webhook':
          await this.sendWebhookNotification(notification);
          break;
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  private async sendAdminEmail(recipient: string, notification: any): Promise<void> {
    try {
      const priorityColors: { [key: string]: string } = {
        low: '#28a745',
        normal: '#17a2b8',
        high: '#ffc107',
        critical: '#dc3545'
      };

      const color = priorityColors[notification.priority] || '#17a2b8';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 2rem;">
          <div style="background: white; border-radius: 8px; padding: 2rem; border-left: 4px solid ${color};">
            <div style="display: flex; align-items: center; margin-bottom: 1rem;">
              <h2 style="margin: 0; color: #343a40;">🚨 ICEPACA Admin Alert</h2>
              <span style="margin-left: auto; background: ${color}; color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">
                ${notification.priority}
              </span>
            </div>
            
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
              <p style="margin: 0; font-size: 0.9rem; color: #6c757d;">
                <strong>Type:</strong> ${notification.type}<br>
                <strong>Time:</strong> ${notification.timestamp.toLocaleString()}<br>
                <strong>Priority:</strong> ${notification.priority.toUpperCase()}
              </p>
            </div>
            
            <div style="margin: 1.5rem 0;">
              <p style="font-size: 1.1rem; line-height: 1.5; color: #495057; margin: 0;">
                ${notification.message}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 2rem;">
              <a href="${process.env.ADMIN_URL || 'https://admin.icepaca.com'}" 
                 style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                        color: white; padding: 0.75rem 2rem; border-radius: 25px; 
                        text-decoration: none; font-weight: 600; display: inline-block;">
                View Admin Dashboard
              </a>
            </div>
            
            <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 0.8rem; margin: 0;">
                ICEPACA Admin Monitoring System
              </p>
            </div>
          </div>
        </div>
      `;

      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'ICEPACA Admin <admin@icepaca.com>',
        to: recipient,
        subject: `🚨 ICEPACA Alert: ${notification.type} [${notification.priority.toUpperCase()}]`,
        html
      });

      console.log(`Admin email sent successfully to ${recipient} - ${notification.type}`);
    } catch (error) {
      console.error(`Failed to send admin email to ${recipient}:`, error);
    }
  }

  private async sendAdminSMS(recipient: string, notification: any): Promise<void> {
    if (!this.twilioClient) {
      console.log('Twilio not configured, skipping admin SMS');
      return;
    }

    try {
      const message = `🚨 ICEPACA Admin Alert [${notification.priority.toUpperCase()}]: ${notification.message.substring(0, 120)}... View dashboard: ${process.env.ADMIN_URL}`;

      await this.twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: recipient,
        body: message
      });

      console.log(`Admin SMS sent successfully to ${recipient} - ${notification.type}`);
    } catch (error) {
      console.error(`Failed to send admin SMS to ${recipient}:`, error);
    }
  }

  private async sendPushNotification(notification: any): Promise<void> {
    try {
      // In production, integrate with push notification service (FCM, APNS, etc.)
      console.log('Push notification sent:', notification);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  private async sendWebhookNotification(notification: any): Promise<void> {
    try {
      const webhookUrl = process.env.ADMIN_WEBHOOK_URL;
      if (!webhookUrl) {
        console.log('No webhook URL configured');
        return;
      }

      const payload = {
        type: 'admin_alert',
        data: notification,
        timestamp: new Date().toISOString(),
        source: 'icepaca-admin'
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN || ''}`
        },
        body: JSON.stringify(payload)
      });

      console.log('Webhook notification sent successfully');
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  // Send inventory alert
  async sendInventoryAlert(product: any, alertType: 'low_stock' | 'out_of_stock'): Promise<void> {
    const message = alertType === 'out_of_stock' 
      ? `Product "${product.name}" is completely out of stock`
      : `Product "${product.name}" is running low on inventory (${product.stock} units remaining)`;

    await this.sendNotification({
      type: 'inventory_alert',
      channel: 'email',
      message,
      timestamp: new Date(),
      priority: alertType === 'out_of_stock' ? 'critical' : 'high',
      recipient: process.env.ADMIN_EMAIL
    });
  }

  // Send security alert
  async sendSecurityAlert(alertData: {
    type: 'brute_force' | 'suspicious_activity' | 'failed_login' | 'blocked_ip';
    details: string;
    ipAddress?: string;
    userId?: string;
  }): Promise<void> {
    const message = `Security Alert: ${alertData.details}${alertData.ipAddress ? ` from IP ${alertData.ipAddress}` : ''}`;

    await this.sendNotification({
      type: 'security_alert',
      channel: 'email',
      message,
      timestamp: new Date(),
      priority: alertData.type === 'brute_force' ? 'critical' : 'high',
      recipient: process.env.ADMIN_EMAIL
    });
  }

  // Send performance alert
  async sendPerformanceAlert(metric: string, value: number, threshold: number): Promise<void> {
    const message = `Performance Alert: ${metric} is ${value}, exceeding threshold of ${threshold}`;

    await this.sendNotification({
      type: 'performance_alert',
      channel: 'email',
      message,
      timestamp: new Date(),
      priority: 'high',
      recipient: process.env.ADMIN_EMAIL
    });
  }

  // Send system alert
  async sendSystemAlert(system: string, status: 'up' | 'down' | 'degraded', details?: string): Promise<void> {
    const message = `System Alert: ${system} is ${status}${details ? `. ${details}` : ''}`;

    await this.sendNotification({
      type: 'system_alert',
      channel: 'email',
      message,
      timestamp: new Date(),
      priority: status === 'down' ? 'critical' : 'high',
      recipient: process.env.ADMIN_EMAIL
    });
  }
}

export default new NotificationService();