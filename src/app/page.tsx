import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
      <h1 className="text-5xl font-extrabold mb-4">Web-Based Boxing Coach</h1>
      <p className="mb-8 text-lg text-gray-300">
        Train smarter with AI Pose Estimation
      </p>

      <div className="flex gap-6">
        <Link
          href="/login"
          className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg shadow hover:bg-blue-700 transition"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-8 py-3 bg-green-600 text-white text-lg rounded-lg shadow hover:bg-green-700 transition"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
