"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/common/stats-card";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Megaphone,
  TrendingUp,
  Users,
  Plus,
  ArrowRight,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react";
import { formatCurrency, formatNumber, getCampaignStatusLabel, getCampaignStatusColor } from "@/lib/utils";

// Mock data
const stats = {
  totalSpent: 15000000,
  activeCampaigns: 3,
  totalReach: 450000,
  averageROI: 245,
};

const activeCampaigns = [
  {
    id: "1",
    title: "여름 신상품 프로모션",
    category: "패션",
    status: "active",
    budget: 5000000,
    spent: 3500000,
    influencers: { total: 10, approved: 7 },
    metrics: { reach: 125000, likes: 8500, comments: 420 },
    endDate: "2024-12-31",
  },
  {
    id: "2",
    title: "스킨케어 체험단",
    category: "뷰티",
    status: "active",
    budget: 3000000,
    spent: 1500000,
    influencers: { total: 5, approved: 5 },
    metrics: { reach: 85000, likes: 5200, comments: 310 },
    endDate: "2024-12-25",
  },
  {
    id: "3",
    title: "맛집 리뷰 캠페인",
    category: "음식",
    status: "pending",
    budget: 2000000,
    spent: 0,
    influencers: { total: 8, approved: 3 },
    metrics: { reach: 0, likes: 0, comments: 0 },
    endDate: "2025-01-15",
  },
];

const recentActivity = [
  { id: 1, message: "@beauty_queen님이 콘텐츠를 제출했습니다", time: "10분 전" },
  { id: 2, message: "@fashion_lover님이 캠페인에 신청했습니다", time: "30분 전" },
  { id: 3, message: "'여름 신상품 프로모션' 콘텐츠가 승인되었습니다", time: "1시간 전" },
];

export default function AdvertiserDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">캠페인 현황을 한눈에 확인하세요</p>
        </div>
        <Link href="/advertiser/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 캠페인 만들기
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="총 광고비"
          value={formatCurrency(stats.totalSpent)}
          icon={DollarSign}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="진행중 캠페인"
          value={stats.activeCampaigns}
          icon={Megaphone}
        />
        <StatsCard
          title="총 도달"
          value={formatNumber(stats.totalReach)}
          icon={Users}
          trend={{ value: 23, isPositive: true }}
        />
        <StatsCard
          title="평균 ROI"
          value={`${stats.averageROI}%`}
          icon={TrendingUp}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Active Campaigns */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">진행중인 캠페인</h2>
          <Link href="/advertiser/campaigns" className="text-sm text-primary hover:underline flex items-center">
            전체 보기
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeCampaigns.map((campaign) => (
            <Link key={campaign.id} href={`/advertiser/campaigns/${campaign.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{campaign.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{campaign.category}</p>
                    </div>
                    <Badge className={getCampaignStatusColor(campaign.status)}>
                      {getCampaignStatusLabel(campaign.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Budget Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">예산 소진</span>
                        <span>
                          {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                        </span>
                      </div>
                      <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
                    </div>

                    {/* Influencers */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">인플루언서</span>
                      <span>
                        {campaign.influencers.approved} / {campaign.influencers.total}명 승인
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.metrics.reach)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.metrics.likes)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.metrics.comments)}</span>
                      </div>
                    </div>

                    {/* End Date */}
                    <div className="text-sm text-muted-foreground">
                      마감일: {campaign.endDate}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
              >
                <p className="text-sm">{activity.message}</p>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
