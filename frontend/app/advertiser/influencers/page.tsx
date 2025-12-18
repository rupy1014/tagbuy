"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Download,
  UserPlus,
  Filter,
  X,
  Loader2,
} from "lucide-react";
import { FilterPanel } from "@/components/influencer/filter-panel";
import { InfluencerTable } from "@/components/influencer/influencer-table";
import type { Influencer, InfluencerSearchParams } from "@/types";
import { cn, formatNumber, getPlatformLabel, getCategoryLabel } from "@/lib/utils";
import { api } from "@/lib/api";

export default function InfluencersPage() {
  const [filters, setFilters] = useState<InfluencerSearchParams>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<InfluencerSearchParams["sortBy"]>("follower_count");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(true);

  // API data state
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch influencers from API
  const fetchInfluencers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: InfluencerSearchParams = {
        ...filters,
        query: searchQuery || undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      };

      const response = await api.getInfluencers(params);
      setInfluencers(response.items);
      setTotalCount(response.total);
    } catch (err) {
      console.error("Failed to fetch influencers:", err);
      setError("인플루언서 목록을 불러오는데 실패했습니다.");
      setInfluencers([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery, sortBy, sortOrder, page, limit]);

  // Fetch data on mount and when params change
  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, searchQuery, sortBy, sortOrder]);

  const handleFiltersChange = (newFilters: InfluencerSearchParams) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInfluencers();
  };

  const getActiveFilterCount = () => {
    return Object.keys(filters).filter(
      (key) => filters[key as keyof InfluencerSearchParams] !== undefined
    ).length;
  };

  const removeFilter = (key: keyof InfluencerSearchParams) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    handleFiltersChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">인플루언서 검색</h1>
          <p className="text-muted-foreground">
            {formatNumber(totalCount)}명의 인플루언서 중에서 캠페인에 적합한 파트너를 찾아보세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="default" size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              {selectedIds.length}명 초대하기
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="유저네임으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={cn(showFilterPanel && "bg-accent")}
        >
          <Filter className="mr-2 h-4 w-4" />
          필터
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
      </form>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">적용된 필터:</span>
          {filters.platform && (
            <Badge variant="secondary" className="gap-1">
              {getPlatformLabel(filters.platform)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("platform")}
              />
            </Badge>
          )}
          {filters.tier && (
            <Badge variant="secondary" className="gap-1">
              {filters.tier}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("tier")}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {getCategoryLabel(filters.category)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("category")}
              />
            </Badge>
          )}
          {(filters.minFollowers || filters.maxFollowers) && (
            <Badge variant="secondary" className="gap-1">
              팔로워: {filters.minFollowers ? formatNumber(filters.minFollowers) : "0"} -{" "}
              {filters.maxFollowers ? formatNumber(filters.maxFollowers) : "무제한"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const newFilters = { ...filters };
                  delete newFilters.minFollowers;
                  delete newFilters.maxFollowers;
                  handleFiltersChange(newFilters);
                }}
              />
            </Badge>
          )}
          {filters.minEngagementRate && (
            <Badge variant="secondary" className="gap-1">
              참여율 {filters.minEngagementRate}%+
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("minEngagementRate")}
              />
            </Badge>
          )}
          {filters.isVerified && (
            <Badge variant="secondary" className="gap-1">
              인증됨
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("isVerified")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
          <Button
            variant="link"
            size="sm"
            className="ml-2 text-destructive"
            onClick={fetchInfluencers}
          >
            다시 시도
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filter Panel */}
        {showFilterPanel && (
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            totalCount={totalCount}
          />
        )}

        {/* Table */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0">
            {isLoading && influencers.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <InfluencerTable
                influencers={influencers}
                totalCount={totalCount}
                page={page}
                limit={limit}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onPageChange={setPage}
                onLimitChange={setLimit}
                onSortChange={handleSortChange}
                onSelect={setSelectedIds}
                selectedIds={selectedIds}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
