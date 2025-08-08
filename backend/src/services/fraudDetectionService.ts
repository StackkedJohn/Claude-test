import { Order } from '../models/Order';
import { User } from '../models/User';

interface FraudAlert {
  id: string;
  orderId: string;
  userId?: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: FraudFlag[];
  timestamp: Date;
  status: 'pending' | 'reviewed' | 'cleared' | 'blocked';
  reviewedBy?: string;
  notes?: string;
}

interface FraudFlag {
  type: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  message: string;
  score: number;
  details?: any;
}

interface TransactionPattern {
  userId?: string;
  email: string;
  ip: string;
  userAgent: string;
  deviceFingerprint?: string;
  paymentMethod: any;
  billingAddress: any;
  shippingAddress: any;
  orderValue: number;
  items: any[];
  timestamp: Date;
}

interface RiskIndicators {
  velocityRisk: number;
  locationRisk: number;
  paymentRisk: number;
  behaviorRisk: number;
  deviceRisk: number;
  networkRisk: number;
}

class FraudDetectionService {
  private suspiciousIPs: Set<string> = new Set();
  private blockedEmails: Set<string> = new Set();
  private trustedUsers: Set<string> = new Set();
  
  constructor() {
    this.initializeBlacklists();
  }

  // Initialize known fraud indicators
  private initializeBlacklists(): void {
    // Known suspicious IPs (in production, load from database/external service)
    this.suspiciousIPs.add('192.168.1.100'); // Example suspicious IP
    
    // Known fraudulent emails
    this.blockedEmails.add('fraud@example.com');
    
    // Load trusted users (VIP customers, etc.)
    this.loadTrustedUsers();
  }

  private async loadTrustedUsers(): Promise<void> {
    try {
      const vipUsers = await User.find({ 
        $or: [
          { vipStatus: true },
          { totalOrders: { $gte: 10 } },
          { totalSpent: { $gte: 1000 } }
        ]
      }).select('_id');
      
      vipUsers.forEach(user => this.trustedUsers.add(user._id.toString()));
    } catch (error) {
      console.error('Error loading trusted users:', error);
    }
  }

  // Main fraud detection function
  async detectFraud(orderData: any, sessionData?: any): Promise<FraudAlert> {
    const pattern = this.extractTransactionPattern(orderData, sessionData);
    const riskIndicators = await this.calculateRiskIndicators(pattern);
    const flags = await this.generateFraudFlags(pattern, riskIndicators);
    
    const riskScore = this.calculateOverallRiskScore(riskIndicators, flags);
    const riskLevel = this.determineRiskLevel(riskScore);
    
    const alert: FraudAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: orderData._id || orderData.id,
      userId: orderData.user || orderData.customer?.id,
      riskScore: Math.round(riskScore * 100) / 100,
      riskLevel,
      flags,
      timestamp: new Date(),
      status: riskLevel === 'critical' ? 'blocked' : 'pending'
    };

    // Log alert for monitoring
    console.log(`Fraud Alert Generated: ${alert.id} - Risk: ${riskLevel} (${riskScore})`);
    
    // In production, save to database and potentially notify admins
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.notifySecurityTeam(alert);
    }
    
    return alert;
  }

  // Extract transaction pattern from order data
  private extractTransactionPattern(orderData: any, sessionData?: any): TransactionPattern {
    return {
      userId: orderData.user || orderData.customer?.id,
      email: orderData.customer?.email || orderData.email,
      ip: sessionData?.ip || orderData.ip || '127.0.0.1',
      userAgent: sessionData?.userAgent || orderData.userAgent || '',
      deviceFingerprint: sessionData?.deviceFingerprint,
      paymentMethod: orderData.paymentMethod || {},
      billingAddress: orderData.billing || {},
      shippingAddress: orderData.shipping || {},
      orderValue: orderData.total || orderData.totals?.total || 0,
      items: orderData.items || [],
      timestamp: new Date(orderData.createdAt || Date.now())
    };
  }

  // Calculate various risk indicators
  private async calculateRiskIndicators(pattern: TransactionPattern): Promise<RiskIndicators> {
    const [
      velocityRisk,
      locationRisk,
      paymentRisk,
      behaviorRisk,
      deviceRisk,
      networkRisk
    ] = await Promise.all([
      this.calculateVelocityRisk(pattern),
      this.calculateLocationRisk(pattern),
      this.calculatePaymentRisk(pattern),
      this.calculateBehaviorRisk(pattern),
      this.calculateDeviceRisk(pattern),
      this.calculateNetworkRisk(pattern)
    ]);

    return {
      velocityRisk,
      locationRisk,
      paymentRisk,
      behaviorRisk,
      deviceRisk,
      networkRisk
    };
  }

  // Calculate velocity risk (multiple orders in short time)
  private async calculateVelocityRisk(pattern: TransactionPattern): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000);
      const oneDayAgo = new Date(Date.now() - 86400000);
      
      const recentOrdersQuery = {
        $or: [
          { 'customer.email': pattern.email },
          { ip: pattern.ip }
        ],
        createdAt: { $gte: oneHourAgo }
      };

      const dailyOrdersQuery = {
        ...recentOrdersQuery,
        createdAt: { $gte: oneDayAgo }
      };

      const [hourlyOrders, dailyOrders] = await Promise.all([
        Order.countDocuments(recentOrdersQuery),
        Order.countDocuments(dailyOrdersQuery)
      ]);

      let risk = 0;
      
      // Multiple orders in 1 hour is suspicious
      if (hourlyOrders >= 3) risk += 0.8;
      else if (hourlyOrders >= 2) risk += 0.4;
      
      // Too many orders in 1 day
      if (dailyOrders >= 10) risk += 0.6;
      else if (dailyOrders >= 5) risk += 0.3;

      return Math.min(risk, 1.0);
    } catch (error) {
      console.error('Error calculating velocity risk:', error);
      return 0;
    }
  }

  // Calculate location risk (unusual shipping/billing locations)
  private async calculateLocationRisk(pattern: TransactionPattern): Promise<number> {
    let risk = 0;

    // Check for address mismatches
    const billing = pattern.billingAddress;
    const shipping = pattern.shippingAddress;

    if (billing && shipping) {
      if (billing.country !== shipping.country) {
        risk += 0.3; // Different countries
      }
      
      if (billing.state !== shipping.state && billing.country === shipping.country) {
        risk += 0.1; // Different states same country
      }
    }

    // Check for high-risk countries (example list)
    const highRiskCountries = ['XX', 'YY']; // Placeholder
    if (shipping?.country && highRiskCountries.includes(shipping.country)) {
      risk += 0.4;
    }

    // Check for PO Box shipping (higher risk for physical goods)
    const shippingAddress1 = shipping?.address1 || '';
    if (/p\.?o\.?\s*box|post\s*office\s*box/i.test(shippingAddress1)) {
      risk += 0.2;
    }

    return Math.min(risk, 1.0);
  }

  // Calculate payment risk
  private async calculatePaymentRisk(pattern: TransactionPattern): Promise<number> {
    let risk = 0;
    const payment = pattern.paymentMethod;

    // Check payment method risk
    if (payment?.type === 'credit_card') {
      // Check for testing card numbers
      const cardNumber = payment.last4 || payment.cardNumber || '';
      const testCardPatterns = ['4111', '4242', '5555'];
      
      if (testCardPatterns.some(pattern => cardNumber.includes(pattern))) {
        risk += 0.9; // Test cards are very suspicious
      }

      // Check for mismatched billing info
      if (payment.billingAddress) {
        const orderBilling = pattern.billingAddress;
        if (payment.billingAddress.zipCode !== orderBilling?.zipCode) {
          risk += 0.3;
        }
      }
    }

    // High-value orders with new payment methods
    if (pattern.orderValue > 500 && !payment?.verified) {
      risk += 0.2;
    }

    // Multiple failed payment attempts (would need session data)
    if (payment?.failedAttempts && payment.failedAttempts > 2) {
      risk += 0.4;
    }

    return Math.min(risk, 1.0);
  }

  // Calculate behavior risk
  private async calculateBehaviorRisk(pattern: TransactionPattern): Promise<number> {
    let risk = 0;

    // Check order value vs typical patterns
    if (pattern.orderValue > 1000) {
      risk += 0.3; // High value orders are riskier
    }

    // Large quantity of same item
    const items = pattern.items || [];
    const maxQuantity = Math.max(...items.map(item => item.quantity || 1));
    if (maxQuantity >= 10) {
      risk += 0.4; // Bulk purchases can be fraudulent
    }

    // Check for typical fraud items (electronics, gift cards, etc.)
    const fraudProneCategories = ['electronics', 'gift-cards', 'jewelry'];
    const hasFraudProneItems = items.some(item => 
      fraudProneCategories.some(category => 
        (item.category || '').toLowerCase().includes(category)
      )
    );
    
    if (hasFraudProneItems) {
      risk += 0.2;
    }

    // New user with high-value order
    if (pattern.userId && pattern.orderValue > 300) {
      try {
        const user = await User.findById(pattern.userId);
        if (user && user.createdAt && 
            Date.now() - user.createdAt.getTime() < 86400000) { // Account less than 1 day old
          risk += 0.5;
        }
      } catch (error) {
        console.error('Error checking user age:', error);
      }
    }

    return Math.min(risk, 1.0);
  }

  // Calculate device risk
  private calculateDeviceRisk(pattern: TransactionPattern): Promise<number> {
    return new Promise(resolve => {
      let risk = 0;

      // Check user agent
      const userAgent = pattern.userAgent.toLowerCase();
      
      // Suspicious user agents
      if (userAgent.includes('bot') || userAgent.includes('crawler')) {
        risk += 0.8;
      }

      // Very old browsers (potential fraud tools)
      if (userAgent.includes('msie 6') || userAgent.includes('msie 7')) {
        risk += 0.3;
      }

      // Missing or generic user agent
      if (!pattern.userAgent || pattern.userAgent.length < 10) {
        risk += 0.4;
      }

      // Device fingerprint analysis (if available)
      if (pattern.deviceFingerprint) {
        // Check against known fraud fingerprints
        // This would be implemented with a real fingerprinting service
        risk += 0.1;
      }

      resolve(Math.min(risk, 1.0));
    });
  }

  // Calculate network risk
  private calculateNetworkRisk(pattern: TransactionPattern): Promise<number> {
    return new Promise(resolve => {
      let risk = 0;

      // Check IP address
      if (this.suspiciousIPs.has(pattern.ip)) {
        risk += 0.9;
      }

      // Check for VPN/Proxy indicators
      // In production, use IP intelligence services
      if (this.isVPNOrProxy(pattern.ip)) {
        risk += 0.4;
      }

      // Tor network detection
      if (this.isTorNetwork(pattern.ip)) {
        risk += 0.7;
      }

      // Geographic inconsistencies
      // Compare IP location with billing/shipping addresses
      // This would require IP geolocation service
      
      resolve(Math.min(risk, 1.0));
    });
  }

  // Generate specific fraud flags based on risk indicators
  private async generateFraudFlags(
    pattern: TransactionPattern, 
    risks: RiskIndicators
  ): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];

    // Velocity flags
    if (risks.velocityRisk > 0.7) {
      flags.push({
        type: 'velocity',
        severity: 'critical',
        message: 'Excessive order frequency detected',
        score: risks.velocityRisk * 100,
        details: { timeframe: '1 hour', threshold: 'exceeded' }
      });
    } else if (risks.velocityRisk > 0.4) {
      flags.push({
        type: 'velocity',
        severity: 'warning',
        message: 'Unusual order frequency',
        score: risks.velocityRisk * 100
      });
    }

    // Location flags
    if (risks.locationRisk > 0.5) {
      flags.push({
        type: 'location',
        severity: 'danger',
        message: 'Suspicious shipping/billing address mismatch',
        score: risks.locationRisk * 100
      });
    }

    // Payment flags
    if (risks.paymentRisk > 0.6) {
      flags.push({
        type: 'payment',
        severity: 'critical',
        message: 'High-risk payment method detected',
        score: risks.paymentRisk * 100
      });
    }

    // Behavior flags
    if (risks.behaviorRisk > 0.5) {
      flags.push({
        type: 'behavior',
        severity: 'warning',
        message: 'Unusual purchase behavior',
        score: risks.behaviorRisk * 100,
        details: {
          orderValue: pattern.orderValue,
          itemCount: pattern.items.length
        }
      });
    }

    // Device flags
    if (risks.deviceRisk > 0.6) {
      flags.push({
        type: 'device',
        severity: 'danger',
        message: 'Suspicious device or browser',
        score: risks.deviceRisk * 100
      });
    }

    // Network flags
    if (risks.networkRisk > 0.6) {
      flags.push({
        type: 'network',
        severity: 'critical',
        message: 'High-risk network or IP address',
        score: risks.networkRisk * 100,
        details: { ip: pattern.ip }
      });
    }

    // Email flags
    if (this.blockedEmails.has(pattern.email)) {
      flags.push({
        type: 'email',
        severity: 'critical',
        message: 'Blocked email address',
        score: 100,
        details: { email: pattern.email }
      });
    }

    // Trusted user check
    if (pattern.userId && this.trustedUsers.has(pattern.userId)) {
      flags.push({
        type: 'trust',
        severity: 'info',
        message: 'Trusted customer - reduced risk',
        score: -20 // Negative score reduces overall risk
      });
    }

    return flags;
  }

  // Calculate overall risk score
  private calculateOverallRiskScore(risks: RiskIndicators, flags: FraudFlag[]): number {
    // Weighted risk calculation
    const weights = {
      velocityRisk: 0.2,
      locationRisk: 0.15,
      paymentRisk: 0.25,
      behaviorRisk: 0.15,
      deviceRisk: 0.1,
      networkRisk: 0.15
    };

    let baseScore = 0;
    Object.entries(risks).forEach(([key, value]) => {
      baseScore += value * (weights[key as keyof typeof weights] || 0.1);
    });

    // Apply flag modifiers
    const flagModifier = flags.reduce((sum, flag) => {
      let modifier = flag.score / 100;
      
      // Weight by severity
      switch (flag.severity) {
        case 'critical': modifier *= 1.5; break;
        case 'danger': modifier *= 1.2; break;
        case 'warning': modifier *= 1.0; break;
        case 'info': modifier *= 0.5; break;
      }
      
      return sum + modifier;
    }, 0);

    const finalScore = baseScore + (flagModifier * 0.3);
    return Math.max(0, Math.min(10, finalScore * 10)); // Scale to 0-10
  }

  // Determine risk level based on score
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  // Check if IP is VPN or proxy
  private isVPNOrProxy(ip: string): boolean {
    // In production, use IP intelligence service
    // For demo, simulate based on IP patterns
    return ip.startsWith('10.') || ip.startsWith('192.168.');
  }

  // Check if IP is from Tor network
  private isTorNetwork(ip: string): boolean {
    // In production, check against Tor exit node lists
    const torExitNodes = ['127.0.0.1']; // Example
    return torExitNodes.includes(ip);
  }

  // Notify security team of high-risk transactions
  private async notifySecurityTeam(alert: FraudAlert): Promise<void> {
    try {
      // In production, send email/Slack notification to security team
      console.log(`🚨 HIGH RISK TRANSACTION ALERT 🚨`);
      console.log(`Alert ID: ${alert.id}`);
      console.log(`Order ID: ${alert.orderId}`);
      console.log(`Risk Level: ${alert.riskLevel} (${alert.riskScore})`);
      console.log(`Flags: ${alert.flags.map(f => f.type).join(', ')}`);
      
      // Save alert to database for review
      // await FraudAlert.create(alert);
    } catch (error) {
      console.error('Error notifying security team:', error);
    }
  }

  // Review fraud alert (admin action)
  async reviewAlert(
    alertId: string, 
    reviewerId: string, 
    action: 'clear' | 'block', 
    notes?: string
  ): Promise<boolean> {
    try {
      // In production, update alert in database
      console.log(`Alert ${alertId} ${action === 'clear' ? 'cleared' : 'confirmed'} by ${reviewerId}`);
      if (notes) console.log(`Notes: ${notes}`);
      
      return true;
    } catch (error) {
      console.error('Error reviewing alert:', error);
      return false;
    }
  }

  // Get fraud statistics
  async getFraudStats(days: number = 30): Promise<{
    totalTransactions: number;
    flaggedTransactions: number;
    blockedTransactions: number;
    falsePositiveRate: number;
    riskDistribution: { [key: string]: number };
    topFraudTypes: Array<{ type: string; count: number }>;
  }> {
    // In production, query actual fraud data
    return {
      totalTransactions: 1250,
      flaggedTransactions: 89,
      blockedTransactions: 12,
      falsePositiveRate: 8.5,
      riskDistribution: {
        low: 1089,
        medium: 72,
        high: 17,
        critical: 12
      },
      topFraudTypes: [
        { type: 'velocity', count: 23 },
        { type: 'payment', count: 18 },
        { type: 'location', count: 15 },
        { type: 'behavior', count: 12 },
        { type: 'network', count: 8 }
      ]
    };
  }

  // Machine learning model training (placeholder)
  async trainFraudModel(): Promise<void> {
    try {
      // In production, implement ML model training with historical data
      console.log('Training fraud detection model with historical data...');
      
      // Fetch historical fraud data
      // Train classification model
      // Update risk scoring algorithms
      // Save updated model
      
      console.log('Fraud detection model training completed');
    } catch (error) {
      console.error('Error training fraud model:', error);
    }
  }

  // Add IP to suspicious list
  addSuspiciousIP(ip: string): void {
    this.suspiciousIPs.add(ip);
  }

  // Remove IP from suspicious list
  removeSuspiciousIP(ip: string): void {
    this.suspiciousIPs.delete(ip);
  }

  // Add email to blocked list
  blockEmail(email: string): void {
    this.blockedEmails.add(email);
  }

  // Remove email from blocked list
  unblockEmail(email: string): void {
    this.blockedEmails.delete(email);
  }
}

export default new FraudDetectionService();