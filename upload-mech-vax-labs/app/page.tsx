"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import DropZone from "@/components/drop-zone";

export default function VMUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [vmName, setVmName] = useState("");
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("vmFile", file);
    formData.append("vmName", vmName);
    formData.append("description", description);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await fetch("/api/vm/upload", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // If needed
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed.");
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "VM file uploaded successfully!",
        });

        setFile(null);
        setVmName("");
        setDescription("");
        setUploadProgress(100);
      } else {
        throw new Error(data.message || "Upload error");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800 text-white">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-purple-400">Upload VM File</CardTitle>
          <CardDescription className="text-gray-400">
            Upload your Virtual Machine file and provide additional details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DropZone onFileSelect={handleFileChange} />
          {file && (
            <p className="text-sm text-green-400">
              Selected File: <span className="font-bold">{file.name}</span>
            </p>
          )}
          <Input placeholder="VM Name" value={vmName} onChange={(e) => setVmName(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          {isUploading && <Progress value={uploadProgress} className="w-full" />}
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpload} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            {isUploading ? "Uploading..." : "Upload VM File"}
          </Button>
        </CardFooter>
      </Card>
      <Toaster />
    </div>
  );
}
