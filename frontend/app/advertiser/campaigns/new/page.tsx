"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Check, DollarSign, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useBootpayWidget } from "@/hooks/usePayment";

const STEPS = [
  { id: 1, title: "기본 정보" },
  { id: 2, title: "타겟 설정" },
  { id: 3, title: "예산 및 일정" },
  { id: 4, title: "가이드라인" },
  { id: 5, title: "결제" },
];

const CATEGORIES = [
  { value: "beauty", label: "뷰티" },
  { value: "fashion", label: "패션" },
  { value: "food", label: "음식" },
  { value: "travel", label: "여행" },
  { value: "lifestyle", label: "라이프스타일" },
  { value: "fitness", label: "피트니스" },
  { value: "tech", label: "테크" },
  { value: "parenting", label: "육아" },
  { value: "pet", label: "반려동물" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const {
    isScriptLoaded,
    isWidgetReady,
    isTermsAccepted,
    selectedMethod,
    error: widgetError,
    renderWidget,
    requestPayment,
    updatePrice,
    destroyWidget,
  } = useBootpayWidget();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1
    title: "",
    goal: "brand_awareness",
    category: "",
    description: "",
    // Step 2
    minFollowers: 1000,
    maxFollowers: 100000,
    minEngagementRate: 1,
    targetInfluencerCount: 10,
    // Step 3
    budget: 1000000,
    rewardPerInfluencer: 100000,
    settlementRule: "standard",
    startDate: "",
    endDate: "",
    // Step 4
    productDescription: "",
    requiredMentions: "",
    prohibitedItems: "",
    hashtags: "",
    // Step 5
    pgFeePayerIsAdvertiser: true,
  });

  // Calculate costs
  const escrowFee = formData.budget * 0.005;
  const totalCost = formData.budget + escrowFee;

  const updateFormData = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Render widget when entering step 5
  useEffect(() => {
    if (currentStep === 5 && isScriptLoaded) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        renderWidget("bootpay-widget", totalCost);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isScriptLoaded, totalCost, renderWidget]);

  // Update widget price when budget changes
  useEffect(() => {
    if (currentStep === 5 && isWidgetReady) {
      updatePrice(totalCost);
    }
  }, [totalCost, currentStep, isWidgetReady, updatePrice]);

  // Cleanup widget when leaving step 5
  useEffect(() => {
    return () => {
      destroyWidget();
    };
  }, [destroyWidget]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 5) {
        destroyWidget();
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!isTermsAccepted) {
      setSubmitError("결제를 진행하려면 약관에 동의해주세요.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create campaign (draft)
      const campaignPayload = {
        title: formData.title,
        description: formData.description,
        budget: formData.budget,
        per_influencer_budget: formData.rewardPerInfluencer,
        pg_fee_payer: formData.pgFeePayerIsAdvertiser ? "advertiser" : "influencer",
        target_follower_min: formData.minFollowers,
        target_follower_max: formData.maxFollowers,
        min_engagement_rate: formData.minEngagementRate,
        max_influencers: formData.targetInfluencerCount,
        target_categories: formData.category ? [formData.category] : [],
        required_hashtags: formData.hashtags ? formData.hashtags.split(" ").filter(Boolean) : [],
        settlement_days: getSettlementDays(formData.settlementRule),
        start_date: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        guidelines: formData.productDescription,
      };

      const campaign = await api.createCampaign(campaignPayload as any);
      setCreatedCampaignId(campaign.id);

      // Step 2: Generate order info
      const orderId = `CAMP_${campaign.id}_${Date.now()}`;
      const orderName = `캠페인: ${formData.title}`;
      const redirectUrl = `${window.location.origin}/advertiser/campaigns/payment-result?campaign_id=${campaign.id}`;

      // Step 3: Request payment via BootpayWidget (will redirect)
      await requestPayment(orderId, orderName, redirectUrl);

      // Note: If we reach here without redirect, something went wrong
      // The payment should redirect to redirectUrl
    } catch (error) {
      console.error("Campaign creation error:", error);
      setSubmitError(
        error instanceof Error ? error.message : "캠페인 생성 중 오류가 발생했습니다"
      );
      setIsSubmitting(false);
    }
  };

  const displayError = submitError || widgetError?.message;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>
        <h1 className="text-2xl font-bold">새 캠페인 만들기</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep > step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 sm:w-24 h-1 mx-2 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-sm">
        {STEPS.map((step) => (
          <span
            key={step.id}
            className={`${currentStep === step.id ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {step.title}
          </span>
        ))}
      </div>

      {/* Error Display */}
      {displayError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">오류가 발생했습니다</p>
            <p className="text-sm text-destructive/80">{displayError}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "캠페인의 기본 정보를 입력하세요"}
            {currentStep === 2 && "원하는 인플루언서의 조건을 설정하세요"}
            {currentStep === 3 && "예산과 일정을 설정하세요"}
            {currentStep === 4 && "인플루언서를 위한 가이드라인을 작성하세요"}
            {currentStep === 5 && "결제 정보를 확인하고 완료하세요"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">캠페인명</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData("title", e.target.value)}
                  placeholder="예: 여름 신상품 프로모션"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">캠페인 목표</Label>
                <Select value={formData.goal} onValueChange={(v) => updateFormData("goal", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand_awareness">브랜드 인지도</SelectItem>
                    <SelectItem value="sales_conversion">판매 전환</SelectItem>
                    <SelectItem value="engagement">인게이지먼트</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select value={formData.category} onValueChange={(v) => updateFormData("category", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">캠페인 설명</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  placeholder="캠페인에 대한 상세 설명을 입력하세요"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </>
          )}

          {/* Step 2: Targeting */}
          {currentStep === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minFollowers">최소 팔로워</Label>
                  <Input
                    id="minFollowers"
                    type="number"
                    value={formData.minFollowers}
                    onChange={(e) => updateFormData("minFollowers", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFollowers">최대 팔로워</Label>
                  <Input
                    id="maxFollowers"
                    type="number"
                    value={formData.maxFollowers}
                    onChange={(e) => updateFormData("maxFollowers", parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minEngagementRate">최소 인게이지먼트율 (%)</Label>
                <Input
                  id="minEngagementRate"
                  type="number"
                  step="0.1"
                  value={formData.minEngagementRate}
                  onChange={(e) => updateFormData("minEngagementRate", parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetInfluencerCount">목표 인플루언서 수</Label>
                <Input
                  id="targetInfluencerCount"
                  type="number"
                  value={formData.targetInfluencerCount}
                  onChange={(e) => updateFormData("targetInfluencerCount", parseInt(e.target.value))}
                />
              </div>
            </>
          )}

          {/* Step 3: Budget & Schedule */}
          {currentStep === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="budget">총 예산 (원)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => updateFormData("budget", parseInt(e.target.value))}
                  min={500000}
                  step={100000}
                />
                <p className="text-xs text-muted-foreground">최소 50만원부터 가능합니다</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rewardPerInfluencer">인플루언서당 보상 (원)</Label>
                <Input
                  id="rewardPerInfluencer"
                  type="number"
                  value={formData.rewardPerInfluencer}
                  onChange={(e) => updateFormData("rewardPerInfluencer", parseInt(e.target.value))}
                  step={10000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlementRule">정산 규칙</Label>
                <Select
                  value={formData.settlementRule}
                  onValueChange={(v) => updateFormData("settlementRule", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">표준 (D+7)</SelectItem>
                    <SelectItem value="short">단기 (D+3)</SelectItem>
                    <SelectItem value="long">장기 (D+30)</SelectItem>
                    <SelectItem value="immediate">즉시 (D+1, +0.3%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateFormData("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateFormData("endDate", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Guidelines */}
          {currentStep === 4 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="productDescription">제품/서비스 설명</Label>
                <textarea
                  id="productDescription"
                  value={formData.productDescription}
                  onChange={(e) => updateFormData("productDescription", e.target.value)}
                  placeholder="제품 또는 서비스에 대한 상세 설명"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredMentions">필수 멘션 사항</Label>
                <textarea
                  id="requiredMentions"
                  value={formData.requiredMentions}
                  onChange={(e) => updateFormData("requiredMentions", e.target.value)}
                  placeholder="콘텐츠에 반드시 포함되어야 할 내용 (줄바꿈으로 구분)"
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prohibitedItems">금지 사항</Label>
                <textarea
                  id="prohibitedItems"
                  value={formData.prohibitedItems}
                  onChange={(e) => updateFormData("prohibitedItems", e.target.value)}
                  placeholder="콘텐츠에 포함되면 안 되는 내용 (줄바꿈으로 구분)"
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hashtags">필수 해시태그</Label>
                <Input
                  id="hashtags"
                  value={formData.hashtags}
                  onChange={(e) => updateFormData("hashtags", e.target.value)}
                  placeholder="#브랜드명 #이벤트명 (공백으로 구분)"
                />
              </div>
            </>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <>
              <div className="space-y-4">
                {/* PG Fee Payer Selection */}
                <div className="space-y-2">
                  <Label>PG 수수료 부담 주체</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateFormData("pgFeePayerIsAdvertiser", true)}
                      className={`p-4 border rounded-lg text-left ${
                        formData.pgFeePayerIsAdvertiser ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <p className="font-medium">광고주가 부담</p>
                      <p className="text-sm text-muted-foreground">인플루언서 100% 수령</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFormData("pgFeePayerIsAdvertiser", false)}
                      className={`p-4 border rounded-lg text-left ${
                        !formData.pgFeePayerIsAdvertiser ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <p className="font-medium">인플루언서가 부담</p>
                      <p className="text-sm text-muted-foreground">광고주 비용 절감</p>
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Cost Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>광고비</span>
                    <span>{formatCurrency(formData.budget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>에스크로 수수료 (0.5%)</span>
                    <span>{formatCurrency(escrowFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>PG 수수료</span>
                    <span>결제 수단에 따라 상이</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>기본 결제 금액</span>
                    <span className="text-primary">{formatCurrency(totalCost)}</span>
                  </div>
                </div>

                <Separator />

                {/* Bootpay Widget Container */}
                <div className="space-y-2">
                  <Label>결제 수단 선택</Label>
                  <div
                    id="bootpay-widget"
                    className="min-h-[300px] border rounded-lg bg-white"
                  >
                    {!isScriptLoaded && (
                      <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">결제 모듈 로딩 중...</span>
                      </div>
                    )}
                  </div>
                  {selectedMethod && (
                    <p className="text-sm text-muted-foreground">
                      선택된 결제 수단: <span className="font-medium">{selectedMethod}</span>
                    </p>
                  )}
                </div>

                {/* Terms Notice */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>* 결제 완료 후 에스크로에 예치되며, 인플루언서 콘텐츠 승인 후 자동 정산됩니다.</p>
                  <p>* 캠페인 취소 시 수수료를 제외한 금액이 환불됩니다.</p>
                  {!isTermsAccepted && isWidgetReady && (
                    <p className="text-amber-600 mt-2">* 결제를 진행하려면 위의 약관에 동의해주세요.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          이전
        </Button>
        {currentStep < 5 ? (
          <Button onClick={handleNext}>
            다음
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isTermsAccepted}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                결제하고 캠페인 시작
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper function
function getSettlementDays(rule: string): number {
  switch (rule) {
    case "immediate":
      return 1;
    case "short":
      return 3;
    case "long":
      return 30;
    default:
      return 7;
  }
}
