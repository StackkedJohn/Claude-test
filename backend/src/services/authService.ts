// Authentication service with JWT, OAuth, and 2FA support
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User, IUser } from '../models/User';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  success: boolean;
  user?: IUser;
  token?: string;
  message?: string;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

class AuthService {
  private jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  private jwtExpiry = process.env.JWT_EXPIRY || '7d';
  private tempTokenExpiry = '15m';

  // Generate JWT token
  generateToken(user: IUser, temporary = false): string {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      temporary
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: temporary ? this.tempTokenExpiry : this.jwtExpiry
    });
  }

  // Verify JWT token
  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  // Register new user
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    marketingOptIn?: boolean;
  }): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'An account with this email already exists'
        };
      }

      // Create new user
      const user = new User({
        email: userData.email.toLowerCase(),
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        preferences: {
          ...new User().preferences,
          marketingEmails: userData.marketingOptIn || false,
          newsletter: userData.marketingOptIn || false
        },
        registrationSource: 'email'
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        success: true,
        user,
        token,
        message: 'Account created successfully'
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  // Login with email and password
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const user = await User.findByEmail(email);
      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        const tempToken = this.generateToken(user, true);
        return {
          success: false,
          requiresTwoFactor: true,
          tempToken,
          message: 'Two-factor authentication required'
        };
      }

      // Update login statistics
      user.lastLoginAt = new Date();
      user.loginCount += 1;
      await user.save();

      const token = this.generateToken(user);

      return {
        success: true,
        user,
        token,
        message: 'Login successful'
      };

    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // Verify two-factor authentication code
  async verifyTwoFactor(tempToken: string, code: string): Promise<AuthResult> {
    try {
      const payload = this.verifyToken(tempToken);
      if (!payload || !payload.temporary) {
        return {
          success: false,
          message: 'Invalid or expired token'
        };
      }

      const user = await User.findById(payload.userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return {
          success: false,
          message: 'Two-factor authentication not set up'
        };
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow for time drift
      });

      if (!verified) {
        // Check backup codes
        if (user.backupCodes && user.backupCodes.includes(code)) {
          // Remove used backup code
          user.backupCodes = user.backupCodes.filter(backupCode => backupCode !== code);
          await user.save();
        } else {
          return {
            success: false,
            message: 'Invalid authentication code'
          };
        }
      }

      // Update login statistics
      user.lastLoginAt = new Date();
      user.loginCount += 1;
      await user.save();

      const token = this.generateToken(user);

      return {
        success: true,
        user,
        token,
        message: 'Two-factor authentication successful'
      };

    } catch (error: any) {
      console.error('Two-factor verification error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.'
      };
    }
  }

  // Setup two-factor authentication
  async setupTwoFactor(userId: string): Promise<TwoFactorSetup | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `ICEPACA (${user.email})`,
        issuer: 'ICEPACA'
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      // Save secret (but don't enable 2FA yet)
      user.twoFactorSecret = secret.base32;
      user.backupCodes = backupCodes;
      await user.save();

      return {
        secret: secret.base32!,
        qrCode,
        backupCodes
      };

    } catch (error: any) {
      console.error('Two-factor setup error:', error);
      return null;
    }
  }

  // Enable two-factor authentication
  async enableTwoFactor(userId: string, code: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.twoFactorSecret) {
        return false;
      }

      // Verify the code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (verified) {
        user.twoFactorEnabled = true;
        await user.save();
        return true;
      }

      return false;

    } catch (error: any) {
      console.error('Two-factor enable error:', error);
      return false;
    }
  }

  // Disable two-factor authentication
  async disableTwoFactor(userId: string, password: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return false;
      }

      // Disable 2FA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      user.backupCodes = undefined;
      await user.save();

      return true;

    } catch (error: any) {
      console.error('Two-factor disable error:', error);
      return false;
    }
  }

  // Social login (Google/Facebook)
  async socialLogin(provider: 'google' | 'facebook', profile: any): Promise<AuthResult> {
    try {
      const socialIdField = provider === 'google' ? 'googleId' : 'facebookId';
      
      // Check if user exists with social ID
      let user = await User.findBySocialId(provider, profile.id);
      
      if (!user) {
        // Check if user exists with same email
        user = await User.findByEmail(profile.emails[0].value);
        
        if (user) {
          // Link social account to existing user
          (user as any)[socialIdField] = profile.id;
        } else {
          // Create new user
          user = new User({
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            avatar: profile.photos?.[0]?.value,
            emailVerified: true, // Social accounts are pre-verified
            isVerified: true,
            registrationSource: provider,
            [socialIdField]: profile.id
          });
        }
        
        await user.save();
      }

      // Update login statistics
      user.lastLoginAt = new Date();
      user.loginCount += 1;
      await user.save();

      const token = this.generateToken(user);

      return {
        success: true,
        user,
        token,
        message: `${provider} login successful`
      };

    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      return {
        success: false,
        message: `${provider} login failed. Please try again.`
      };
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findByEmail(email);
      if (!user || !user.isActive) {
        // Don't reveal whether email exists
        return {
          success: true,
          message: 'If an account with that email exists, you will receive a password reset link.'
        };
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user._id.toString(), type: 'password_reset' },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      // In production, send email with reset link
      // await emailService.sendPasswordReset(user.email, resetToken);

      return {
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link.'
      };

    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'Password reset failed. Please try again.'
      };
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      
      if (payload.type !== 'password_reset') {
        return {
          success: false,
          message: 'Invalid reset token'
        };
      }

      const user = await User.findById(payload.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Update password
      user.password = newPassword;
      await user.save();

      const authToken = this.generateToken(user);

      return {
        success: true,
        user,
        token: authToken,
        message: 'Password reset successful'
      };

    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findOne({ emailVerificationToken: token });
      if (!user) {
        return {
          success: false,
          message: 'Invalid verification token'
        };
      }

      user.emailVerified = true;
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error: any) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: 'Email verification failed'
      };
    }
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify current password (skip for social login users)
      if (user.password) {
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
          return {
            success: false,
            message: 'Current password is incorrect'
          };
        }
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Password change failed'
      };
    }
  }

  // Refresh token
  async refreshToken(token: string): Promise<AuthResult> {
    try {
      const payload = this.verifyToken(token);
      if (!payload) {
        return {
          success: false,
          message: 'Invalid token'
        };
      }

      const user = await User.findById(payload.userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'User not found or inactive'
        };
      }

      const newToken = this.generateToken(user);

      return {
        success: true,
        user,
        token: newToken,
        message: 'Token refreshed successfully'
      };

    } catch (error: any) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }
}

export default new AuthService();