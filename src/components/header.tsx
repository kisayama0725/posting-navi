"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  role: string;
  displayName?: string;
}

const adminLinks = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/tasks", label: "タスク" },
  { href: "/admin/areas", label: "エリア" },
  { href: "/admin/sales", label: "売上" },
  { href: "/admin/staff", label: "スタッフ" },
  { href: "/admin/reports", label: "レポート" },
];

const staffLinks = [
  { href: "/staff", label: "タスク" },
  { href: "/staff/report", label: "成績" },
];

export function Header({ role, displayName }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const links = role === "admin" ? adminLinks : staffLinks;

  return (
    <header className="border-b bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={role === "admin" ? "/admin" : "/staff"}>
            <h1 className="text-lg font-bold">PostingNavi</h1>
          </Link>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            {role === "admin" ? "管理者" : "スタッフ"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="text-sm text-gray-600 hidden sm:inline">
              {displayName}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </div>
      <nav className="flex gap-1 mt-2 -mb-3 overflow-x-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t whitespace-nowrap"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
