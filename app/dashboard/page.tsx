import Image from 'next/image';

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-10">
        <Image src="/logo.png" alt="Magical Touch" width={180} height={36} />
      </div>
      <h1 className="text-3xl font-bold text-gray-800">Welcome to your Dashboard</h1>
      <p className="mt-2 text-gray-500">This is where your designs will live.</p>
    </main>
  );
}
