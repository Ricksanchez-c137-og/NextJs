import { NextRequest, NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";
import { Pool } from "pg";

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID!;
const resourceGroupName = process.env.AZURE_RESOURCE_GROUP!;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const vmId = body.vmId;

    if (!vmId) {
      return NextResponse.json({ success: false, message: "VM ID is required" }, { status: 400 });
    }

    console.log(`🔹 Fetching VM details for ID: ${vmId}`);

    const queryResult = await pool.query("SELECT * FROM vm_metadata WHERE id = $1", [vmId]);
    if (queryResult.rowCount === 0) {
      return NextResponse.json({ success: false, message: "VM metadata not found" }, { status: 404 });
    }

    const vmData = queryResult.rows[0];

    console.log(`✅ Found VM metadata for ${vmData.vm_name}`);

    const credential = new DefaultAzureCredential();
    const computeClient = new ComputeManagementClient(credential, subscriptionId);
    const networkClient = new NetworkManagementClient(credential, subscriptionId);

    const vmParams = {
      location: vmData.location,
      hardwareProfile: { vmSize: vmData.vm_size },
      storageProfile: {
        imageReference: {
          publisher: vmData.image_reference.split(":")[0],
          offer: vmData.image_reference.split(":")[1],
          sku: vmData.image_reference.split(":")[2],
          version: vmData.image_reference.split(":")[3],
        },
      },
      osProfile: {
        computerName: vmData.vm_name,
        adminUsername: vmData.admin_username,
        adminPassword: vmData.admin_password,
      },
      networkProfile: { networkInterfaces: [{ id: "/subscriptions/your-subscription-id/resourceGroups/your-resource-group/providers/Microsoft.Network/networkInterfaces/vaxlabs-nic", primary: true }] },
    };

    console.log(`🚀 Creating & Starting VM: ${vmData.vm_name}...`);
    const createVM = await computeClient.virtualMachines.beginCreateOrUpdate(resourceGroupName, vmData.vm_name, vmParams);
    await createVM.pollUntilDone();

    console.log(`✅ VM ${vmData.vm_name} created and started successfully!`);

    return NextResponse.json({
      success: true,
      message: `VM ${vmData.vm_name} created and started successfully.`,
    });
  } catch (err) {
    console.error("❌ VM Creation/Start Error:", err);
    return NextResponse.json({ success: false, message: "Failed to create/start VM." }, { status: 500 });
  }
}
