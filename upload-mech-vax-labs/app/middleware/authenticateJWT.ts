import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export default async function authenticateJWT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null; // Unauthorized - No token provided
    }

    const token = authHeader.split(" ")[1];

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    return decoded; // Return the decoded user object
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null; // Forbidden - Invalid token
  }
}
