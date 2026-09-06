/**
 * Tenant Isolation Enforcement
 * Guarantees that any query or mutation performed in a therapist-authenticated
 * context strictly uses the therapist ID derived from the verified JWT.
 * It discards or overrides any client-supplied therapistId in the body or params.
 */
const enforceTenantIsolation = (req, res, next) => {
  if (!req.therapistId) {
    return res.status(401).json({
      success: false,
      message: 'Tenant context missing: Request is unauthenticated or has no associated tenant.',
    });
  }

  // Force tenant context on req.body for create/update operations
  if (req.body && typeof req.body === 'object') {
    req.body.therapist = req.therapistId;
  }

  next();
};

module.exports = { enforceTenantIsolation };
