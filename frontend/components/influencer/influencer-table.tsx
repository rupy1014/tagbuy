"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Instagram,
  Youtube,
  Music2,
  PenSquare,
  CheckCircle,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Influencer, InfluencerSearchParams, Platform } from "@/types";
import {
  formatNumber,
  formatPercent,
  getTierLabel,
  getTierColor,
  getCategoryLabel,
  getPlatformUrl,
  getInitials,
} from "@/lib/utils";

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  tiktok: <Music2 className="h-4 w-4" />,
  naver_blog: <PenSquare className="h-4 w-4" />,
};

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "text-pink-500",
  youtube: "text-red-500",
  tiktok: "text-black",
  naver_blog: "text-green-500",
};

type SortField = NonNullable<InfluencerSearchParams["sortBy"]>;

interface InfluencerTableProps {
  influencers: Influencer[];
  totalCount: number;
  page: number;
  limit: number;
  sortBy?: SortField;
  sortOrder?: "asc" | "desc";
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (sortBy: SortField, sortOrder: "asc" | "desc") => void;
  onSelect?: (ids: string[]) => void;
  selectedIds?: string[];
  isLoading?: boolean;
}

export function InfluencerTable({
  influencers,
  totalCount,
  page,
  limit,
  sortBy,
  sortOrder = "desc",
  onPageChange,
  onLimitChange,
  onSortChange,
  onSelect,
  selectedIds = [],
  isLoading,
}: InfluencerTableProps) {
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalCount);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field, "desc");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === influencers.length) {
      onSelect?.([]);
    } else {
      onSelect?.(influencers.map((i) => i.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelect?.([...selectedIds, id]);
    }
  };

  const SortHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        "flex items-center gap-1 hover:text-primary transition-colors group",
        className
      )}
    >
      {children}
      {sortBy === field ? (
        sortOrder === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );

  return (
    <div className="flex flex-col">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b bg-muted/50">
            <tr className="text-xs text-muted-foreground">
              {onSelect && (
                <th className="w-10 p-3">
                  <Checkbox
                    checked={
                      influencers.length > 0 &&
                      selectedIds.length === influencers.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
              <th className="p-3 text-left font-medium">인플루언서</th>
              <th className="p-3 text-left font-medium w-24">플랫폼</th>
              <th className="p-3 text-left font-medium w-24">
                <SortHeader field="follower_count">팔로워</SortHeader>
              </th>
              <th className="p-3 text-left font-medium w-24">
                <SortHeader field="engagement_rate">참여율</SortHeader>
              </th>
              <th className="p-3 text-left font-medium w-24">
                <SortHeader field="influence_score">영향력</SortHeader>
              </th>
              <th className="p-3 text-left font-medium w-24">
                <SortHeader field="trust_score">신뢰점수</SortHeader>
              </th>
              <th className="p-3 text-left font-medium w-32">카테고리</th>
              <th className="p-3 text-left font-medium w-20">티어</th>
              <th className="p-3 text-right font-medium w-24">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: limit }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {onSelect && (
                    <td className="p-3">
                      <div className="h-4 w-4 bg-muted rounded" />
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-full" />
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-16 bg-muted rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-12 bg-muted rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-12 bg-muted rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-12 bg-muted rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-12 bg-muted rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-5 w-16 bg-muted rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-5 w-14 bg-muted rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-8 w-20 bg-muted rounded" />
                  </td>
                </tr>
              ))
            ) : influencers.length === 0 ? (
              <tr>
                <td
                  colSpan={onSelect ? 10 : 9}
                  className="p-12 text-center text-muted-foreground"
                >
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              influencers.map((influencer) => (
                <tr
                  key={influencer.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    selectedIds.includes(influencer.id) && "bg-primary/5"
                  )}
                >
                  {onSelect && (
                    <td className="p-3">
                      <Checkbox
                        checked={selectedIds.includes(influencer.id)}
                        onCheckedChange={() => handleSelectOne(influencer.id)}
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={influencer.profilePicUrl} />
                        <AvatarFallback>
                          {getInitials(influencer.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm">
                            @{influencer.username}
                          </span>
                          {influencer.isVerified && (
                            <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {influencer.fullName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div
                      className={cn(
                        "flex items-center gap-1.5",
                        PLATFORM_COLORS[influencer.platform]
                      )}
                    >
                      {PLATFORM_ICONS[influencer.platform]}
                      <span className="text-xs capitalize">
                        {influencer.platform.replace("_", " ")}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-sm">
                      {formatNumber(influencer.followerCount)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">
                      {formatPercent(influencer.engagementRate)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-medium">
                      {influencer.influenceScore
                        ? formatNumber(influencer.influenceScore)
                        : "-"}
                    </span>
                  </td>
                  <td className="p-3">
                    {influencer.trustScore ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              influencer.trustScore >= 80
                                ? "bg-green-500"
                                : influencer.trustScore >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${influencer.trustScore}%` }}
                          />
                        </div>
                        <span className="text-xs">{influencer.trustScore}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {influencer.categories.slice(0, 2).map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="text-[10px] px-1.5"
                        >
                          {getCategoryLabel(cat)}
                        </Badge>
                      ))}
                      {influencer.categories.length > 2 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5"
                        >
                          +{influencer.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getTierColor(influencer.tier))}
                    >
                      {getTierLabel(influencer.tier)}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        asChild
                      >
                        <a
                          href={
                            influencer.landingUrl ||
                            getPlatformUrl(influencer.platform, influencer.username)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        초대
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-4 py-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {formatNumber(startIndex)} - {formatNumber(endIndex)} /{" "}
            {formatNumber(totalCount)}
          </span>
          <div className="flex items-center gap-2">
            <span>페이지당</span>
            <Select
              value={limit.toString()}
              onValueChange={(v) => onLimitChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 px-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
