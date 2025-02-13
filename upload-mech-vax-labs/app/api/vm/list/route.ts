import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(req: NextRequest) {
  try {
    console.log("🔹 Fetching all uploaded VMs");

    const queryResult = await pool.query("SELECT id, vm_name, location, vm_size, image_reference FROM vm_metadata");

    return NextResponse.json({
      success: true,
      vms: queryResult.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching VMs:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch VMs." }, { status: 500 });
  }
}
