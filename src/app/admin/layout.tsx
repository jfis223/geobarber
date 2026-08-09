import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/provider", label: "Provider" },
  { href: "/admin/working-hours", label: "Working hours" },
  { href: "/admin/service-zone", label: "Service zone" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-black/10 px-6 py-4 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/admin" className="font-semibold">
            GeoBarber Admin
          </Link>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
