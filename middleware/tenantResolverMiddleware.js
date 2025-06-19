// middleware/tenantResolverMiddleware.js

const tenantResolverMiddleware = (req, res, next) => {
    // This middleware expects authMiddleware to have successfully run prior,
    // populating req.user with user details including 'tenant' (the tenant_code).

    if (req.user && req.user.tenant) {
        // If the request is authenticated and tenant info is available from the JWT,
        // set req.tenant to be consistently used throughout the API.
        req.tenant = req.user.tenant;
        next(); // Proceed to the next middleware or route handler
    } else {
        // This scenario should ideally not be hit if middleware is correctly applied
        // to only authenticated routes *after* authMiddleware.
        // It implies either:
        // 1. authMiddleware failed or didn't run (route configuration error).
        // 2. An unauthenticated route is trying to access tenant-scoped data without providing tenant context.
        //    (However, per your latest clarification, login doesn't need X-Tenant-Id,
        //    and createUser is now authenticated, so this case is for misconfigured routes).
        console.warn('tenantResolverMiddleware: req.user or req.user.tenant not found. Route may be misconfigured or missing authentication.');
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Tenant context could not be resolved from authentication token.'
        });
    }
};

module.exports = tenantResolverMiddleware;