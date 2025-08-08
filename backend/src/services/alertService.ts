import AdminAlert from '../models/AdminAlert';
import Product from '../models/Product';
import nodemailer from 'nodemailer';

// Email configuration (in production, use environment variables)
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

class AlertService {
  private transporter: any;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter(EMAIL_CONFIG);
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async createAlert(type: string, title: string, message: string, productId?: string, severity: string = 'medium') {
    try {
      const alert = await AdminAlert.create({
        type,
        title,
        message,
        productId,
        severity,
        isRead: false,
        isEmailSent: false
      });

      // Send email notification if severity is high or critical
      if ((severity === 'high' || severity === 'critical') && this.transporter) {
        await this.sendEmailAlert(alert);
      }

      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  async sendEmailAlert(alert: any) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@icepaca.com';
      
      const mailOptions = {
        from: process.env.SMTP_USER || 'noreply@icepaca.com',
        to: adminEmail,
        subject: `🚨 ICEPACA Alert: ${alert.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #00008B 0%, #4169E1 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🦙 ICEPACA Alert</h1>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <div style="background: ${this.getSeverityColor(alert.severity)}; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
                <strong>Severity: ${alert.severity.toUpperCase()}</strong>
              </div>
              
              <h2 style="color: #00008B; margin-bottom: 10px;">${alert.title}</h2>
              <p style="color: #333; line-height: 1.6;">${alert.message}</p>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">
                  Alert created: ${new Date(alert.createdAt).toLocaleString()}
                </p>
                <p style="color: #666; font-size: 14px;">
                  <a href="${process.env.ADMIN_URL || 'http://localhost:3000/admin'}" style="color: #00008B;">
                    View Admin Dashboard
                  </a>
                </p>
              </div>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      
      // Mark alert as email sent
      alert.isEmailSent = true;
      await alert.save();
      
      console.log('Alert email sent successfully');
    } catch (error) {
      console.error('Error sending alert email:', error);
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ffebee';
      case 'high': return '#fff3e0';
      case 'medium': return '#e3f2fd';
      case 'low': return '#f1f8e9';
      default: return '#f5f5f5';
    }
  }

  async checkLowStock() {
    try {
      const lowStockProducts = await Product.find({
        isActive: true,
        $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] },
        'stock.quantity': { $gt: 0 }
      });

      for (const product of lowStockProducts) {
        // Check if alert already exists for this product
        const existingAlert = await AdminAlert.findOne({
          type: 'low-stock',
          productId: product._id,
          isRead: false,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
        });

        if (!existingAlert) {
          await this.createAlert(
            'low-stock',
            `Low Stock: ${product.name}`,
            `Product "${product.name}" is running low on stock. Current quantity: ${product.stock.quantity}, threshold: ${product.stock.lowStockThreshold}`,
            product._id,
            product.stock.quantity <= 5 ? 'high' : 'medium'
          );
        }
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }

  async checkOutOfStock() {
    try {
      const outOfStockProducts = await Product.find({
        isActive: true,
        'stock.quantity': 0
      });

      for (const product of outOfStockProducts) {
        // Check if alert already exists for this product
        const existingAlert = await AdminAlert.findOne({
          type: 'out-of-stock',
          productId: product._id,
          isRead: false,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
        });

        if (!existingAlert) {
          await this.createAlert(
            'out-of-stock',
            `Out of Stock: ${product.name}`,
            `Product "${product.name}" is now out of stock and cannot be purchased.`,
            product._id,
            'high'
          );
        }
      }
    } catch (error) {
      console.error('Error checking out of stock:', error);
    }
  }

  async runStockMonitoring() {
    console.log('Running stock monitoring...');
    await Promise.all([
      this.checkLowStock(),
      this.checkOutOfStock()
    ]);
  }

  startPeriodicMonitoring(intervalMinutes: number = 30) {
    console.log(`Starting periodic stock monitoring every ${intervalMinutes} minutes`);
    
    // Run initial check
    this.runStockMonitoring();
    
    // Set up periodic monitoring
    setInterval(() => {
      this.runStockMonitoring();
    }, intervalMinutes * 60 * 1000);
  }

  async markAlertAsRead(alertId: string) {
    try {
      const alert = await AdminAlert.findByIdAndUpdate(
        alertId,
        { isRead: true },
        { new: true }
      );
      return alert;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      throw error;
    }
  }

  async getUnreadAlertsCount() {
    try {
      return await AdminAlert.countDocuments({ isRead: false });
    } catch (error) {
      console.error('Error getting unread alerts count:', error);
      return 0;
    }
  }

  async deleteOldAlerts(daysToKeep: number = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await AdminAlert.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });
      
      console.log(`Deleted ${result.deletedCount} old alerts`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting old alerts:', error);
      return 0;
    }
  }
}

export default new AlertService();