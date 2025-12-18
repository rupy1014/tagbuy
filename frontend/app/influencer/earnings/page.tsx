"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/common/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Clock, TrendingUp, Zap, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// Mock data
const earningsSummary = {
  thisMonth: 2500000,
  pending: 800000,
  withdrawable: 1700000,
  totalEarnings: 15000000,
};

const earningsHistory = [
  {
    id: "1",
    campaignTitle: "스킨케어 신제품 체험단",
    amount: 150000,
    status: "settled",
    settledAt: "2024-12-10",
  },
  {
    id: "2",
    campaignTitle: "패션 브랜드 협업",
    amount: 200000,
    status: "settled",
    settledAt: "2024-12-08",
  },
  {
    id: "3",
    campaignTitle: "맛집 리뷰 캠페인",
    amount: 100000,
    status: "pending",
    expectedAt: "2024-12-20",
  },
  {
    id: "4",
    campaignTitle: "여행 브이로그",
    amount: 250000,
    status: "pending",
    expectedAt: "2024-12-22",
  },
  {
    id: "5",
    campaignTitle: "뷰티 제품 리뷰",
    amount: 120000,
    status: "settled",
    settledAt: "2024-12-05",
  },
];

const withdrawalHistory = [
  {
    id: "1",
    amount: 1000000,
    status: "completed",
    requestedAt: "2024-12-01",
    completedAt: "2024-12-01",
  },
  {
    id: "2",
    amount: 500000,
    status: "completed",
    requestedAt: "2024-11-15",
    completedAt: "2024-11-15",
  },
  {
    id: "3",
    amount: 800000,
    status: "completed",
    requestedAt: "2024-11-01",
    completedAt: "2024-11-01",
  },
];

const monthlyData = [
  { month: "7월", amount: 1200000 },
  { month: "8월", amount: 1500000 },
  { month: "9월", amount: 1800000 },
  { month: "10월", amount: 2200000 },
  { month: "11월", amount: 2000000 },
  { month: "12월", amount: 2500000 },
];

export default function EarningsPage() {
  const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">수익 관리</h1>
          <p className="text-muted-foreground">수익 현황과 출금 내역을 확인하세요</p>
        </div>
        <Link href="/influencer/withdraw">
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            즉시 출금하기
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="이번 달 수익"
          value={formatCurrency(earningsSummary.thisMonth)}
          icon={TrendingUp}
          trend={{ value: 25, isPositive: true }}
        />
        <StatsCard
          title="정산 대기"
          value={formatCurrency(earningsSummary.pending)}
          icon={Clock}
        />
        <StatsCard
          title="출금 가능"
          value={formatCurrency(earningsSummary.withdrawable)}
          icon={Wallet}
        />
        <StatsCard
          title="누적 수익"
          value={formatCurrency(earningsSummary.totalEarnings)}
          icon={DollarSign}
        />
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">월별 수익</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary/80 rounded-t-sm hover:bg-primary transition-colors"
                  style={{ height: `${(data.amount / maxAmount) * 100}%` }}
                />
                <p className="text-xs text-muted-foreground mt-2">{data.month}</p>
                <p className="text-xs font-medium">{(data.amount / 10000).toFixed(0)}만</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History Tabs */}
      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">정산 내역</TabsTrigger>
          <TabsTrigger value="withdrawals">출금 내역</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {earningsHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <ArrowDownRight className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.campaignTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.status === "settled"
                            ? `정산 완료 • ${item.settledAt}`
                            : `정산 예정 • ${item.expectedAt}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(item.amount)}
                      </p>
                      <Badge variant={item.status === "settled" ? "success" : "warning"}>
                        {item.status === "settled" ? "완료" : "대기"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {withdrawalHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <ArrowUpRight className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">출금</p>
                        <p className="text-sm text-muted-foreground">
                          신청: {item.requestedAt} • 완료: {item.completedAt}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">-{formatCurrency(item.amount)}</p>
                      <Badge variant="success">완료</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
