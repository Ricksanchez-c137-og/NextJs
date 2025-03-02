"use strict";

import dotenv from "dotenv";
dotenv.config();

import express, { json } from "express";
import multer from "multer";
import { Pool } from "pg";
import { readFile, unlink } from "fs-extra";
import { promisify } from "util";
import { BlobServiceClient } from "@azure/storage-blob";
import { ZstdInit } from "zstd-wasm";
import authenticateJWT from "./authenticateJWT";

const app = express();
const port = process.env.PORT || 3001;
import cors from "cors";
app.use(cors());

// PostgreSQL Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Azure Blob Storage Setup
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("vaxlabs-vms");

// Multer: Store files in "uploads/" temporarily before compression
const upload = multer({ dest: "uploads/" });

// Ensure table exists for metadata
const createTable = async () => {
  const createQuery = `
    CREATE TABLE IF NOT EXISTS vm_metadata (
      id SERIAL PRIMARY KEY,
      vm_name VARCHAR(255),
      description TEXT,
      original_filename VARCHAR(255),
      azure_blob_url TEXT,
      compression VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createQuery);
    console.log("Table vm_metadata ensured.");
  } catch (err) {
    console.error("Error creating table:", err);
  }
};
createTable();

// Middleware
app.use(json());

/**
 * 📌 API: Upload VM & Store in Azure Blob Storage
 */
app.post("/api/vm/upload", authenticateJWT, upload.single("vmFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { originalname, path: tempFilePath } = req.file;
    const { vmName, description } = req.body;

    const fileBuffer = await readFile(tempFilePath);

    // Initialize Zstandard
    const zstd = await ZstdInit();
    const compressedBuffer = zstd.compress(fileBuffer);

    // Upload to Azure Blob Storage
    const blobName = `${Date.now()}-${originalname}.zst`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(compressedBuffer, compressedBuffer.length);

    // Insert metadata into PostgreSQL
    const insertQuery = `
      INSERT INTO vm_metadata (vm_name, description, original_filename, azure_blob_url, compression)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const values = [
      vmName || originalname,
      description || "",
      originalname,
      blockBlobClient.url,
      "zstd"
    ];

    const result = await pool.query(insertQuery, values);

    // Remove temporary file
    await unlink(tempFilePath);

    return res.status(200).json({ success: true, id: result.rows[0].id, azure_url: blockBlobClient.url });

  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 📌 API: Clone & Decompress VM
 */
app.post("/api/vm/clone", authenticateJWT, async (req, res) => {
  try {
    const { vmId } = req.body;
    if (!vmId) return res.status(400).json({ success: false, message: "Missing VM ID" });

    // Fetch VM metadata from DB
    const vmData = await pool.query("SELECT * FROM vm_metadata WHERE id = $1", [vmId]);
    if (vmData.rowCount === 0) return res.status(404).json({ success: false, message: "VM not found" });

    const { azure_blob_url, original_filename } = vmData.rows[0];

    // Download & Decompress
    const blockBlobClient = containerClient.getBlockBlobClient(azure_blob_url);
    const downloadBuffer = await blockBlobClient.downloadToBuffer();

    const zstd = await ZstdInit();
    const decompressedBuffer = zstd.decompress(downloadBuffer);

    // Store decompressed VM in Azure VM Disk
    const azureVmDiskName = `${Date.now()}-${original_filename}`;
    // (Pretend function) Upload the decompressed file to an Azure VM disk storage
    await uploadToAzureVM(azureVmDiskName, decompressedBuffer);

    return res.json({ success: true, message: "VM cloned and deployed successfully", vmName: azureVmDiskName });
  } catch (err) {
    console.error("Clone Error:", err);
    return res.status(500).json({ success: false, message: "Error cloning VM" });
  }
});

/**
 * 📌 API: Generate VPN File
 */
app.post("/api/vpn/generate", authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) return res.status(400).json({ success: false, message: "Missing User ID" });

    const vpnConfig = `
    client
    dev tun
    proto udp
    remote vaxlabs-vpn.server.com 1194
    resolv-retry infinite
    nobind
    persist-key
    persist-tun
    cipher AES-256-CBC
    auth SHA256
    comp-lzo
    key-direction 1
    <ca>...</ca>
    <cert>...</cert>
    <key>...</key>
    `;

    return res.json({ success: true, vpnFile: vpnConfig });
  } catch (err) {
    console.error("VPN Error:", err);
    return res.status(500).json({ success: false, message: "VPN generation error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
