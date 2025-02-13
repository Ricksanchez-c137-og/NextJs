import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import { Pool } from "pg";
import { deflateSync } from "fflate";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Azure Blob Storage setup
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("AZURE_STORAGE_CONNECTION_STRING is not defined");
}
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("vaxlabs-vms");

export async function POST(req: NextRequest) {
  try {
    console.log("🔹 Upload API called");

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("vmFile") as File;
    const vmName = formData.get("vmName") as string || file.name;
    const description = formData.get("description") as string || "";
    const location = formData.get("location") as string || "eastus";
    const vmSize = formData.get("vmSize") as string || "Standard_B1s";
    const imageReference = formData.get("imageReference") as string || "Canonical:0001-com-ubuntu-server-jammy:22_04-lts-gen2:latest";
    const adminUsername = formData.get("adminUsername") as string || "adminuser";
    const adminPassword = formData.get("adminPassword") as string || "YourSecurePassword123!";
    
    if (!file) {
      console.log("❌ No file received");
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
    }

    console.log(`✅ File received: ${file.name} - Size: ${file.size} bytes`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    console.log("🔹 Compressing file...");
    const compressedBuffer = deflateSync(fileBuffer);
    console.log(`✅ Compression complete - New size: ${compressedBuffer.length} bytes`);

    console.log("🔹 Uploading to Azure...");
    const blobName = `${Date.now()}-${file.name}.deflate`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(compressedBuffer, compressedBuffer.length);
    console.log(`✅ Upload successful: ${blobName}`);

    // Store metadata & VM configuration in PostgreSQL
    const insertQuery = `
      INSERT INTO vm_metadata (vm_name, description, original_filename, azure_blob_url, compression, location, vm_size, image_reference, admin_username, admin_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;
    `;
    const values = [vmName, description, file.name, blockBlobClient.url, "deflate", location, vmSize, imageReference, adminUsername, adminPassword];

    const result = await pool.query(insertQuery, values);
    console.log(`✅ Database updated - ID: ${result.rows[0].id}`);

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      azure_url: blockBlobClient.url,
      message: "VM uploaded and stored successfully",
    });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
