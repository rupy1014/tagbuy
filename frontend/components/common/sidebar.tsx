"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileText,
  DollarSign,
  Settings,
  Search,
  Wallet,
  FolderKanban,
  Database,
  BarChart3,
  AlertCircle,
  Star,
  PieChart,
  User,
  Building2,
} from "lucide-react";

interface SidebarProps {
  type: "advertiser" | "influencer" | "admin";
  isOpen?: boolean;
  onClose?: () => void;
}

const advertiserNavItems = [
  { href: "/advertiser/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/advertiser/campaigns", icon: Megaphone, label: "캠페인" },
  { href: "/advertiser/influencers", icon: Search, label: "인플루언서 탐색" },
  { href: "/advertiser/favorites", icon: Star, label: "즐겨찾기" },
  { href: "/advertiser/reports", icon: PieChart, label: "리포트" },
  { href: "/advertiser/payments", icon: DollarSign, label: "결제 내역" },
  { href: "/advertiser/mypage", icon: User, label: "마이페이지" },
];

const influencerNavItems = [
  { href: "/influencer/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/influencer/campaigns", icon: Search, label: "캠페인 탐색" },
  { href: "/influencer/my-campaigns", icon: FolderKanban, label: "나의 캠페인" },
  { href: "/influencer/earnings", icon: Wallet, label: "수익 관리" },
  { href: "/influencer/settings", icon: Settings, label: "설정" },
];

const adminNavItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/admin/users", icon: Users, label: "사용자 관리" },
  { href: "/admin/campaigns", icon: Megaphone, label: "캠페인 관리" },
  { href: "/admin/influencers", icon: Database, label: "인플루언서 DB" },
  { href: "/admin/discovery", icon: Search, label: "발굴 관리" },
  { href: "/admin/disputes", icon: AlertCircle, label: "분쟁 관리" },
  { href: "/admin/transactions", icon: DollarSign, label: "거래 내역" },
  { href: "/admin/settings", icon: Settings, label: "시스템 설정" },
];

export function Sidebar({ type, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems =
    type === "advertiser"
      ? advertiserNavItems
      : type === "influencer"
      ? influencerNavItems
      : adminNavItems;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="text-xl font-bold text-primary">
            TagBuy
          </Link>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
