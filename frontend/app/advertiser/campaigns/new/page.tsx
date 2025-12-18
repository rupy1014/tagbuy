"use client";

import { useState } from "react";
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
import { ArrowLeft, ArrowRight, Check, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  const [currentStep, setCurrentStep] = useState(1);
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
    paymentMethod: "card",
  });

  const updateFormData = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // TODO: Submit campaign
    console.log("Submit campaign:", formData);
    router.push("/advertiser/campaigns");
  };

  // Calculate costs
  const escrowFee = formData.budget * 0.005;
  const pgFeeRate = formData.paymentMethod === "card" ? 0.025 : 0.003;
  const pgFee = formData.budget * pgFeeRate;
  const totalCost = formData.budget + escrowFee + (formData.pgFeePayerIsAdvertiser ? pgFee : 0);

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

                <div className="space-y-2">
                  <Label>결제 수단</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateFormData("paymentMethod", "virtual")}
                      className={`p-4 border rounded-lg text-left ${
                        formData.paymentMethod === "virtual" ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <p className="font-medium">가상계좌</p>
                      <p className="text-sm text-muted-foreground">PG 0.3% (추천)</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFormData("paymentMethod", "card")}
                      className={`p-4 border rounded-lg text-left ${
                        formData.paymentMethod === "card" ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <p className="font-medium">카드 결제</p>
                      <p className="text-sm text-muted-foreground">PG 2.5%</p>
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>광고비</span>
                    <span>{formatCurrency(formData.budget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>에스크로 수수료 (0.5%)</span>
                    <span>{formatCurrency(escrowFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>PG 수수료 ({(pgFeeRate * 100).toFixed(1)}%)</span>
                    <span>
                      {formData.pgFeePayerIsAdvertiser ? formatCurrency(pgFee) : "인플루언서 부담"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>총 결제 금액</span>
                    <span className="text-primary">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          이전
        </Button>
        {currentStep < 5 ? (
          <Button onClick={handleNext}>
            다음
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit}>
            <DollarSign className="mr-2 h-4 w-4" />
            결제하고 캠페인 시작
          </Button>
        )}
      </div>
    </div>
  );
}
