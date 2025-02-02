"use strict";

// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import express, { json } from "express";
import multer from "multer";
import { Pool } from "pg";
import { gzip } from "zlib";
import { readFile, unlink } from "fs";
import { promisify } from "util";
import authenticateJWT from "./authenticateJWT"; // Import the JWT middleware

const app = express();
const port = process.env.PORT || 3001;
import cors from "cors";
app.use(cors());
// Configure PostgreSQL connection using DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Use multer to temporarily store uploaded files on disk
const upload = multer({ dest: "uploads/" });

// Promisify fs functions for convenience
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

// Optionally, ensure the database table exists (for demo purposes)
const createTable = async () => {
  const createQuery = `
    CREATE TABLE IF NOT EXISTS vm_files (
      id SERIAL PRIMARY KEY,
      vm_name VARCHAR(255),
      description TEXT,
      original_filename VARCHAR(255),
      file_data BYTEA,
      compression VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createQuery);
    console.log("Table vm_files ensured.");
  } catch (err) {
    console.error("Error creating table:", err);
  }
};
createTable();

// Middleware to parse JSON bodies (for additional metadata)
app.use(json());

/**
 * POST /api/vm/upload
 * Expects:
 *  - A multipart form upload with the field "vmFile" for the VM file.
 *  - Additional fields "vmName" and "description" in the request body.
 *
 * This endpoint:
 *  1. Authenticates the request using JWT.
 *  2. Reads and compresses the uploaded file using gzip.
 *  3. Inserts the compressed file along with metadata into PostgreSQL.
 *  4. Removes the temporary file and returns the inserted record ID.
 */
app.post("/api/vm/upload", authenticateJWT, upload.single("vmFile"), async (req, res) => {
  try {
    // Ensure a file was uploaded.
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { originalname, path: tempFilePath } = req.file;
    const { vmName, description } = req.body;

    // Read the file that was uploaded
    const fileBuffer = await readFileAsync(tempFilePath);

    // Compress the file using gzip
    gzip(fileBuffer, async (err, compressedBuffer) => {
      if (err) {
        console.error("Compression error:", err);
        return res.status(500).json({ success: false, message: "File compression failed" });
      }

      // Insert the compressed file and metadata into PostgreSQL
      const insertQuery = `
        INSERT INTO vm_files (vm_name, description, original_filename, file_data, compression)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `;
      const values = [
        vmName || originalname,
        description || "",
        originalname,
        compressedBuffer,
        "gzip"
      ];

      try {
        const result = await pool.query(insertQuery, values);

        // Remove the temporary file from disk
        await unlinkAsync(tempFilePath);

        return res.status(200).json({ success: true, id: result.rows[0].id });
      } catch (dbErr) {
        console.error("Database insert error:", dbErr);
        return res.status(500).json({ success: false, message: "Database insert failed" });
      }
    });
  } catch (err) {
    console.error("Error handling upload:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
