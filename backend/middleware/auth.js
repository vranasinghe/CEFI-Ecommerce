const supabase = require('../supabaseClient');

/**
 * Express middleware to verify Supabase JWT token from Authorization header.
 * Use this to protect sensitive routes (e.g., POST/PUT/DELETE /api/products).
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
    }

    const token = authHeader.split(' ')[1];
    
    // If Supabase client is initialized, verify the token with it
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
      }

      // Attach user object to request
      req.user = user;
      return next();
    } else {
      // For local dev/mockData environment without Supabase
      // In a real scenario without Supabase, we would verify a standard JWT here (Module 1).
      // For now, we reject if there's no Supabase but auth is required.
      return res.status(501).json({ success: false, message: 'Authentication verification is currently only supported via Supabase in this environment.' });
    }
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
};

module.exports = {
  requireAuth
};
