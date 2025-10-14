import { requireRole } from "@/app/lib/auth-server";
import TechniqueRulesPanel from "@/app/it_admin/panels/TechniqueRulesPanel";
import LogsPanel from "@/app/it_admin/panels/LogsPanel";

export default async function ItAdminPage() {
  await requireRole(["it_admin", "super_admin"]);

  return (
    <main className="min-h-screen relative bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
      {/* Floating orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 blur-3xl" />
      </div>

      {/* Header (glassy bar) */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* logo */}
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 grid place-items-center text-white text-xl shadow-lg shadow-red-500/30">
              🥊
            </div>
            <h1 className="text-2xl font-bold tracking-tight">IT Admin</h1>
          </div>
          <p className="text-sm text-neutral-600">
            Content rules • Read-only audit logs
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* Technique Rules / Thresholds */}
        <section className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-red-500/20 transition hover:shadow-red-500/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Technique Rules / Thresholds</h2>
              <p className="text-sm text-neutral-600">
                Configure detection thresholds per technique.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-3 py-1 text-xs font-semibold text-red-700">
              Live
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-red-600" />
              </span>
            </span>
          </div>
          <TechniqueRulesPanel />
        </section>

        {/* Audit / Session Logs */}
        <section className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-red-500/20 transition hover:shadow-red-500/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Audit / Session Logs</h2>
              <p className="text-sm text-neutral-600">
                Latest user sessions and scores.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Read-only
            </div>
          </div>
          <LogsPanel />
        </section>

        {/* CTA footer card (optional) */}
        <section className="relative rounded-3xl border border-neutral-200 bg-gradient-to-r from-red-50 to-orange-50 p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold">Need more controls?</h3>
              <p className="text-sm text-neutral-700">
                Super Admin can manage users, roles, and global settings.
              </p>
            </div>
            <a
              href="/dashboard"
              className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:scale-105 hover:shadow-xl"
            >
              Back to Dashboard
            </a>
          </div>
        </section>
      </div>

      {/* Page footer */}
      <footer className="border-t border-neutral-200/50 py-8 text-center text-xs text-neutral-500">
        © 2025 BlazePose Coach • IT Admin Panel
      </footer>
    </main>
  );
}
