// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // 1. Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'Authorization token is missing or malformed. Please log in to get access.'
        });
    }

    const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

    try {
        // 2. Verify token
        // Use the same JWT_SECRET that was used to sign the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Attach decoded user information to the request object
        // This makes user data available in subsequent middleware/controllers
        req.user = decoded; // decoded will contain { id, email, role, tenant } from the token payload

        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        // 4. Handle token verification errors
        console.error('JWT verification error:', error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token expired. Please log in again.'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token. Please log in again.'
            });
        } else {
            return res.status(500).json({
                status: 'error',
                message: 'Failed to authenticate token.'
            });
        }
    }
};

module.exports = authMiddleware;