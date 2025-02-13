import VMList from "@/components/VMList";
import VMUpload from "@/components/VMUpload";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold text-center mb-6">VaxLabs VM Manager</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <VMUpload />
        <VMList />
      </div>
    </div>
  );
}
