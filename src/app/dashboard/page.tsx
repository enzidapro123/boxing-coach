"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      } else {
        setUserEmail(session.user.email ?? null);
        setCreatedAt(session.user.created_at ?? null);
      }
    };

    getSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-4">Boxing Coach Dashboard</h1>

      {userEmail ? (
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md text-center">
          <p className="mb-2">
            <strong>Email:</strong> {userEmail}
          </p>
          {createdAt && (
            <p className="mb-4 text-sm text-gray-600">
              Joined: {new Date(createdAt).toLocaleDateString()}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Link
              href="/training/jab"
              className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Jab
            </Link>
            <Link
              href="/training/cross"
              className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Cross
            </Link>
            <Link
              href="/training/hook"
              className="p-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Hook
            </Link>
            <Link
              href="/training/guard"
              className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Guard
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </main>
  );
}
