"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Zap, Wallet, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Mock data
const accountInfo = {
  bankName: "국민은행",
  accountNumber: "123-456-789012",
  accountHolder: "김뷰티",
  withdrawable: 1700000,
};

export default function WithdrawPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const numAmount = parseInt(amount.replace(/,/g, "")) || 0;
  const isValidAmount = numAmount >= 10000 && numAmount <= accountInfo.withdrawable;

  const handleAmountChange = (value: string) => {
    // Remove non-numeric characters except comma
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue) {
      setAmount(parseInt(numericValue).toLocaleString());
    } else {
      setAmount("");
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toLocaleString());
  };

  const handleWithdraw = async () => {
    if (!isValidAmount) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">출금 요청 완료!</h2>
            <p className="text-muted-foreground mb-4">
              {formatCurrency(numAmount)}이 10분 내에 입금됩니다
            </p>
            <div className="bg-muted p-4 rounded-lg text-sm mb-6">
              <p>{accountInfo.bankName} {accountInfo.accountNumber}</p>
              <p className="text-muted-foreground">{accountInfo.accountHolder}</p>
            </div>
            <Button onClick={() => router.push("/influencer/earnings")} className="w-full">
              수익 관리로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>
        <h1 className="text-2xl font-bold">출금하기</h1>
      </div>

      {/* Balance Card */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-5 w-5" />
            <span className="text-sm opacity-90">출금 가능 금액</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(accountInfo.withdrawable)}</p>
        </CardContent>
      </Card>

      {/* Withdraw Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">출금 금액</CardTitle>
          <CardDescription>최소 1만원부터 출금 가능합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">금액 입력</Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="text-right pr-8 text-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                원
              </span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleQuickAmount(100000)}
            >
              +10만
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleQuickAmount(500000)}
            >
              +50만
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleQuickAmount(accountInfo.withdrawable)}
            >
              전액
            </Button>
          </div>

          {numAmount > 0 && numAmount < 10000 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>최소 출금 금액은 1만원입니다</span>
            </div>
          )}

          {numAmount > accountInfo.withdrawable && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>출금 가능 금액을 초과했습니다</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">입금 계좌</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{accountInfo.bankName}</p>
              <p className="text-sm text-muted-foreground">{accountInfo.accountNumber}</p>
              <p className="text-sm text-muted-foreground">{accountInfo.accountHolder}</p>
            </div>
            <Button variant="ghost" size="sm">
              변경
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">즉시 출금</p>
            <p className="text-muted-foreground">
              출금 요청 후 10분 이내에 등록된 계좌로 입금됩니다.
              출금 수수료는 무료입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleWithdraw}
        className="w-full"
        size="lg"
        disabled={!isValidAmount || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            처리 중...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            {numAmount > 0 ? `${formatCurrency(numAmount)} 출금하기` : "출금하기"}
          </>
        )}
      </Button>
    </div>
  );
}
