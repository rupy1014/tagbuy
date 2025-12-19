"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Calendar,
  DollarSign,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/utils";

// Mock data
const overviewStats = {
  totalReach: 1250000,
  reachChange: 23.5,
  totalEngagement: 85600,
  engagementChange: 12.3,
  totalSpent: 25000000,
  spentChange: -5.2,
  avgROI: 285,
  roiChange: 18.7,
};

const campaignPerformance = [
  {
    id: "1",
    name: "여름 신상품 프로모션",
    status: "completed",
    reach: 450000,
    engagement: 32500,
    spent: 8000000,
    roi: 320,
    period: "2024.11.01 - 2024.11.30",
  },
  {
    id: "2",
    name: "스킨케어 체험단",
    status: "active",
    reach: 280000,
    engagement: 21000,
    spent: 5000000,
    roi: 245,
    period: "2024.12.01 - 2024.12.31",
  },
  {
    id: "3",
    name: "맛집 리뷰 캠페인",
    status: "active",
    reach: 180000,
    engagement: 15200,
    spent: 3500000,
    roi: 198,
    period: "2024.12.10 - 2025.01.10",
  },
];

const contentMetrics = {
  totalContents: 45,
  avgLikes: 12500,
  avgComments: 680,
  avgShares: 320,
  topPerforming: [
    { influencer: "@beauty_queen", likes: 25600, comments: 1200, reach: 85000 },
    { influencer: "@fashion_daily", likes: 18900, comments: 890, reach: 62000 },
    { influencer: "@foodie_korea", likes: 15200, comments: 720, reach: 48000 },
  ],
};

const audienceData = {
  gender: { male: 25, female: 75 },
  age: [
    { range: "13-17", percent: 5 },
    { range: "18-24", percent: 35 },
    { range: "25-34", percent: 40 },
    { range: "35-44", percent: 15 },
    { range: "45+", percent: 5 },
  ],
  topLocations: [
    { city: "서울", percent: 45 },
    { city: "경기", percent: 20 },
    { city: "부산", percent: 10 },
    { city: "인천", percent: 8 },
    { city: "대구", percent: 5 },
  ],
};

export default function ReportsPage() {
  const [period, setPeriod] = useState("30days");
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            리포트
          </h1>
          <p className="text-muted-foreground">
            캠페인 성과를 분석하고 인사이트를 확인하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">최근 7일</SelectItem>
              <SelectItem value="30days">최근 30일</SelectItem>
              <SelectItem value="90days">최근 90일</SelectItem>
              <SelectItem value="1year">최근 1년</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            리포트 다운로드
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 도달</p>
                <p className="text-2xl font-bold">{formatNumber(overviewStats.totalReach)}</p>
              </div>
              <div className={`flex items-center text-sm ${overviewStats.reachChange > 0 ? "text-green-600" : "text-red-600"}`}>
                {overviewStats.reachChange > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(overviewStats.reachChange)}%
              </div>
            </div>
            <div className="mt-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 참여</p>
                <p className="text-2xl font-bold">{formatNumber(overviewStats.totalEngagement)}</p>
              </div>
              <div className={`flex items-center text-sm ${overviewStats.engagementChange > 0 ? "text-green-600" : "text-red-600"}`}>
                {overviewStats.engagementChange > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(overviewStats.engagementChange)}%
              </div>
            </div>
            <div className="mt-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 지출</p>
                <p className="text-2xl font-bold">{formatCurrency(overviewStats.totalSpent)}</p>
              </div>
              <div className={`flex items-center text-sm ${overviewStats.spentChange < 0 ? "text-green-600" : "text-red-600"}`}>
                {overviewStats.spentChange < 0 ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                {Math.abs(overviewStats.spentChange)}%
              </div>
            </div>
            <div className="mt-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 ROI</p>
                <p className="text-2xl font-bold">{overviewStats.avgROI}%</p>
              </div>
              <div className={`flex items-center text-sm ${overviewStats.roiChange > 0 ? "text-green-600" : "text-red-600"}`}>
                {overviewStats.roiChange > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(overviewStats.roiChange)}%
              </div>
            </div>
            <div className="mt-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">캠페인별 성과</TabsTrigger>
          <TabsTrigger value="content">콘텐츠 분석</TabsTrigger>
          <TabsTrigger value="audience">오디언스 인사이트</TabsTrigger>
        </TabsList>

        {/* Campaign Performance */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>캠페인 성과 비교</CardTitle>
              <CardDescription>진행한 캠페인의 주요 지표를 비교합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignPerformance.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{campaign.name}</span>
                        <Badge
                          variant={campaign.status === "active" ? "default" : "secondary"}
                        >
                          {campaign.status === "active" ? "진행중" : "완료"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.period}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-8 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">도달</p>
                        <p className="font-semibold">{formatNumber(campaign.reach)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">참여</p>
                        <p className="font-semibold">{formatNumber(campaign.engagement)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">지출</p>
                        <p className="font-semibold">{formatCurrency(campaign.spent)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className="font-semibold text-green-600">{campaign.roi}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Analysis */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{contentMetrics.totalContents}</p>
                <p className="text-sm text-muted-foreground">총 콘텐츠</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{formatNumber(contentMetrics.avgLikes)}</p>
                <p className="text-sm text-muted-foreground">평균 좋아요</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{formatNumber(contentMetrics.avgComments)}</p>
                <p className="text-sm text-muted-foreground">평균 댓글</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{formatNumber(contentMetrics.avgShares)}</p>
                <p className="text-sm text-muted-foreground">평균 공유</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top 퍼포먼스 콘텐츠</CardTitle>
              <CardDescription>가장 성과가 좋았던 콘텐츠입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentMetrics.topPerforming.map((content, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <span className="font-semibold">{content.influencer}</span>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>{formatNumber(content.likes)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        <span>{formatNumber(content.comments)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-gray-500" />
                        <span>{formatNumber(content.reach)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Insights */}
        <TabsContent value="audience" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Gender */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">성별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">여성</span>
                      <span className="text-sm font-semibold">{audienceData.gender.female}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-500"
                        style={{ width: `${audienceData.gender.female}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">남성</span>
                      <span className="text-sm font-semibold">{audienceData.gender.male}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${audienceData.gender.male}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Age */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">연령대 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {audienceData.age.map((age) => (
                    <div key={age.range}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{age.range}</span>
                        <span className="text-sm font-semibold">{age.percent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${age.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">지역 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {audienceData.topLocations.map((loc) => (
                    <div key={loc.city}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{loc.city}</span>
                        <span className="text-sm font-semibold">{loc.percent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${loc.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
