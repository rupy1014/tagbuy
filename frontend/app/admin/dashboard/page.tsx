"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/common/stats-card";
import {
  Users,
  Megaphone,
  Database,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Search,
  RefreshCw,
} from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";

// Mock data
const stats = {
  totalUsers: 1250,
  advertisers: 450,
  influencers: 800,
  totalCampaigns: 320,
  activeCampaigns: 45,
  totalInfluencersDb: 15420,
  newInfluencersToday: 128,
  totalTransactions: 150000000,
  pendingDisputes: 3,
};

const recentActivity = [
  { type: "user", message: "새로운 광고주 가입: 글로우코리아", time: "5분 전" },
  { type: "campaign", message: "캠페인 생성: 스킨케어 체험단", time: "15분 전" },
  { type: "discovery", message: "인플루언서 128명 발굴 완료", time: "1시간 전" },
  { type: "dispute", message: "분쟁 접수: 콘텐츠 미승인 건", time: "2시간 전" },
  { type: "settlement", message: "정산 완료: 15건, ₩2,500,000", time: "3시간 전" },
];

const discoveryStats = {
  totalInfluencers: 15420,
  byTier: {
    nano: 8500,
    micro: 5200,
    macro: 1500,
    mega: 220,
  },
  recentlySynced24h: 450,
  lastRunAt: "2024-12-15 03:00",
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">플랫폼 현황을 한눈에 확인하세요</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="총 사용자"
          value={formatNumber(stats.totalUsers)}
          icon={Users}
          description={`광고주 ${stats.advertisers} / 인플루언서 ${stats.influencers}`}
        />
        <StatsCard
          title="진행중 캠페인"
          value={stats.activeCampaigns}
          icon={Megaphone}
          description={`전체 ${stats.totalCampaigns}개`}
        />
        <StatsCard
          title="인플루언서 DB"
          value={formatNumber(stats.totalInfluencersDb)}
          icon={Database}
          description={`오늘 +${stats.newInfluencersToday}명`}
        />
        <StatsCard
          title="총 거래액"
          value={formatCurrency(stats.totalTransactions)}
          icon={DollarSign}
        />
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Alerts */}
        <Card className={stats.pendingDisputes > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              주의 필요 항목
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pendingDisputes > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Badge variant="warning">{stats.pendingDisputes}</Badge>
                    <span className="text-sm">처리 대기중인 분쟁</span>
                  </div>
                  <Link href="/admin/disputes">
                    <Button variant="ghost" size="sm">
                      확인
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )}
              {stats.pendingDisputes === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  처리가 필요한 항목이 없습니다
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discovery Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              인플루언서 발굴 현황
            </CardTitle>
            <Link href="/admin/discovery">
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-3 w-3" />
                수동 실행
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold">{formatNumber(discoveryStats.byTier.nano)}</p>
                  <p className="text-xs text-muted-foreground">나노</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{formatNumber(discoveryStats.byTier.micro)}</p>
                  <p className="text-xs text-muted-foreground">마이크로</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{formatNumber(discoveryStats.byTier.macro)}</p>
                  <p className="text-xs text-muted-foreground">매크로</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{formatNumber(discoveryStats.byTier.mega)}</p>
                  <p className="text-xs text-muted-foreground">메가</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>최근 24시간 동기화: {discoveryStats.recentlySynced24h}명</p>
                <p>마지막 실행: {discoveryStats.lastRunAt}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      activity.type === "dispute"
                        ? "warning"
                        : activity.type === "discovery"
                        ? "info"
                        : "outline"
                    }
                  >
                    {activity.type === "user" && "사용자"}
                    {activity.type === "campaign" && "캠페인"}
                    {activity.type === "discovery" && "발굴"}
                    {activity.type === "dispute" && "분쟁"}
                    {activity.type === "settlement" && "정산"}
                  </Badge>
                  <p className="text-sm">{activity.message}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">사용자 관리</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/campaigns">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <span className="font-medium">캠페인 관리</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/influencers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <span className="font-medium">인플루언서 DB</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/discovery">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Search className="h-5 w-5 text-primary" />
              <span className="font-medium">발굴 관리</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
