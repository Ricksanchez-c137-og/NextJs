import type React from "react"
import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload } from "lucide-react"

interface DropZoneProps {
  onFileSelect: (file: File) => void
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

export default DropZone

