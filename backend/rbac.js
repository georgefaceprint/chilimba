// Define explicit application permissions matrix
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',       // You (Full oversight, manual payouts, system overrides)
  SUPPLIER: 'SUPPLIER',             // Vetted sellers in SA / Tanzania (Can mark "Ready for Dispatch")
  RUNNER: 'RUNNER',                 // Freight / Border handlers (Can mark "Loaded for Transit")
  DEPOT_MANAGER: 'DEPOT_MANAGER',   // Staff in Chililabombwe, Chingola, Kasumbalesa (Can release goods)
  CUSTOMER: 'CUSTOMER'              // The shoppers / Chilimba group members (Read-only tracking)
};

/**
 * Higher-Order Authorization Middleware for Backend Endpoints
 * @param {Array<string>} allowedRoles 
 */
function authorizeRoute(allowedRoles) {
  return (req, res, next) => {
    // Expecting user metadata context injected via verified JWT session token
    const userSession = req.user; 

    if (!userSession) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (!allowedRoles.includes(userSession.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Action restricted to roles: [${allowedRoles.join(', ')}]` 
      });
    }

    // User has permission, continue down execution path safely
    next();
  };
}

module.exports = {
  ROLES,
  authorizeRoute
};
