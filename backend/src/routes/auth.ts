// Authentication routes with JWT, OAuth, and 2FA support
import express, { Request, Response } from 'express';
import passport from 'passport';
import AuthService from '../services/authService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, marketingOptIn } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      marketingOptIn
    });

    if (result.success) {
      // Set JWT cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        success: true,
        user: result.user,
        message: result.message
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// Login with email and password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password);

    if (result.success) {
      // Set JWT cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        user: result.user,
        message: result.message
      });
    } else if (result.requiresTwoFactor) {
      // Store temporary token for 2FA verification
      res.cookie('tempToken', result.tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.json({
        success: false,
        requiresTwoFactor: true,
        message: result.message
      });
    } else {
      res.status(401).json(result);
    }

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// Verify two-factor authentication
router.post('/verify-2fa', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const tempToken = req.cookies.tempToken;

    if (!code || !tempToken) {
      return res.status(400).json({
        success: false,
        message: 'Authentication code and temporary token are required'
      });
    }

    const result = await AuthService.verifyTwoFactor(tempToken, code);

    if (result.success) {
      // Clear temporary token and set permanent token
      res.clearCookie('tempToken');
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        user: result.user,
        message: result.message
      });
    } else {
      res.status(401).json(result);
    }

  } catch (error: any) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Two-factor verification failed. Please try again.'
    });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.clearCookie('tempToken');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Setup two-factor authentication
router.post('/setup-2fa', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const setup = await AuthService.setupTwoFactor(userId);
    
    if (setup) {
      res.json({
        success: true,
        secret: setup.secret,
        qrCode: setup.qrCode,
        backupCodes: setup.backupCodes
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to setup two-factor authentication'
      });
    }

  } catch (error: any) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Two-factor setup failed. Please try again.'
    });
  }
});

// Enable two-factor authentication
router.post('/enable-2fa', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user?.userId;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Authentication code is required'
      });
    }

    const success = await AuthService.enableTwoFactor(userId, code);

    if (success) {
      res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid authentication code'
      });
    }

  } catch (error: any) {
    console.error('2FA enable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable two-factor authentication'
    });
  }
});

// Disable two-factor authentication
router.post('/disable-2fa', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const userId = req.user?.userId;

    if (!password || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable two-factor authentication'
      });
    }

    const success = await AuthService.disableTwoFactor(userId, password);

    if (success) {
      res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

  } catch (error: any) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable two-factor authentication'
    });
  }
});

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await AuthService.forgotPassword(email);
    res.json(result);

  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed. Please try again.'
    });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const result = await AuthService.resetPassword(token, newPassword);

    if (result.success) {
      // Set JWT cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        user: result.user,
        message: result.message
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again.'
    });
  }
});

// Verify email
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const result = await AuthService.verifyEmail(token);

    if (result.success) {
      // Redirect to frontend with success message
      res.redirect(`${process.env.FRONTEND_URL}/auth/verify-success`);
    } else {
      // Redirect to frontend with error message
      res.redirect(`${process.env.FRONTEND_URL}/auth/verify-error`);
    }

  } catch (error: any) {
    console.error('Email verification error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/verify-error`);
  }
});

// Change password (for authenticated users)
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!newPassword || !userId) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const result = await AuthService.changePassword(userId, currentPassword, newPassword);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed. Please try again.'
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const result = await AuthService.refreshToken(token);

    if (result.success) {
      // Set new JWT cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        user: result.user,
        message: result.message
      });
    } else {
      res.status(401).json(result);
    }

  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed. Please try again.'
    });
  }
});

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_failed`
  }),
  (req: Request, res: Response) => {
    try {
      const authData = req.user as any;
      
      if (authData?.token) {
        // Set JWT cookie
        res.cookie('token', authData.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect to frontend dashboard
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=google_failed`);
      }

    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=google_failed`);
    }
  }
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'],
    session: false 
  })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=facebook_failed`
  }),
  (req: Request, res: Response) => {
    try {
      const authData = req.user as any;
      
      if (authData?.token) {
        // Set JWT cookie
        res.cookie('token', authData.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect to frontend dashboard
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=facebook_failed`);
      }

    } catch (error: any) {
      console.error('Facebook OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=facebook_failed`);
    }
  }
);

export default router;