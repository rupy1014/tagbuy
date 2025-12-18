"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";
import { formatNumber, getTierLabel, getTierColor, formatPercent, getInitials } from "@/lib/utils";

// Table component (simplified)
function TableComponent({ children }: { children: React.ReactNode }) {
  return <table className="w-full">{children}</table>;
}

// Mock data
const influencers = [
  {
    id: "1",
    username: "beauty_queen",
    fullName: "김뷰티",
    profilePicUrl: "",
    category: "뷰티",
    tier: "micro",
    followerCount: 45000,
    engagementRate: 4.2,
    isVerified: true,
    lastSyncedAt: "2024-12-15 10:30",
    syncError: null,
  },
  {
    id: "2",
    username: "fashion_lover",
    fullName: "이패션",
    profilePicUrl: "",
    category: "패션",
    tier: "micro",
    followerCount: 32000,
    engagementRate: 5.8,
    isVerified: false,
    lastSyncedAt: "2024-12-15 09:15",
    syncError: null,
  },
  {
    id: "3",
    username: "foodie_korea",
    fullName: "박맛집",
    profilePicUrl: "",
    category: "음식",
    tier: "macro",
    followerCount: 120000,
    engagementRate: 3.5,
    isVerified: true,
    lastSyncedAt: "2024-12-14 22:00",
    syncError: null,
  },
  {
    id: "4",
    username: "travel_with_me",
    fullName: "최여행",
    profilePicUrl: "",
    category: "여행",
    tier: "nano",
    followerCount: 8500,
    engagementRate: 7.2,
    isVerified: false,
    lastSyncedAt: "2024-12-14 18:30",
    syncError: "Rate limit",
  },
  {
    id: "5",
    username: "fit_life_kr",
    fullName: "정헬스",
    profilePicUrl: "",
    category: "피트니스",
    tier: "micro",
    followerCount: 28000,
    engagementRate: 4.8,
    isVerified: true,
    lastSyncedAt: "2024-12-15 08:00",
    syncError: null,
  },
];

export default function AdminInfluencersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  const filteredInfluencers = influencers.filter((inf) => {
    if (searchQuery && !inf.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && inf.category !== categoryFilter) return false;
    if (tierFilter !== "all" && inf.tier !== tierFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">인플루언서 DB</h1>
          <p className="text-muted-foreground">발굴된 인플루언서 목록을 관리합니다</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          전체 동기화
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="유저네임으로 검색..."
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
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="티어" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="nano">나노</SelectItem>
            <SelectItem value="micro">마이크로</SelectItem>
            <SelectItem value="macro">매크로</SelectItem>
            <SelectItem value="mega">메가</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">인플루언서</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">카테고리</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">티어</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">팔로워</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">참여율</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">마지막 동기화</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInfluencers.map((influencer) => (
                  <tr key={influencer.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={influencer.profilePicUrl} />
                          <AvatarFallback>{getInitials(influencer.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">@{influencer.username}</span>
                            {influencer.isVerified && (
                              <CheckCircle className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {influencer.fullName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{influencer.category}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getTierColor(influencer.tier)}>
                        {getTierLabel(influencer.tier)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(influencer.followerCount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercent(influencer.engagementRate)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm">{influencer.lastSyncedAt}</span>
                        {influencer.syncError && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {influencer.syncError}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredInfluencers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">검색 결과가 없습니다</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
