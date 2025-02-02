"use strict";

import { verify } from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * - Expects the Authorization header in the format: "Bearer <token>"
 * - Verifies the token using the secret provided in process.env.JWT_SECRET.
 * - On success, attaches the decoded payload to req.user and calls next().
 * - On failure, returns a 401 (Unauthorized) or 403 (Forbidden) status.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Extract token from "Bearer <token>"
    const token = authHeader.split(" ")[1];

    verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("JWT verification error:", err);
        return res.status(403).json({ message: "Forbidden - Invalid token." });
      }
      // Attach decoded token (payload) to the request
      req.user = decoded;
      next();
    });
  } else {
    return res.status(401).json({ message: "Unauthorized - No token provided." });
  }
}

export default authenticateJWT;
