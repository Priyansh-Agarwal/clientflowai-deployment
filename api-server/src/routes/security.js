// ClientFlow AI Suite - Advanced Security & Authentication
// Two-factor authentication, SSO, and enterprise security features

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiting for security endpoints
const securityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many security attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Two-Factor Authentication Setup
router.post('/2fa/setup', securityLimiter, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: 'ClientFlow AI Suite',
      issuer: 'ClientFlow',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (encrypted)
    const encryptedSecret = await bcrypt.hash(secret.base32, 10);
    
    await supabase
      .from('user_security_settings')
      .upsert({
        user_id: userId,
        two_factor_secret: encryptedSecret,
        two_factor_enabled: false,
        backup_codes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qr_code: qrCodeUrl,
        manual_entry_key: secret.base32
      }
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup two-factor authentication'
    });
  }
});

// Verify 2FA Setup
router.post('/2fa/verify-setup', securityLimiter, async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'User ID and token required'
      });
    }

    // Get stored secret
    const { data: securitySettings } = await supabase
      .from('user_security_settings')
      .select('two_factor_secret')
      .eq('user_id', userId)
      .single();

    if (!securitySettings) {
      return res.status(404).json({
        success: false,
        error: '2FA setup not found'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: securitySettings.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    // Enable 2FA
    await supabase
      .from('user_security_settings')
      .update({
        two_factor_enabled: true,
        backup_codes: backupCodes,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    res.json({
      success: true,
      data: {
        enabled: true,
        backup_codes: backupCodes
      }
    });
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify two-factor authentication'
    });
  }
});

// Verify 2FA Login
router.post('/2fa/verify-login', securityLimiter, async (req, res) => {
  try {
    const { userId, token, rememberDevice = false } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'User ID and token required'
      });
    }

    // Get security settings
    const { data: securitySettings } = await supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!securitySettings || !securitySettings.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        error: '2FA not enabled for this user'
      });
    }

    let verified = false;

    // Check if it's a backup code
    if (securitySettings.backup_codes && securitySettings.backup_codes.includes(token)) {
      verified = true;
      // Remove used backup code
      const updatedBackupCodes = securitySettings.backup_codes.filter(code => code !== token);
      await supabase
        .from('user_security_settings')
        .update({ backup_codes: updatedBackupCodes })
        .eq('user_id', userId);
    } else {
      // Verify TOTP token
      verified = speakeasy.totp.verify({
        secret: securitySettings.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: userId,
        twoFactorVerified: true,
        rememberDevice: rememberDevice
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberDevice ? '30d' : '24h' }
    );

    // Log successful 2FA verification
    await supabase
      .from('security_logs')
      .insert({
        user_id: userId,
        action: '2fa_verification_success',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      data: {
        token: jwtToken,
        expires_in: rememberDevice ? '30d' : '24h'
      }
    });
  } catch (error) {
    console.error('Error verifying 2FA login:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify two-factor authentication'
    });
  }
});

// Disable 2FA
router.post('/2fa/disable', securityLimiter, async (req, res) => {
  try {
    const { userId, password, token } = req.body;
    
    if (!userId || !password || !token) {
      return res.status(400).json({
        success: false,
        error: 'User ID, password, and token required'
      });
    }

    // Verify password first
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Verify 2FA token
    const { data: securitySettings } = await supabase
      .from('user_security_settings')
      .select('two_factor_secret')
      .eq('user_id', userId)
      .single();

    const verified = speakeasy.totp.verify({
      secret: securitySettings.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Disable 2FA
    await supabase
      .from('user_security_settings')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    res.json({
      success: true,
      data: {
        disabled: true
      }
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable two-factor authentication'
    });
  }
});

// Single Sign-On (SSO) Integration
router.post('/sso/saml/initiate', async (req, res) => {
  try {
    const { provider, organizationId } = req.body;
    
    if (!provider || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Provider and organization ID required'
      });
    }

    // Get SSO configuration
    const { data: ssoConfig } = await supabase
      .from('sso_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (!ssoConfig) {
      return res.status(404).json({
        success: false,
        error: 'SSO configuration not found'
      });
    }

    // Generate SAML request
    const samlRequest = {
      id: `_${Math.random().toString(36).substring(2)}`,
      issueInstant: new Date().toISOString(),
      destination: ssoConfig.sso_url,
      assertionConsumerServiceURL: `${process.env.API_URL}/api/security/sso/saml/consume`,
      issuer: ssoConfig.issuer
    };

    // Store request for validation
    await supabase
      .from('sso_sessions')
      .insert({
        request_id: samlRequest.id,
        organization_id: organizationId,
        provider: provider,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      data: {
        saml_request: samlRequest,
        redirect_url: ssoConfig.sso_url
      }
    });
  } catch (error) {
    console.error('Error initiating SSO:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate SSO'
    });
  }
});

// SSO SAML Response Handler
router.post('/sso/saml/consume', async (req, res) => {
  try {
    const { SAMLResponse, RelayState } = req.body;
    
    if (!SAMLResponse) {
      return res.status(400).json({
        success: false,
        error: 'SAML response required'
      });
    }

    // Decode and validate SAML response
    const decodedResponse = Buffer.from(SAMLResponse, 'base64').toString('utf-8');
    
    // Parse SAML response (simplified - in production, use proper SAML library)
    const emailMatch = decodedResponse.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const email = emailMatch ? emailMatch[1] : null;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Invalid SAML response'
      });
    }

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email: email,
          sso_provider: 'saml',
          sso_id: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      user = newUser;
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        ssoVerified: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    console.error('Error consuming SSO response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process SSO response'
    });
  }
});

// Security Audit Logs
router.get('/audit-logs', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    let query = supabase
      .from('security_logs')
      .select(`
        *,
        users (email, name)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: logs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

// IP Whitelist Management
router.post('/ip-whitelist', async (req, res) => {
  try {
    const { ipAddress, description } = req.body;
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId || !ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and IP address required'
      });
    }

    const { data: whitelistEntry, error } = await supabase
      .from('ip_whitelist')
      .insert({
        organization_id: orgId,
        ip_address: ipAddress,
        description: description || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: whitelistEntry
    });
  } catch (error) {
    console.error('Error adding IP to whitelist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add IP to whitelist'
    });
  }
});

// Session Management
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: sessions || []
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

// Revoke Session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and session ID required'
      });
    }

    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    res.json({
      success: true,
      data: {
        revoked: true
      }
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
});

module.exports = router;
