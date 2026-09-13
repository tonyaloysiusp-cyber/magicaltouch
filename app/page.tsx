export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl md:text-6xl font-bold bg-brand-gradient bg-clip-text text-transparent">
        Magical Touch
      </h1>
      <p className="mt-4 text-xl font-medium text-gray-700">
        Create. Design. Make It Magical.
      </p>
      <p className="mt-3 max-w-xl text-gray-500">
        A simple and powerful online design platform for creating professional graphics, marketing materials, social media content, and print designs.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/signup"
          className="px-6 py-3 rounded-full text-white font-semibold bg-brand-gradient shadow-md"
        >
          Create a Design
        </a>
        <a
          href="/login"
          className="px-6 py-3 rounded-full font-semibold border border-gray-300 text-gray-700"
        >
          Log In
        </a>
      </div>
    </main>
  );
}
