"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Calendar, Users, Clock, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Mock data
const campaigns = [
  {
    id: "1",
    title: "스킨케어 신제품 체험단",
    brand: "글로우코리아",
    brandLogo: "",
    category: "뷰티",
    description: "새롭게 출시되는 수분크림 체험 리뷰 작성",
    reward: 150000,
    matchScore: 95,
    deadline: "2024-12-25",
    applicants: 23,
    spots: 5,
    requirements: ["팔로워 10K 이상", "뷰티 카테고리 활동"],
  },
  {
    id: "2",
    title: "겨울 패딩 리뷰 캠페인",
    brand: "노스웨어",
    brandLogo: "",
    category: "패션",
    description: "겨울 신상 패딩 스타일링 콘텐츠 제작",
    reward: 200000,
    matchScore: 88,
    deadline: "2024-12-28",
    applicants: 45,
    spots: 10,
    requirements: ["팔로워 5K 이상", "패션/라이프스타일 계정"],
  },
  {
    id: "3",
    title: "맛집 탐방 콘텐츠",
    brand: "미식로드",
    brandLogo: "",
    category: "음식",
    description: "서울 핫플레이스 맛집 방문 리뷰",
    reward: 100000,
    matchScore: 72,
    deadline: "2025-01-05",
    applicants: 18,
    spots: 8,
    requirements: ["팔로워 3K 이상", "서울 거주자"],
  },
  {
    id: "4",
    title: "헬스케어 앱 체험기",
    brand: "핏트래커",
    brandLogo: "",
    category: "피트니스",
    description: "운동 트래킹 앱 2주 사용 후기",
    reward: 80000,
    matchScore: 65,
    deadline: "2025-01-10",
    applicants: 12,
    spots: 15,
    requirements: ["팔로워 1K 이상", "운동/헬스 관심자"],
  },
  {
    id: "5",
    title: "여행 브이로그 제작",
    brand: "트래블온",
    brandLogo: "",
    category: "여행",
    description: "국내 여행지 소개 영상 콘텐츠",
    reward: 250000,
    matchScore: 82,
    deadline: "2025-01-15",
    applicants: 35,
    spots: 5,
    requirements: ["팔로워 20K 이상", "영상 콘텐츠 제작 가능"],
  },
];

export default function CampaignsExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");

  let filteredCampaigns = campaigns.filter((campaign) => {
    if (searchQuery && !campaign.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && campaign.category !== categoryFilter) return false;
    return true;
  });

  // Sort
  filteredCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case "match":
        return b.matchScore - a.matchScore;
      case "reward":
        return b.reward - a.reward;
      case "deadline":
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">캠페인 탐색</h1>
        <p className="text-muted-foreground">나에게 맞는 캠페인을 찾아 신청하세요</p>
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
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="뷰티">뷰티</SelectItem>
            <SelectItem value="패션">패션</SelectItem>
            <SelectItem value="음식">음식</SelectItem>
            <SelectItem value="여행">여행</SelectItem>
            <SelectItem value="피트니스">피트니스</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match">매칭률 높은 순</SelectItem>
            <SelectItem value="reward">높은 보상순</SelectItem>
            <SelectItem value="deadline">마감 임박순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Campaign Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{campaign.title}</h3>
                        <Badge variant="secondary">매칭 {campaign.matchScore}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.brand}</p>
                    </div>
                    <Badge variant="outline">{campaign.category}</Badge>
                  </div>

                  <p className="mt-3 text-sm">{campaign.description}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {campaign.requirements.map((req, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>마감: {campaign.deadline}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{campaign.applicants}/{campaign.spots}명</span>
                    </div>
                  </div>
                </div>

                {/* Right Section */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(campaign.reward)}
                    </p>
                    <p className="text-xs text-muted-foreground">예상 보상</p>
                  </div>
                  <Link href={`/influencer/campaigns/${campaign.id}`}>
                    <Button>
                      상세 보기
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">검색 결과가 없습니다</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
