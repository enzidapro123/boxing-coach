"use client";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function TestPage() {
  useEffect(() => {
    const testConnection = async () => {
      // Try to read from a table (e.g. "users")
      const { data, error } = await supabase.from("users").select("*");
      console.log("DATA:", data);
      console.log("ERROR:", error);
    };
    testConnection();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Supabase Test Page</h1>
      <p>Check your browser console (F12 → Console) for output.</p>
    </div>
  );
}
