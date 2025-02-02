"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import DropZone from "@/components/drop-zone"

export default function VMUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [vmName, setVmName] = useState("")
  const [description, setDescription] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return
    }

    // Simulating file upload
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    toast({
      title: "Success",
      description: "VM file uploaded successfully!",
    })

    // Reset form
    setFile(null)
    setVmName("")
    setDescription("")
    setUploadProgress(0)
  }

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
          <Input
            placeholder="VM Name"
            value={vmName}
            onChange={(e) => setVmName(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          {uploadProgress > 0 && <Progress value={uploadProgress} className="w-full" />}
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpload} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            Upload VM File
          </Button>
        </CardFooter>
      </Card>
      <Toaster />
    </div>
  )
}