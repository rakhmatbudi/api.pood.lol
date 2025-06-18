// middleware/tempTenantMiddleware.js
const getTempTenantId = (req, res, next) => {
    // For testing, you can use a fixed tenant ID
    // In a real app, this would come from auth (e.g., req.user.tenantId)
    // or a trusted header.
    const tempTenantId = req.headers['x-tenant-id'] || 'serendipity-jag'; // Fallback to a default if header not provided

    if (!tempTenantId) {
        return res.status(400).json({
            status: 'error',
            message: 'Temporary Tenant ID not found. Provide X-Tenant-ID header or a default.'
        });
    }

    // Attach to req directly for multi-tenancy filtering later
    req.tenantId = tempTenantId;

    next();
};

module.exports = { getTempTenantId };