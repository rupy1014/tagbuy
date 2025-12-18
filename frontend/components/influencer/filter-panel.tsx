"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
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
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Platform, InfluencerTier, InfluencerSearchParams } from "@/types";
import {
  formatNumber,
  getTierLabel,
  getCategoryLabel,
} from "@/lib/utils";

const PLATFORMS: { value: Platform; label: string; icon: React.ReactNode }[] = [
  { value: "instagram", label: "인스타그램", icon: <Instagram className="h-4 w-4" /> },
  { value: "youtube", label: "유튜브", icon: <Youtube className="h-4 w-4" /> },
  { value: "tiktok", label: "틱톡", icon: <Music2 className="h-4 w-4" /> },
  { value: "naver_blog", label: "네이버 블로그", icon: <PenSquare className="h-4 w-4" /> },
];

const TIERS: { value: InfluencerTier; label: string; range: string }[] = [
  { value: "nano", label: "나노", range: "1K-10K" },
  { value: "micro", label: "마이크로", range: "10K-100K" },
  { value: "macro", label: "매크로", range: "100K-1M" },
  { value: "mega", label: "메가", range: "1M+" },
];

const CATEGORIES = [
  "BEAUTY",
  "FASHION",
  "FOOD",
  "TRAVEL",
  "DAILY",
  "FITNESS",
  "TECH",
  "GAMING",
  "PARENTING",
  "PET",
  "INTERIOR",
  "FINANCE",
];

interface FilterPanelProps {
  filters: InfluencerSearchParams;
  onFiltersChange: (filters: InfluencerSearchParams) => void;
  totalCount?: number;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  totalCount,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    platform: true,
    tier: true,
    category: true,
    followers: true,
    engagement: true,
    trust: false,
    adRate: false,
    options: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilter = <K extends keyof InfluencerSearchParams>(
    key: K,
    value: InfluencerSearchParams[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof InfluencerSearchParams] !== undefined
  );

  const SectionHeader = ({
    title,
    section,
    badge,
  }: {
    title: string;
    section: string;
    badge?: string | number;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors"
    >
      <span className="flex items-center gap-2">
        {title}
        {badge && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {badge}
          </Badge>
        )}
      </span>
      {expandedSections[section] ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );

  return (
    <div className="w-72 shrink-0 space-y-4 border-r pr-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">필터</h3>
          {totalCount !== undefined && (
            <p className="text-sm text-muted-foreground">
              {formatNumber(totalCount)}명의 인플루언서
            </p>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 text-xs"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            초기화
          </Button>
        )}
      </div>

      <Separator />

      {/* Platform Filter */}
      <div>
        <SectionHeader
          title="플랫폼"
          section="platform"
          badge={filters.platform ? 1 : undefined}
        />
        {expandedSections.platform && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.value}
                onClick={() =>
                  updateFilter(
                    "platform",
                    filters.platform === platform.value ? undefined : platform.value
                  )
                }
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors hover:bg-accent",
                  filters.platform === platform.value &&
                    "border-primary bg-primary/5 text-primary"
                )}
              >
                {platform.icon}
                <span>{platform.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Tier Filter */}
      <div>
        <SectionHeader
          title="티어"
          section="tier"
          badge={filters.tier ? 1 : undefined}
        />
        {expandedSections.tier && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {TIERS.map((tier) => (
              <button
                key={tier.value}
                onClick={() =>
                  updateFilter(
                    "tier",
                    filters.tier === tier.value ? undefined : tier.value
                  )
                }
                className={cn(
                  "flex flex-col items-start rounded-lg border p-2 text-left transition-colors hover:bg-accent",
                  filters.tier === tier.value &&
                    "border-primary bg-primary/5 text-primary"
                )}
              >
                <span className="text-xs font-medium">{tier.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {tier.range}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Category Filter */}
      <div>
        <SectionHeader
          title="카테고리"
          section="category"
          badge={filters.category ? 1 : undefined}
        />
        {expandedSections.category && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {CATEGORIES.map((category) => (
              <Badge
                key={category}
                variant={filters.category === category ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-xs hover:bg-primary/10",
                  filters.category === category && "bg-primary text-primary-foreground"
                )}
                onClick={() =>
                  updateFilter(
                    "category",
                    filters.category === category ? undefined : category
                  )
                }
              >
                {getCategoryLabel(category)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Follower Range */}
      <div>
        <SectionHeader
          title="팔로워 수"
          section="followers"
          badge={
            filters.minFollowers || filters.maxFollowers ? 1 : undefined
          }
        />
        {expandedSections.followers && (
          <div className="space-y-3 pt-2">
            <Slider
              min={0}
              max={1000000}
              step={1000}
              value={[
                filters.minFollowers || 0,
                filters.maxFollowers || 1000000,
              ]}
              onValueChange={([min, max]) => {
                onFiltersChange({
                  ...filters,
                  minFollowers: min > 0 ? min : undefined,
                  maxFollowers: max < 1000000 ? max : undefined,
                });
              }}
              formatLabel={formatNumber}
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="최소"
                value={filters.minFollowers || ""}
                onChange={(e) =>
                  updateFilter(
                    "minFollowers",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="h-8 text-xs"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="number"
                placeholder="최대"
                value={filters.maxFollowers || ""}
                onChange={(e) =>
                  updateFilter(
                    "maxFollowers",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Engagement Rate */}
      <div>
        <SectionHeader
          title="참여율"
          section="engagement"
          badge={filters.minEngagementRate ? 1 : undefined}
        />
        {expandedSections.engagement && (
          <div className="space-y-3 pt-2">
            <Slider
              min={0}
              max={20}
              step={0.5}
              value={[
                filters.minEngagementRate || 0,
                filters.maxEngagementRate || 20,
              ]}
              onValueChange={([min, max]) => {
                onFiltersChange({
                  ...filters,
                  minEngagementRate: min > 0 ? min : undefined,
                  maxEngagementRate: max < 20 ? max : undefined,
                });
              }}
              formatLabel={(v) => `${v}%`}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Trust Score */}
      <div>
        <SectionHeader
          title="신뢰점수"
          section="trust"
          badge={filters.minTrustScore ? 1 : undefined}
        />
        {expandedSections.trust && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="최소 점수 (0-100)"
                value={filters.minTrustScore || ""}
                onChange={(e) =>
                  updateFilter(
                    "minTrustScore",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="h-8 text-xs"
                min={0}
                max={100}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              신뢰점수가 높을수록 팔로워/좋아요 품질이 좋습니다
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Ad Rate */}
      <div>
        <SectionHeader
          title="광고비율"
          section="adRate"
          badge={filters.maxAdRate ? 1 : undefined}
        />
        {expandedSections.adRate && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="최대 광고비율 (%)"
                value={filters.maxAdRate || ""}
                onChange={(e) =>
                  updateFilter(
                    "maxAdRate",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="h-8 text-xs"
                min={0}
                max={100}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              광고 게시물 비율이 낮을수록 자연스러운 홍보가 가능합니다
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Additional Options */}
      <div>
        <SectionHeader
          title="추가 옵션"
          section="options"
          badge={
            filters.isVerified || filters.isBusiness || filters.gender
              ? 1
              : undefined
          }
        />
        {expandedSections.options && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={filters.isVerified || false}
                onCheckedChange={(checked) =>
                  updateFilter("isVerified", checked || undefined)
                }
              />
              <Label htmlFor="verified" className="text-xs cursor-pointer">
                공식 인증 계정만
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="business"
                checked={filters.isBusiness || false}
                onCheckedChange={(checked) =>
                  updateFilter("isBusiness", checked || undefined)
                }
              />
              <Label htmlFor="business" className="text-xs cursor-pointer">
                비즈니스 계정만
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">성별</Label>
              <Select
                value={filters.gender || "all"}
                onValueChange={(value) =>
                  updateFilter(
                    "gender",
                    value === "all" ? undefined : (value as "M" | "F")
                  )
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="M">남성</SelectItem>
                  <SelectItem value="F">여성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
