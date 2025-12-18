"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Instagram,
  Youtube,
  Music2,
  PenSquare,
  CheckCircle,
  ExternalLink,
  Heart,
  MessageCircle,
  TrendingUp,
  Award,
  Users,
  Image as ImageIcon,
  Mail,
  Phone,
  Calendar,
  BarChart3,
  UserPlus,
} from "lucide-react";
import type { Influencer, Platform } from "@/types";
import {
  cn,
  formatNumber,
  formatPercent,
  getTierLabel,
  getTierColor,
  getCategoryLabel,
  getPlatformUrl,
  getInitials,
} from "@/lib/utils";

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  tiktok: <Music2 className="h-5 w-5" />,
  naver_blog: <PenSquare className="h-5 w-5" />,
};

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "text-pink-500",
  youtube: "text-red-500",
  tiktok: "text-black",
  naver_blog: "text-green-500",
};

interface InfluencerDetailPanelProps {
  influencer: Influencer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfluencerDetailPanel({
  influencer,
  open,
  onOpenChange,
}: InfluencerDetailPanelProps) {
  if (!influencer) return null;

  // 가상의 최근 게시물 데이터 (실제로는 API에서 가져와야 함)
  const recentPosts = [
    {
      id: "1",
      imageUrl: `https://picsum.photos/seed/${influencer.id}1/200/200`,
      likes: Math.floor(influencer.avgLikes * 1.2),
      comments: Math.floor(influencer.avgComments * 1.1),
    },
    {
      id: "2",
      imageUrl: `https://picsum.photos/seed/${influencer.id}2/200/200`,
      likes: Math.floor(influencer.avgLikes * 0.9),
      comments: Math.floor(influencer.avgComments * 0.8),
    },
    {
      id: "3",
      imageUrl: `https://picsum.photos/seed/${influencer.id}3/200/200`,
      likes: Math.floor(influencer.avgLikes * 1.1),
      comments: Math.floor(influencer.avgComments * 1.2),
    },
    {
      id: "4",
      imageUrl: `https://picsum.photos/seed/${influencer.id}4/200/200`,
      likes: Math.floor(influencer.avgLikes * 0.95),
      comments: Math.floor(influencer.avgComments * 1.0),
    },
    {
      id: "5",
      imageUrl: `https://picsum.photos/seed/${influencer.id}5/200/200`,
      likes: Math.floor(influencer.avgLikes * 1.05),
      comments: Math.floor(influencer.avgComments * 0.9),
    },
    {
      id: "6",
      imageUrl: `https://picsum.photos/seed/${influencer.id}6/200/200`,
      likes: Math.floor(influencer.avgLikes * 0.85),
      comments: Math.floor(influencer.avgComments * 1.15),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>인플루언서 상세 정보</SheetTitle>
        </SheetHeader>

        {/* Profile Header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-20 w-20 border-2 border-muted">
            <AvatarImage src={influencer.profilePicUrl} />
            <AvatarFallback className="text-xl">
              {getInitials(influencer.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold truncate">
                @{influencer.username}
              </h2>
              {influencer.isVerified && (
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-muted-foreground text-sm mb-2">
              {influencer.fullName}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={cn("text-xs", getTierColor(influencer.tier))}
              >
                {getTierLabel(influencer.tier)}
              </Badge>
              <div
                className={cn(
                  "flex items-center gap-1",
                  PLATFORM_COLORS[influencer.platform]
                )}
              >
                {PLATFORM_ICONS[influencer.platform]}
              </div>
              {influencer.categories.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {getCategoryLabel(cat)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        {influencer.biography && (
          <p className="text-sm text-muted-foreground mb-6 line-clamp-3">
            {influencer.biography}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <Button className="flex-1">
            <UserPlus className="h-4 w-4 mr-2" />
            캠페인 초대
          </Button>
          <Button variant="outline" asChild>
            <a
              href={
                influencer.landingUrl ||
                getPlatformUrl(influencer.platform, influencer.username)
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              프로필 보기
            </a>
          </Button>
        </div>

        <Separator className="mb-6" />

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">
              {formatNumber(influencer.followerCount)}
            </p>
            <p className="text-xs text-muted-foreground">팔로워</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <ImageIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">
              {formatNumber(influencer.mediaCount)}
            </p>
            <p className="text-xs text-muted-foreground">게시물</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">
              {formatPercent(influencer.engagementRate)}
            </p>
            <p className="text-xs text-muted-foreground">참여율</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            핵심 지표
          </h3>

          {/* Average Likes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm">평균 좋아요</span>
            </div>
            <span className="font-semibold">
              {formatNumber(influencer.avgLikes)}
            </span>
          </div>

          {/* Average Comments */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm">평균 댓글</span>
            </div>
            <span className="font-semibold">
              {formatNumber(influencer.avgComments)}
            </span>
          </div>

          {/* Influence Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm">영향력 지수</span>
            </div>
            <span className="font-semibold">
              {influencer.influenceScore
                ? formatNumber(influencer.influenceScore)
                : "-"}
            </span>
          </div>

          {/* Trust Score */}
          {influencer.trustScore !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">신뢰 점수</span>
                </div>
                <span className="font-semibold">{influencer.trustScore}점</span>
              </div>
              <Progress
                value={influencer.trustScore}
                className="h-2"
              />
            </div>
          )}

          {/* Ad Rate */}
          {influencer.adRate !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-green-500" />
                <span className="text-sm">광고 단가</span>
              </div>
              <span className="font-semibold">
                ₩{formatNumber(influencer.adRate)}
              </span>
            </div>
          )}

          {/* Fake Follower Ratio */}
          {influencer.fakeFollowerRatio !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                <span className="text-sm">가짜 팔로워 비율</span>
              </div>
              <span
                className={cn(
                  "font-semibold",
                  influencer.fakeFollowerRatio > 20
                    ? "text-red-500"
                    : influencer.fakeFollowerRatio > 10
                    ? "text-yellow-500"
                    : "text-green-500"
                )}
              >
                {formatPercent(influencer.fakeFollowerRatio)}
              </span>
            </div>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Recent Posts */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <ImageIcon className="h-4 w-4" />
            최근 게시물
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
              >
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-3 text-white text-xs">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatNumber(post.comments)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Contact & Additional Info */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">추가 정보</h3>

          {influencer.publicEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${influencer.publicEmail}`}
                className="text-primary hover:underline"
              >
                {influencer.publicEmail}
              </a>
            </div>
          )}

          {influencer.publicPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{influencer.publicPhone}</span>
            </div>
          )}

          {influencer.gender && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{influencer.gender === "M" ? "남성" : "여성"}</span>
            </div>
          )}

          {influencer.lastSyncedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                마지막 동기화:{" "}
                {new Date(influencer.lastSyncedAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
