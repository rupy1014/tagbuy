"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/common/stats-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Wallet,
  Clock,
  TrendingUp,
  ArrowRight,
  Zap,
  DollarSign,
  CheckCircle,
  Users,
} from "lucide-react";
import { formatCurrency, formatNumber, formatPercent, getInitials } from "@/lib/utils";

// Mock data
const earnings = {
  thisMonth: 2500000,
  pending: 800000,
  withdrawable: 1700000,
};

const profile = {
  username: "beauty_queen",
  fullName: "김뷰티",
  followerCount: 45000,
  engagementRate: 4.2,
  completedCampaigns: 12,
  successRate: 95,
};

const recommendedCampaigns = [
  {
    id: "1",
    title: "스킨케어 신제품 체험단",
    brand: "글로우코리아",
    category: "뷰티",
    reward: 150000,
    matchScore: 95,
    deadline: "2024-12-25",
    applicants: 23,
    spots: 5,
  },
  {
    id: "2",
    title: "겨울 패딩 리뷰 캠페인",
    brand: "노스웨어",
    category: "패션",
    reward: 200000,
    matchScore: 88,
    deadline: "2024-12-28",
    applicants: 45,
    spots: 10,
  },
  {
    id: "3",
    title: "맛집 탐방 콘텐츠",
    brand: "미식로드",
    category: "음식",
    reward: 100000,
    matchScore: 72,
    deadline: "2025-01-05",
    applicants: 18,
    spots: 8,
  },
];

const activeCampaigns = [
  {
    id: "1",
    title: "립스틱 컬러 리뷰",
    status: "content_pending",
    deadline: "2024-12-20",
    reward: 120000,
  },
  {
    id: "2",
    title: "여행 브이로그 제작",
    status: "approved",
    deadline: "2024-12-22",
    reward: 180000,
  },
];

export default function InfluencerDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" />
            <AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">안녕하세요, {profile.fullName}님!</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/influencer/campaigns">
            <Button variant="outline">
              캠페인 탐색
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/influencer/withdraw">
            <Button>
              <Zap className="mr-2 h-4 w-4" />
              즉시 출금하기
            </Button>
          </Link>
        </div>
      </div>

      {/* Earnings Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="이번 달 수익"
          value={formatCurrency(earnings.thisMonth)}
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="정산 대기"
          value={formatCurrency(earnings.pending)}
          icon={Clock}
          description="D+7 후 정산 예정"
        />
        <StatsCard
          title="출금 가능"
          value={formatCurrency(earnings.withdrawable)}
          icon={Wallet}
        />
      </div>

      {/* Profile Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{formatNumber(profile.followerCount)}</p>
              <p className="text-sm text-muted-foreground">팔로워</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPercent(profile.engagementRate)}</p>
              <p className="text-sm text-muted-foreground">참여율</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{profile.completedCampaigns}</p>
              <p className="text-sm text-muted-foreground">완료 캠페인</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{profile.successRate}%</p>
              <p className="text-sm text-muted-foreground">성공률</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">진행중인 캠페인</CardTitle>
            <Link href="/influencer/my-campaigns" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          </CardHeader>
          <CardContent>
            {activeCampaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">진행중인 캠페인이 없습니다</p>
            ) : (
              <div className="space-y-4">
                {activeCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/influencer/my-campaigns/${campaign.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{campaign.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={campaign.status === "approved" ? "success" : "warning"}
                          >
                            {campaign.status === "approved" ? "승인됨" : "콘텐츠 제출 필요"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            마감: {campaign.deadline}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {formatCurrency(campaign.reward)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">추천 캠페인</CardTitle>
            <Link href="/influencer/campaigns" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendedCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/influencer/campaigns/${campaign.id}`}
                  className="block"
                >
                  <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{campaign.title}</p>
                        <p className="text-sm text-muted-foreground">{campaign.brand}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{campaign.category}</Badge>
                          <Badge variant="secondary">
                            매칭 {campaign.matchScore}%
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {formatCurrency(campaign.reward)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Users className="inline h-3 w-3 mr-1" />
                          {campaign.applicants}/{campaign.spots}명
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
