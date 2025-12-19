"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Star,
  Search,
  MoreVertical,
  UserPlus,
  Trash2,
  FolderPlus,
  Instagram,
  Users,
  Heart,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { cn, formatNumber, formatPercent, getTierLabel, getTierColor, getInitials } from "@/lib/utils";

// Mock data - 즐겨찾기한 인플루언서
const favoriteInfluencers = [
  {
    id: "1",
    username: "beauty_queen",
    fullName: "뷰티퀸",
    profilePicUrl: "",
    platform: "instagram",
    followerCount: 125000,
    engagementRate: 4.5,
    avgLikes: 5600,
    avgComments: 230,
    tier: "macro",
    categories: ["뷰티", "라이프스타일"],
    isVerified: true,
    folder: "뷰티 인플루언서",
    addedAt: "2024-12-15",
    lastCampaign: "스킨케어 체험단",
  },
  {
    id: "2",
    username: "fashion_daily",
    fullName: "패션데일리",
    profilePicUrl: "",
    platform: "instagram",
    followerCount: 89000,
    engagementRate: 5.2,
    avgLikes: 4600,
    avgComments: 180,
    tier: "micro",
    categories: ["패션", "라이프스타일"],
    isVerified: false,
    folder: "패션 인플루언서",
    addedAt: "2024-12-10",
    lastCampaign: null,
  },
  {
    id: "3",
    username: "foodie_korea",
    fullName: "푸디코리아",
    profilePicUrl: "",
    platform: "instagram",
    followerCount: 210000,
    engagementRate: 3.8,
    avgLikes: 8000,
    avgComments: 420,
    tier: "macro",
    categories: ["음식", "맛집"],
    isVerified: true,
    folder: "음식 인플루언서",
    addedAt: "2024-12-01",
    lastCampaign: "맛집 리뷰 캠페인",
  },
  {
    id: "4",
    username: "travel_with_me",
    fullName: "여행친구",
    profilePicUrl: "",
    platform: "instagram",
    followerCount: 156000,
    engagementRate: 4.1,
    avgLikes: 6400,
    avgComments: 310,
    tier: "macro",
    categories: ["여행", "라이프스타일"],
    isVerified: true,
    folder: null,
    addedAt: "2024-11-20",
    lastCampaign: null,
  },
];

const folders = ["전체", "뷰티 인플루언서", "패션 인플루언서", "음식 인플루언서", "미분류"];

export default function FavoritesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("전체");
  const [sortBy, setSortBy] = useState("addedAt");

  const filteredInfluencers = favoriteInfluencers
    .filter((inf) => {
      const matchesSearch =
        inf.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inf.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder =
        selectedFolder === "전체" ||
        (selectedFolder === "미분류" && !inf.folder) ||
        inf.folder === selectedFolder;
      return matchesSearch && matchesFolder;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "followerCount":
          return b.followerCount - a.followerCount;
        case "engagementRate":
          return b.engagementRate - a.engagementRate;
        case "addedAt":
        default:
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            즐겨찾기
          </h1>
          <p className="text-muted-foreground">
            저장한 인플루언서를 관리하고 캠페인에 초대하세요
          </p>
        </div>
        <Button variant="outline">
          <FolderPlus className="mr-2 h-4 w-4" />
          새 폴더 만들기
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{favoriteInfluencers.length}</div>
            <p className="text-sm text-muted-foreground">저장된 인플루언서</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{folders.length - 2}</div>
            <p className="text-sm text-muted-foreground">폴더</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {favoriteInfluencers.filter((i) => i.lastCampaign).length}
            </div>
            <p className="text-sm text-muted-foreground">협업 경험</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatNumber(
                favoriteInfluencers.reduce((sum, i) => sum + i.followerCount, 0)
              )}
            </div>
            <p className="text-sm text-muted-foreground">총 도달 가능</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="인플루언서 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedFolder} onValueChange={setSelectedFolder}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="폴더 선택" />
          </SelectTrigger>
          <SelectContent>
            {folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="addedAt">최근 추가순</SelectItem>
            <SelectItem value="followerCount">팔로워순</SelectItem>
            <SelectItem value="engagementRate">참여율순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Influencer Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInfluencers.map((influencer) => (
          <Card key={influencer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={influencer.profilePicUrl} />
                    <AvatarFallback>{getInitials(influencer.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">@{influencer.username}</span>
                      {influencer.isVerified && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          인증
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{influencer.fullName}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <UserPlus className="mr-2 h-4 w-4" />
                      캠페인 초대
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      폴더 이동
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      즐겨찾기 해제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mb-4">
                <Badge className={cn("text-xs", getTierColor(influencer.tier))}>
                  {getTierLabel(influencer.tier)}
                </Badge>
                {influencer.categories.slice(0, 2).map((cat) => (
                  <Badge key={cat} variant="outline" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                  </div>
                  <p className="font-semibold">{formatNumber(influencer.followerCount)}</p>
                  <p className="text-xs text-muted-foreground">팔로워</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                  <p className="font-semibold">{formatPercent(influencer.engagementRate)}</p>
                  <p className="text-xs text-muted-foreground">참여율</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Heart className="h-3 w-3" />
                  </div>
                  <p className="font-semibold">{formatNumber(influencer.avgLikes)}</p>
                  <p className="text-xs text-muted-foreground">평균 좋아요</p>
                </div>
              </div>

              {/* Folder & Status */}
              <div className="flex items-center justify-between text-sm">
                {influencer.folder ? (
                  <Badge variant="secondary" className="text-xs">
                    {influencer.folder}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">미분류</span>
                )}
                {influencer.lastCampaign && (
                  <span className="text-xs text-green-600">협업 이력 있음</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInfluencers.length === 0 && (
        <div className="text-center py-12">
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">저장된 인플루언서가 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            인플루언서 탐색에서 마음에 드는 인플루언서를 저장해보세요
          </p>
          <Button>
            <Search className="mr-2 h-4 w-4" />
            인플루언서 탐색하기
          </Button>
        </div>
      )}
    </div>
  );
}
