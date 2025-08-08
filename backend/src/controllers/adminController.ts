import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { AnalyticsService } from '../services/analyticsService';
import { NotificationService } from '../services/notificationService';

interface DashboardMetrics {
  sales: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueGrowth: number;
    ordersToday: number;
    revenueToday: number;
  };
  inventory: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    inventoryValue: number;
    topSellingProducts: Array<{
      id: string;
      name: string;
      unitsSold: number;
      revenue: number;
    }>;
  };
  customers: {
    totalCustomers: number;
    newCustomersToday: number;
    returningCustomers: number;
    customerLifetimeValue: number;
    topCustomers: Array<{
      id: string;
      name: string;
      totalOrders: number;
      totalSpent: number;
    }>;
  };
  performance: {
    siteUptime: number;
    averageResponseTime: number;
    errorRate: number;
    conversionRate: number;
    abandondedCartRate: number;
  };
  security: {
    loginAttempts: number;
    failedLogins: number;
    blockedIPs: string[];
    securityAlerts: Array<{
      timestamp: Date;
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
  };
}

interface Alert {
  id: string;
  type: 'inventory' | 'sales' | 'security' | 'performance' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired: boolean;
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
  };
}

class AdminController {
  private analyticsService = new AnalyticsService();
  private notificationService = new NotificationService();

  // Get comprehensive dashboard metrics
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const timeframe = req.query.timeframe as string || '30d';
      const startDate = this.getStartDate(timeframe);
      const endDate = new Date();

      const [salesData, inventoryData, customerData, performanceData, securityData] = await Promise.all([
        this.getSalesMetrics(startDate, endDate),
        this.getInventoryMetrics(),
        this.getCustomerMetrics(startDate, endDate),
        this.getPerformanceMetrics(startDate, endDate),
        this.getSecurityMetrics(startDate, endDate)
      ]);

      const metrics: DashboardMetrics = {
        sales: salesData,
        inventory: inventoryData,
        customers: customerData,
        performance: performanceData,
        security: securityData
      };

      res.json({
        success: true,
        data: metrics,
        timeframe,
        generatedAt: new Date()
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard metrics'
      });
    }
  }

  // Get real-time alerts
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const severity = req.query.severity as string;
      const acknowledged = req.query.acknowledged as string;
      const limit = parseInt(req.query.limit as string) || 50;

      let query: any = {};
      if (severity) query.severity = severity;
      if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';

      // Generate current alerts
      const alerts = await this.generateCurrentAlerts();
      
      // Filter alerts based on query parameters
      let filteredAlerts = alerts;
      if (severity) {
        filteredAlerts = alerts.filter(alert => alert.severity === severity);
      }
      if (acknowledged !== undefined) {
        const isAcknowledged = acknowledged === 'true';
        filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged === isAcknowledged);
      }

      // Sort by timestamp (newest first) and limit
      filteredAlerts = filteredAlerts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      res.json({
        success: true,
        data: {
          alerts: filteredAlerts,
          totalCount: alerts.length,
          unacknowledgedCount: alerts.filter(a => !a.acknowledged).length,
          criticalCount: alerts.filter(a => a.severity === 'critical').length
        }
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch alerts'
      });
    }
  }

  // Acknowledge alert
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy, note } = req.body;

      // In production, update alert in database
      console.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}${note ? ` with note: ${note}` : ''}`);

      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert'
      });
    }
  }

  // Get sales analytics
  async getSalesAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const timeframe = req.query.timeframe as string || '30d';
      const groupBy = req.query.groupBy as string || 'day';

      const data = await this.analyticsService.getSalesAnalytics(timeframe, groupBy);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales analytics'
      });
    }
  }

  // Get inventory alerts
  async getInventoryAlerts(req: Request, res: Response): Promise<void> {
    try {
      const lowStockThreshold = parseInt(req.query.threshold as string) || 10;
      
      const products = await Product.find({
        $or: [
          { stock: { $lte: lowStockThreshold } },
          { stock: 0 }
        ]
      }).select('name stock price category');

      const alerts = products.map(product => ({
        id: `inventory_${product._id}`,
        type: 'inventory' as const,
        severity: product.stock === 0 ? 'critical' as const : 'warning' as const,
        title: product.stock === 0 ? 'Out of Stock' : 'Low Stock',
        message: `${product.name} has ${product.stock} units remaining`,
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: true,
        relatedEntity: {
          type: 'product',
          id: product._id.toString(),
          name: product.name
        }
      }));

      res.json({
        success: true,
        data: {
          alerts,
          summary: {
            total: alerts.length,
            outOfStock: alerts.filter(a => a.severity === 'critical').length,
            lowStock: alerts.filter(a => a.severity === 'warning').length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory alerts'
      });
    }
  }

  // Get user activity logs
  async getUserActivityLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const userId = req.query.userId as string;
      const action = req.query.action as string;

      // In production, fetch from activity log collection
      const mockLogs = this.generateMockActivityLogs();

      let filteredLogs = mockLogs;
      if (userId) {
        filteredLogs = mockLogs.filter(log => log.userId === userId);
      }
      if (action) {
        filteredLogs = filteredLogs.filter(log => log.action === action);
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          logs: paginatedLogs,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(filteredLogs.length / limit),
            totalItems: filteredLogs.length,
            itemsPerPage: limit
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity logs'
      });
    }
  }

  // Get system health metrics
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date(),
        services: {
          database: {
            status: 'healthy',
            responseTime: 12,
            connections: 5
          },
          cache: {
            status: 'healthy',
            responseTime: 2,
            hitRate: 0.95
          },
          storage: {
            status: 'healthy',
            usage: 0.65,
            available: '50GB'
          },
          external: {
            paymentGateway: { status: 'healthy', responseTime: 150 },
            emailService: { status: 'healthy', responseTime: 300 },
            cdn: { status: 'healthy', responseTime: 45 }
          }
        },
        performance: {
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          activeHandles: process._getActiveHandles().length,
          activeRequests: process._getActiveRequests().length
        }
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system health'
      });
    }
  }

  // Send test notification
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const { type, channel, message } = req.body;

      await this.notificationService.sendNotification({
        type,
        channel,
        message,
        timestamp: new Date(),
        priority: 'normal'
      });

      res.json({
        success: true,
        message: 'Test notification sent successfully'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  }

  // Private helper methods
  private async getSalesMetrics(startDate: Date, endDate: Date): Promise<DashboardMetrics['sales']> {
    // In production, these would be actual database queries
    const totalOrders = 156;
    const totalRevenue = 12450.80;
    
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalRevenue / totalOrders,
      revenueGrowth: 15.5,
      ordersToday: 8,
      revenueToday: 892.40
    };
  }

  private async getInventoryMetrics(): Promise<DashboardMetrics['inventory']> {
    // Mock data - in production, query actual inventory
    return {
      totalProducts: 24,
      lowStockProducts: 3,
      outOfStockProducts: 1,
      inventoryValue: 28500.00,
      topSellingProducts: [
        { id: 'medium-pack', name: 'Medium Ice Pack', unitsSold: 45, revenue: 1347.55 },
        { id: 'large-pack', name: 'Large Ice Pack', unitsSold: 32, revenue: 1247.68 },
        { id: 'small-pack', name: 'Small Ice Pack', unitsSold: 67, revenue: 1338.33 }
      ]
    };
  }

  private async getCustomerMetrics(startDate: Date, endDate: Date): Promise<DashboardMetrics['customers']> {
    return {
      totalCustomers: 1247,
      newCustomersToday: 12,
      returningCustomers: 892,
      customerLifetimeValue: 89.45,
      topCustomers: [
        { id: 'customer-1', name: 'John Doe', totalOrders: 8, totalSpent: 456.78 },
        { id: 'customer-2', name: 'Jane Smith', totalOrders: 6, totalSpent: 389.22 },
        { id: 'customer-3', name: 'Bob Johnson', totalOrders: 5, totalSpent: 298.45 }
      ]
    };
  }

  private async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<DashboardMetrics['performance']> {
    return {
      siteUptime: 99.9,
      averageResponseTime: 245,
      errorRate: 0.02,
      conversionRate: 3.4,
      abandondedCartRate: 68.5
    };
  }

  private async getSecurityMetrics(startDate: Date, endDate: Date): Promise<DashboardMetrics['security']> {
    return {
      loginAttempts: 1456,
      failedLogins: 23,
      blockedIPs: ['192.168.1.100', '10.0.0.50'],
      securityAlerts: [
        {
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          type: 'brute_force_attempt',
          severity: 'high',
          description: 'Multiple failed login attempts from IP 192.168.1.100'
        },
        {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          type: 'suspicious_activity',
          severity: 'medium',
          description: 'Unusual access pattern detected for user ID 12345'
        }
      ]
    };
  }

  private async generateCurrentAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Inventory alerts
    alerts.push({
      id: 'inv-001',
      type: 'inventory',
      severity: 'critical',
      title: 'Product Out of Stock',
      message: 'Large Ice Pack is completely out of stock',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      acknowledged: false,
      actionRequired: true,
      relatedEntity: {
        type: 'product',
        id: 'large-pack',
        name: 'Large Ice Pack'
      }
    });

    // Security alerts
    alerts.push({
      id: 'sec-001',
      type: 'security',
      severity: 'warning',
      title: 'Failed Login Attempts',
      message: '5 failed login attempts in the last hour',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      acknowledged: false,
      actionRequired: true
    });

    // Performance alerts
    alerts.push({
      id: 'perf-001',
      type: 'performance',
      severity: 'info',
      title: 'High Response Time',
      message: 'Average response time increased to 450ms',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      acknowledged: true,
      actionRequired: false
    });

    return alerts;
  }

  private generateMockActivityLogs() {
    return [
      {
        id: '1',
        userId: 'user-123',
        userEmail: 'john@example.com',
        action: 'login',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { loginMethod: 'password' }
      },
      {
        id: '2',
        userId: 'user-456',
        userEmail: 'jane@example.com',
        action: 'purchase',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        details: { orderId: 'order-789', amount: 49.99 }
      }
    ];
  }

  private getStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1d': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

export default new AdminController();