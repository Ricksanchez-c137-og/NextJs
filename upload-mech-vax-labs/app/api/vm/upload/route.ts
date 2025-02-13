import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import { Pool } from "pg";
import { deflateSync } from "fflate"; // ✅ Using fflate for compression

// PostgreSQL setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Azure Blob Storage setup
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error("AZURE_STORAGE_CONNECTION_STRING is not defined");
}
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient("vaxlabs-vms");

async function ensureContainerExists() {
  try {
    const exists = await containerClient.exists();
    if (!exists) {
      console.log("🔹 Creating container: vaxlabs-vms");
      await containerClient.create({ access: undefined });
      console.log("✅ Container created successfully.");
    }
  } catch (err) {
    console.error("❌ Error creating container:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("🔹 Upload API called");

    // Ensure the container exists
    await ensureContainerExists();

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("vmFile") as File;
    const vmName = formData.get("vmName") as string || file.name;
    const description = formData.get("description") as string || "";

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

    const insertQuery = `
      INSERT INTO vm_metadata (vm_name, description, original_filename, azure_blob_url, compression)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const values = [vmName, description, file.name, blockBlobClient.url, "deflate"];

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
