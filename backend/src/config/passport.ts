// Passport configuration for social authentication
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import AuthService from '../services/authService';

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Transform Google profile to our format
      const userProfile = {
        id: profile.id,
        emails: [{ value: profile.emails?.[0]?.value || '' }],
        name: {
          givenName: profile.name?.givenName || '',
          familyName: profile.name?.familyName || ''
        },
        photos: profile.photos?.length ? [{ value: profile.photos[0].value }] : []
      };

      const result = await AuthService.socialLogin('google', userProfile);
      
      if (result.success) {
        return done(null, { user: result.user, token: result.token });
      } else {
        return done(new Error(result.message), null);
      }

    } catch (error: any) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name', 'photos']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Transform Facebook profile to our format
      const userProfile = {
        id: profile.id,
        emails: [{ value: profile.emails?.[0]?.value || '' }],
        name: {
          givenName: profile.name?.givenName || '',
          familyName: profile.name?.familyName || ''
        },
        photos: profile.photos?.length ? [{ value: profile.photos[0].value }] : []
      };

      const result = await AuthService.socialLogin('facebook', userProfile);
      
      if (result.success) {
        return done(null, { user: result.user, token: result.token });
      } else {
        return done(new Error(result.message), null);
      }

    } catch (error: any) {
      console.error('Facebook OAuth error:', error);
      return done(error, null);
    }
  }));
}

// Serialize user for session (not used with JWT, but required by Passport)
passport.serializeUser((user: any, done) => {
  done(null, user);
});

// Deserialize user from session (not used with JWT, but required by Passport)
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;