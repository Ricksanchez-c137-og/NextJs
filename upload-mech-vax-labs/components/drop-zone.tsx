import type React from "react"
import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface DropZoneProps {
  onFileSelect: (file: File) => void
}

function setDescription(arg0: string) {
  throw new Error("Function not implemented.");
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelect }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-300 ${
        isDragActive ? "border-purple-500 bg-purple-100 bg-opacity-10" : "border-gray-600 hover:border-purple-400"
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-400">
        {isDragActive ? "Drop the VM file here" : "Drag 'n' drop a VM file here, or click to select a file"}
      </p>
    </div>
  )
}
const handleUpload = async (file: File, name: string, description: string) => {
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
  formData.append("vmName", name);
  formData.append("description", description);

  try {
    const res = await fetch("/api/vm/upload", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Ensure user is authenticated
      },
    });

    const data = await res.json();

    if (res.ok) {
      setDescription("");
      toast({ title: "Success", description: "VM uploaded successfully!" });
      setFile(null);
      setVmName("");
      setDescription("");
    } else {
      toast({ title: "Error", description: data.message, variant: "destructive" });
    }
  } catch (error) {
    toast({ title: "Error", description: "Upload failed!", variant: "destructive" });
  }
};

export default DropZone

function setFile(arg0: null) {
  throw new Error("Function not implemented.")
}

function setVmName(arg0: string) {
  throw new Error("Function not implemented.")
}

