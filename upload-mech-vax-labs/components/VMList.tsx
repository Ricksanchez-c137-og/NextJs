"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function VMList() {
  const [vmList, setVmList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch VMs from the API
  useEffect(() => {
    const fetchVMs = async () => {
      try {
        const response = await fetch("/api/vm/list");
        const data = await response.json();
        if (data.success) {
          setVmList(data.vms);
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    };

    fetchVMs();
  }, []);

  // Start VM function
  const startVM = async (vmId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/vm/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vmId }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-white mb-6">Your Uploaded VMs</h1>
      {vmList.length === 0 ? (
        <p className="text-gray-400">No VMs found. Upload one first!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vmList.map((vm) => (
            <Card key={vm.id} className="w-80 bg-gray-800 text-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold">{vm.vm_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Location: {vm.location}</p>
                <p className="text-gray-400">Size: {vm.vm_size}</p>
                <p className="text-gray-400">Image: {vm.image_reference}</p>
                <Button
                  onClick={() => startVM(vm.id)}
                  disabled={loading}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? "Starting VM..." : "Start VM"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
