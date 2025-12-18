"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Eye, Heart, MessageCircle, Calendar } from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  getCampaignStatusLabel,
  getCampaignStatusColor,
  formatDate,
} from "@/lib/utils";

// Mock data
const allCampaigns = [
  {
    id: "1",
    title: "여름 신상품 프로모션",
    category: "패션",
    status: "active",
    budget: 5000000,
    spent: 3500000,
    influencers: { total: 10, approved: 7 },
    metrics: { reach: 125000, likes: 8500, comments: 420 },
    startDate: "2024-11-01",
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
    startDate: "2024-11-15",
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
    startDate: "2024-12-01",
    endDate: "2025-01-15",
  },
  {
    id: "4",
    title: "가을 패션 위크",
    category: "패션",
    status: "completed",
    budget: 8000000,
    spent: 8000000,
    influencers: { total: 20, approved: 20 },
    metrics: { reach: 350000, likes: 25000, comments: 1200 },
    startDate: "2024-09-01",
    endDate: "2024-10-31",
  },
  {
    id: "5",
    title: "헬스케어 제품 리뷰",
    category: "건강",
    status: "completed",
    budget: 4000000,
    spent: 4000000,
    influencers: { total: 12, approved: 12 },
    metrics: { reach: 180000, likes: 12000, comments: 800 },
    startDate: "2024-08-15",
    endDate: "2024-09-30",
  },
];

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const filteredCampaigns = allCampaigns.filter((campaign) => {
    // Tab filter
    if (activeTab !== "all" && campaign.status !== activeTab) return false;
    // Search filter
    if (searchQuery && !campaign.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Category filter
    if (categoryFilter !== "all" && campaign.category !== categoryFilter) return false;
    return true;
  });

  const statusCounts = {
    all: allCampaigns.length,
    active: allCampaigns.filter((c) => c.status === "active").length,
    pending: allCampaigns.filter((c) => c.status === "pending").length,
    completed: allCampaigns.filter((c) => c.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">캠페인</h1>
          <p className="text-muted-foreground">모든 캠페인을 관리하세요</p>
        </div>
        <Link href="/advertiser/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 캠페인 만들기
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="캠페인 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            <SelectItem value="뷰티">뷰티</SelectItem>
            <SelectItem value="패션">패션</SelectItem>
            <SelectItem value="음식">음식</SelectItem>
            <SelectItem value="건강">건강</SelectItem>
            <SelectItem value="여행">여행</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">전체 ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="active">진행중 ({statusCounts.active})</TabsTrigger>
          <TabsTrigger value="pending">대기중 ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="completed">완료 ({statusCounts.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">캠페인이 없습니다</p>
                <Link href="/advertiser/campaigns/new" className="mt-4 inline-block">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    첫 캠페인 만들기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/advertiser/campaigns/${campaign.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Campaign Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{campaign.title}</h3>
                            <Badge className={getCampaignStatusColor(campaign.status)}>
                              {getCampaignStatusLabel(campaign.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{campaign.category}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {campaign.startDate} ~ {campaign.endDate}
                            </span>
                          </div>
                        </div>

                        {/* Budget */}
                        <div className="w-full lg:w-48">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">예산</span>
                            <span>
                              {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                            </span>
                          </div>
                          <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
                        </div>

                        {/* Influencers */}
                        <div className="text-center lg:w-24">
                          <p className="text-lg font-semibold">
                            {campaign.influencers.approved}/{campaign.influencers.total}
                          </p>
                          <p className="text-xs text-muted-foreground">인플루언서</p>
                        </div>

                        {/* Metrics */}
                        <div className="flex gap-4 lg:w-48">
                          <div className="flex items-center gap-1 text-sm">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(campaign.metrics.reach)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(campaign.metrics.likes)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(campaign.metrics.comments)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
