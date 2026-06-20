"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    if (data.user?.app_metadata?.role !== "admin") {
      await supabase.auth.signOut();
      setError("You do not have admin access");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5E6D3] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-[#4B2C20]/10">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="Sihi Bakes"
            width={56}
            height={56}
            className="mx-auto rounded-full"
          />
          <h1 className="mt-3 font-serif text-xl font-semibold text-[#4B2C20]">
            Admin Login
          </h1>
        </div>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-[#4B2C20]/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
            />
          </div>
          <div>
            <label className="text-xs text-[#4B2C20]/60">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
