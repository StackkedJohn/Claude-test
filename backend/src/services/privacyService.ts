import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';

interface ConsentRecord {
  id: string;
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  consent: {
    necessary: boolean;
    functional: boolean;
    analytics: boolean;
    advertising: boolean;
    preferences: boolean;
  };
  complianceType: 'GDPR' | 'CCPA' | 'GENERAL';
  timestamp: Date;
  consentMethod: 'banner' | 'settings' | 'api';
  withdrawn?: boolean;
  withdrawnAt?: Date;
}

interface DataRequest {
  id: string;
  userId: string;
  email: string;
  requestType: 'ACCESS' | 'DELETE' | 'PORTABILITY' | 'RECTIFICATION' | 'RESTRICTION' | 'OBJECTION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  requestDate: Date;
  completionDate?: Date;
  reason?: string;
  verificationCode?: string;
  verificationExpiry?: Date;
  complianceDeadline: Date;
}

interface PersonalDataExport {
  userId: string;
  exportDate: Date;
  data: {
    profile: any;
    orders: any[];
    reviews: any[];
    wishlist: any[];
    browsing_history: any[];
    consent_records: ConsentRecord[];
    support_tickets: any[];
  };
  format: 'JSON' | 'CSV' | 'PDF';
  downloadUrl: string;
  expiresAt: Date;
}

class PrivacyService {
  private consentRecords: ConsentRecord[] = [];
  private dataRequests: DataRequest[] = [];
  private exports: PersonalDataExport[] = [];

  // Record user consent
  async recordConsent(req: Request, consentData: any): Promise<string> {
    try {
      const consentId = `consent_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const consent: ConsentRecord = {
        id: consentId,
        userId: req.user?.id,
        sessionId: req.sessionID || crypto.randomBytes(16).toString('hex'),
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        consent: consentData.consent,
        complianceType: consentData.complianceType || 'GENERAL',
        timestamp: new Date(),
        consentMethod: consentData.method || 'banner',
        withdrawn: false
      };

      this.consentRecords.push(consent);

      // In production, save to database with encryption
      console.log('Consent recorded:', consentId);

      // Update user profile if logged in
      if (req.user?.id) {
        await this.updateUserConsentPreferences(req.user.id, consent.consent);
      }

      return consentId;
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  }

  // Withdraw consent
  async withdrawConsent(userId: string, consentId?: string): Promise<boolean> {
    try {
      let updated = false;

      if (consentId) {
        // Withdraw specific consent
        const consent = this.consentRecords.find(c => c.id === consentId && c.userId === userId);
        if (consent) {
          consent.withdrawn = true;
          consent.withdrawnAt = new Date();
          updated = true;
        }
      } else {
        // Withdraw all consent for user
        this.consentRecords
          .filter(c => c.userId === userId && !c.withdrawn)
          .forEach(consent => {
            consent.withdrawn = true;
            consent.withdrawnAt = new Date();
            updated = true;
          });
      }

      if (updated) {
        // Clear analytics and advertising cookies
        await this.clearUserCookies(userId);
        console.log('Consent withdrawn for user:', userId);
      }

      return updated;
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      return false;
    }
  }

  // Handle GDPR/CCPA data requests
  async submitDataRequest(
    email: string, 
    requestType: DataRequest['requestType'], 
    reason?: string
  ): Promise<string> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const verificationCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      // Calculate compliance deadline
      let deadlineDays = 30; // Default
      if (requestType === 'ACCESS' || requestType === 'PORTABILITY') {
        deadlineDays = 30; // GDPR: 1 month
      } else if (requestType === 'DELETE') {
        deadlineDays = 30; // GDPR: Without undue delay, max 1 month
      }

      const dataRequest: DataRequest = {
        id: requestId,
        userId: user._id.toString(),
        email,
        requestType,
        status: 'PENDING',
        requestDate: new Date(),
        reason,
        verificationCode,
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        complianceDeadline: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000)
      };

      this.dataRequests.push(dataRequest);

      // Send verification email
      await this.sendVerificationEmail(email, verificationCode, requestType);

      console.log('Data request submitted:', requestId);
      return requestId;
    } catch (error) {
      console.error('Error submitting data request:', error);
      throw error;
    }
  }

  // Verify data request
  async verifyDataRequest(requestId: string, verificationCode: string): Promise<boolean> {
    try {
      const request = this.dataRequests.find(r => r.id === requestId);
      
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.verificationExpiry && request.verificationExpiry < new Date()) {
        throw new Error('Verification code expired');
      }

      if (request.verificationCode !== verificationCode) {
        throw new Error('Invalid verification code');
      }

      request.status = 'IN_PROGRESS';
      
      // Process the request based on type
      await this.processDataRequest(request);

      return true;
    } catch (error) {
      console.error('Error verifying data request:', error);
      return false;
    }
  }

  // Process verified data request
  private async processDataRequest(request: DataRequest): Promise<void> {
    try {
      switch (request.requestType) {
        case 'ACCESS':
          await this.generateDataExport(request.userId, 'JSON');
          break;
          
        case 'PORTABILITY':
          await this.generateDataExport(request.userId, 'JSON');
          break;
          
        case 'DELETE':
          await this.deleteUserData(request.userId);
          break;
          
        case 'RECTIFICATION':
          // Would typically require additional user input for corrections
          console.log('Rectification request requires manual processing');
          break;
          
        case 'RESTRICTION':
          await this.restrictUserDataProcessing(request.userId);
          break;
          
        case 'OBJECTION':
          await this.handleDataProcessingObjection(request.userId);
          break;
      }

      request.status = 'COMPLETED';
      request.completionDate = new Date();

      // Send completion notification
      await this.sendCompletionNotification(request);
    } catch (error) {
      request.status = 'REJECTED';
      request.reason = error instanceof Error ? error.message : 'Processing failed';
      console.error('Error processing data request:', error);
    }
  }

  // Generate data export for user
  async generateDataExport(userId: string, format: 'JSON' | 'CSV' | 'PDF' = 'JSON'): Promise<string> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Collect all user data
      const userData = {
        profile: {
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          preferences: user.preferences,
          addresses: user.addresses
        },
        orders: [], // Would fetch from Order model
        reviews: [], // Would fetch from Review model
        wishlist: user.wishlist || [],
        browsing_history: [], // Would fetch from analytics
        consent_records: this.consentRecords.filter(c => c.userId === userId),
        support_tickets: [] // Would fetch from support system
      };

      const exportId = `export_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const downloadUrl = `/api/privacy/download/${exportId}`;

      const dataExport: PersonalDataExport = {
        userId,
        exportDate: new Date(),
        data: userData,
        format,
        downloadUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      this.exports.push(dataExport);

      // In production, generate secure download link and store encrypted data
      console.log('Data export generated:', exportId);

      return downloadUrl;
    } catch (error) {
      console.error('Error generating data export:', error);
      throw error;
    }
  }

  // Delete user data (Right to be forgotten)
  async deleteUserData(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Mark user for deletion (soft delete to maintain referential integrity)
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.email = `deleted_${Date.now()}@example.com`; // Anonymize email
      user.name = 'Deleted User';
      
      // Clear personal data
      user.addresses = [];
      user.phone = undefined;
      user.dateOfBirth = undefined;
      user.preferences = {};
      
      await user.save();

      // Anonymize related data
      // In production, would update orders, reviews, etc. to remove personal identifiers
      
      console.log('User data deleted/anonymized:', userId);
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  // Restrict data processing
  async restrictUserDataProcessing(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Mark user data as restricted
      user.dataProcessingRestricted = true;
      user.restrictionDate = new Date();
      await user.save();

      // Stop all non-essential processing
      await this.withdrawConsent(userId);

      console.log('Data processing restricted for user:', userId);
    } catch (error) {
      console.error('Error restricting data processing:', error);
      throw error;
    }
  }

  // Handle objection to data processing
  async handleDataProcessingObjection(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Stop marketing and profiling activities
      user.marketingOptOut = true;
      user.profilingOptOut = true;
      user.objectionDate = new Date();
      await user.save();

      // Withdraw marketing consent
      await this.withdrawConsent(userId);

      console.log('Data processing objection handled for user:', userId);
    } catch (error) {
      console.error('Error handling objection:', error);
      throw error;
    }
  }

  // Update user consent preferences
  private async updateUserConsentPreferences(userId: string, consent: ConsentRecord['consent']): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.consentPreferences = {
          ...user.consentPreferences,
          ...consent,
          updatedAt: new Date()
        };
        await user.save();
      }
    } catch (error) {
      console.error('Error updating user consent preferences:', error);
    }
  }

  // Clear user cookies
  private async clearUserCookies(userId: string): Promise<void> {
    try {
      // In production, would integrate with cookie management system
      console.log('Cookies cleared for user:', userId);
    } catch (error) {
      console.error('Error clearing cookies:', error);
    }
  }

  // Send verification email
  private async sendVerificationEmail(
    email: string, 
    verificationCode: string, 
    requestType: DataRequest['requestType']
  ): Promise<void> {
    try {
      // In production, use email service
      console.log(`Verification email sent to ${email}: ${verificationCode} for ${requestType}`);
      
      // Mock email content
      const emailContent = {
        to: email,
        subject: `Verify Your ${requestType} Request - ICEPACA`,
        html: `
          <h2>Verify Your Privacy Request</h2>
          <p>We received a ${requestType.toLowerCase()} request for your personal data.</p>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 24 hours.</p>
          <p>If you did not make this request, please ignore this email.</p>
        `
      };
      
      // Would send via email service
    } catch (error) {
      console.error('Error sending verification email:', error);
    }
  }

  // Send completion notification
  private async sendCompletionNotification(request: DataRequest): Promise<void> {
    try {
      // In production, use email service
      console.log(`Completion notification sent for request: ${request.id}`);
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  // Get compliance dashboard data
  async getComplianceDashboard(): Promise<any> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentConsents = this.consentRecords.filter(c => c.timestamp >= thirtyDaysAgo);
      const recentRequests = this.dataRequests.filter(r => r.requestDate >= thirtyDaysAgo);

      // Calculate consent analytics
      const consentStats = {
        total: this.consentRecords.length,
        recent: recentConsents.length,
        byType: {
          GDPR: this.consentRecords.filter(c => c.complianceType === 'GDPR').length,
          CCPA: this.consentRecords.filter(c => c.complianceType === 'CCPA').length,
          GENERAL: this.consentRecords.filter(c => c.complianceType === 'GENERAL').length
        },
        withdrawn: this.consentRecords.filter(c => c.withdrawn).length,
        categoryAcceptance: {
          functional: this.consentRecords.filter(c => c.consent.functional).length,
          analytics: this.consentRecords.filter(c => c.consent.analytics).length,
          advertising: this.consentRecords.filter(c => c.consent.advertising).length,
          preferences: this.consentRecords.filter(c => c.consent.preferences).length
        }
      };

      // Calculate request statistics
      const requestStats = {
        total: this.dataRequests.length,
        recent: recentRequests.length,
        byType: {
          ACCESS: this.dataRequests.filter(r => r.requestType === 'ACCESS').length,
          DELETE: this.dataRequests.filter(r => r.requestType === 'DELETE').length,
          PORTABILITY: this.dataRequests.filter(r => r.requestType === 'PORTABILITY').length,
          RECTIFICATION: this.dataRequests.filter(r => r.requestType === 'RECTIFICATION').length,
          RESTRICTION: this.dataRequests.filter(r => r.requestType === 'RESTRICTION').length,
          OBJECTION: this.dataRequests.filter(r => r.requestType === 'OBJECTION').length
        },
        byStatus: {
          PENDING: this.dataRequests.filter(r => r.status === 'PENDING').length,
          IN_PROGRESS: this.dataRequests.filter(r => r.status === 'IN_PROGRESS').length,
          COMPLETED: this.dataRequests.filter(r => r.status === 'COMPLETED').length,
          REJECTED: this.dataRequests.filter(r => r.status === 'REJECTED').length
        }
      };

      // Compliance alerts
      const alerts = [];
      
      // Check for overdue requests
      const overdueRequests = this.dataRequests.filter(r => 
        r.status !== 'COMPLETED' && r.complianceDeadline < now
      );
      
      if (overdueRequests.length > 0) {
        alerts.push({
          type: 'warning',
          message: `${overdueRequests.length} data requests are overdue`,
          count: overdueRequests.length
        });
      }

      // Check for requests nearing deadline
      const nearDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const urgentRequests = this.dataRequests.filter(r => 
        r.status !== 'COMPLETED' && r.complianceDeadline <= nearDeadline
      );
      
      if (urgentRequests.length > 0) {
        alerts.push({
          type: 'info',
          message: `${urgentRequests.length} data requests are due within 7 days`,
          count: urgentRequests.length
        });
      }

      return {
        consentStats,
        requestStats,
        alerts,
        recentActivity: [
          ...recentConsents.slice(0, 10).map(c => ({
            type: 'consent',
            date: c.timestamp,
            description: `User ${c.withdrawn ? 'withdrew' : 'gave'} consent`,
            compliance: c.complianceType
          })),
          ...recentRequests.slice(0, 10).map(r => ({
            type: 'request',
            date: r.requestDate,
            description: `${r.requestType} request ${r.status.toLowerCase()}`,
            urgency: r.complianceDeadline < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) ? 'high' : 'normal'
          }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20)
      };
    } catch (error) {
      console.error('Error generating compliance dashboard:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Check if service is functioning
      return true;
    } catch (error) {
      console.error('Privacy service health check failed:', error);
      return false;
    }
  }
}

export default new PrivacyService();