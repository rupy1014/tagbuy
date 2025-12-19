"use client";

import { useState, useEffect } from "react";
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
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Influencer, Platform, InfluencerPost, InfluencerPostsResponse } from "@/types";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function InfluencerDetailPanel({
  influencer,
  open,
  onOpenChange,
}: InfluencerDetailPanelProps) {
  const [posts, setPosts] = useState<InfluencerPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 인플루언서 프로필 URL
  const profileUrl = influencer?.landingUrl || (influencer ? getPlatformUrl(influencer.platform, influencer.username) : "");

  // API 응답 (snake_case)을 프론트엔드 타입 (camelCase)으로 변환
  const mapPostResponse = (post: any): InfluencerPost => ({
    id: post.id,
    influencerId: post.influencer_id,
    platform: post.platform,
    mediaPk: post.media_pk,
    shortcode: post.shortcode,
    mediaType: post.media_type,
    thumbnailUrl: post.thumbnail_url,
    postUrl: post.post_url,
    caption: post.caption,
    likeCount: post.like_count,
    commentCount: post.comment_count,
    playCount: post.play_count,
    postedAt: post.posted_at,
    crawledAt: post.crawled_at,
  });

  // 게시물 데이터 가져오기
  const fetchPosts = async () => {
    if (!influencer) return;
    setPostsLoading(true);
    try {
      const response = await fetch(`${API_URL}/v1/influencers/${influencer.id}/posts?limit=6`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts.map(mapPostResponse));
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setPostsLoading(false);
    }
  };

  // 게시물 크롤링 요청
  const crawlPosts = async () => {
    if (!influencer) return;
    setCrawling(true);
    try {
      const response = await fetch(`${API_URL}/v1/influencers/${influencer.id}/posts/crawl?amount=12`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts.map(mapPostResponse));
        setFailedImages(new Set()); // 새로고침 후 실패 목록 초기화
      }
    } catch (error) {
      console.error("Failed to crawl posts:", error);
    } finally {
      setCrawling(false);
    }
  };

  // 이미지 로드 실패 시 처리
  const handleImageError = async (postId: string) => {
    // 이미 실패 기록된 이미지면 무시 (무한루프 방지)
    if (failedImages.has(postId)) return;

    setFailedImages(prev => new Set(prev).add(postId));

    // 이미 새로고침 중이면 무시
    if (isRefreshing || crawling) return;

    // 자동으로 새로고침 시도 (디바운스를 위해 약간의 딜레이)
    setIsRefreshing(true);
    setTimeout(async () => {
      if (!influencer) return;
      try {
        const response = await fetch(`${API_URL}/v1/influencers/${influencer.id}/posts/crawl?amount=12`, {
          method: "POST",
        });
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts.map(mapPostResponse));
          setFailedImages(new Set()); // 새로고침 후 실패 목록 초기화
        }
      } catch (error) {
        console.error("Failed to refresh posts:", error);
      } finally {
        setIsRefreshing(false);
      }
    }, 500);
  };

  // 패널 열릴 때 게시물 가져오기
  useEffect(() => {
    if (open && influencer) {
      setPosts([]);
      setFailedImages(new Set());
      setIsRefreshing(false);
      fetchPosts();
    }
  }, [open, influencer?.id]);

  if (!influencer) return null;

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              최근 게시물
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={crawlPosts}
              disabled={crawling || isRefreshing}
              className="h-7 text-xs"
            >
              {crawling || isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {crawling ? "새로고침 중..." : isRefreshing ? "이미지 새로고침..." : "새로고침"}
            </Button>
          </div>

          {postsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {posts.slice(0, 6).map((post) => (
                <a
                  key={post.id}
                  href={post.postUrl || profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer block"
                >
                  {post.thumbnailUrl && !failedImages.has(post.id) ? (
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={() => handleImageError(post.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      {isRefreshing ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-3 text-white text-xs">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {formatNumber(post.likeCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {formatNumber(post.commentCount)}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-3">게시물이 없습니다</p>
              <Button
                variant="outline"
                size="sm"
                onClick={crawlPosts}
                disabled={crawling}
              >
                {crawling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Instagram에서 가져오기
              </Button>
            </div>
          )}
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
