"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/common/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  RefreshCw,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

// Mock data
const discoveryStats = {
  totalInfluencers: 15420,
  byTier: {
    nano: 8500,
    micro: 5200,
    macro: 1500,
    mega: 220,
  },
  byCategory: {
    뷰티: 3200,
    패션: 2800,
    음식: 2500,
    여행: 2100,
    라이프스타일: 1800,
    피트니스: 1500,
    육아: 900,
    반려동물: 420,
    테크: 200,
  },
  recentlySynced24h: 450,
};

const categories = [
  { key: "beauty", name: "뷰티", hashtags: ["뷰티", "메이크업", "스킨케어"], priority: 1 },
  { key: "fashion", name: "패션", hashtags: ["패션", "ootd", "데일리룩"], priority: 2 },
  { key: "food", name: "음식", hashtags: ["맛집", "먹스타그램", "카페"], priority: 3 },
  { key: "travel", name: "여행", hashtags: ["여행", "국내여행", "제주도"], priority: 4 },
  { key: "lifestyle", name: "라이프스타일", hashtags: ["일상", "데일리", "라이프"], priority: 5 },
];

const recentRuns = [
  {
    id: "1",
    type: "full",
    status: "completed",
    startedAt: "2024-12-15 03:00",
    completedAt: "2024-12-15 04:30",
    newInfluencers: 128,
    updatedInfluencers: 342,
  },
  {
    id: "2",
    type: "category",
    category: "뷰티",
    status: "completed",
    startedAt: "2024-12-14 15:00",
    completedAt: "2024-12-14 15:20",
    newInfluencers: 45,
    updatedInfluencers: 120,
  },
  {
    id: "3",
    type: "hashtag",
    hashtag: "#스킨케어",
    status: "failed",
    startedAt: "2024-12-14 10:00",
    error: "Rate limit exceeded",
  },
];

export default function DiscoveryPage() {
  const [hashtag, setHashtag] = useState("");
  const [category, setCategory] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const handleRunHashtag = async () => {
    if (!hashtag) return;
    setIsRunning(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsRunning(false);
  };

  const handleRunCategory = async () => {
    if (!category) return;
    setIsRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsRunning(false);
  };

  const handleRunFull = async () => {
    setIsRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">인플루언서 발굴 관리</h1>
        <p className="text-muted-foreground">해시태그 크롤링을 통해 인플루언서를 발굴합니다</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="총 인플루언서"
          value={formatNumber(discoveryStats.totalInfluencers)}
          icon={Database}
        />
        <StatsCard
          title="나노 (1K-10K)"
          value={formatNumber(discoveryStats.byTier.nano)}
        />
        <StatsCard
          title="마이크로 (10K-100K)"
          value={formatNumber(discoveryStats.byTier.micro)}
        />
        <StatsCard
          title="24시간 동기화"
          value={formatNumber(discoveryStats.recentlySynced24h)}
          icon={RefreshCw}
        />
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">카테고리별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(discoveryStats.byCategory).map(([cat, count]) => (
              <div key={cat} className="text-center p-3 rounded-lg bg-muted">
                <p className="text-lg font-semibold">{formatNumber(count)}</p>
                <p className="text-xs text-muted-foreground">{cat}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Discovery */}
      <Tabs defaultValue="hashtag">
        <TabsList>
          <TabsTrigger value="hashtag">해시태그 발굴</TabsTrigger>
          <TabsTrigger value="category">카테고리 발굴</TabsTrigger>
          <TabsTrigger value="full">전체 발굴</TabsTrigger>
        </TabsList>

        <TabsContent value="hashtag" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">해시태그 발굴</CardTitle>
              <CardDescription>특정 해시태그에서 인플루언서를 발굴합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hashtag">해시태그</Label>
                  <Input
                    id="hashtag"
                    placeholder="뷰티"
                    value={hashtag}
                    onChange={(e) => setHashtag(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-assign">카테고리 지정</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.key} value={cat.key}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleRunHashtag} disabled={!hashtag || isRunning}>
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                발굴 시작
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">카테고리 발굴</CardTitle>
              <CardDescription>카테고리의 모든 해시태그를 크롤링합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>카테고리 선택</Label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(cat.key)}
                      className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                        category === cat.key
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cat.hashtags.slice(0, 2).join(", ")}...
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleRunCategory} disabled={!category || isRunning}>
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                카테고리 발굴 시작
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">전체 발굴</CardTitle>
              <CardDescription>모든 카테고리에서 인플루언서를 발굴합니다 (시간 소요)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">주의사항</p>
                    <p className="text-yellow-700">
                      전체 발굴은 1-2시간 소요될 수 있습니다.
                      일반적으로 매일 새벽 3시에 자동 실행됩니다.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={handleRunFull} disabled={isRunning}>
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                전체 발굴 시작
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 실행 기록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  {run.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : run.status === "running" ? (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {run.type === "full" && "전체 발굴"}
                      {run.type === "category" && `카테고리: ${run.category}`}
                      {run.type === "hashtag" && `해시태그: ${run.hashtag}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {run.startedAt}
                      {run.completedAt && ` ~ ${run.completedAt}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {run.status === "completed" && (
                    <>
                      <p className="text-sm font-medium text-green-600">
                        +{run.newInfluencers} 신규
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {run.updatedInfluencers} 업데이트
                      </p>
                    </>
                  )}
                  {run.status === "failed" && (
                    <p className="text-sm text-red-600">{run.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
