"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  Gift,
  Banknote,
  Package,
  Plus,
  X
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";

const STEPS = [
  { id: 1, title: "기본 정보" },
  { id: 2, title: "타겟 설정" },
  { id: 3, title: "보상 설정" },
  { id: 4, title: "가이드라인" },
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

// 보상 유형
type RewardType = "product_only" | "cash_only" | "product_and_cash";

// 제품 정보 타입
interface ProductInfo {
  name: string;
  value: number;
  quantity: number;
  description: string;
}

export default function NewCampaignPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1: 기본 정보
    title: "",
    goal: "brand_awareness",
    category: "",
    description: "",

    // Step 2: 타겟 설정
    minFollowers: 1000,
    maxFollowers: 100000,
    minEngagementRate: 1,
    targetInfluencerCount: 10,

    // Step 3: 보상 설정
    rewardType: "product_only" as RewardType,
    // 제품 협찬
    products: [{ name: "", value: 0, quantity: 1, description: "" }] as ProductInfo[],
    // 현금 보상
    cashReward: 30000,
    // 일정
    startDate: "",
    endDate: "",

    // Step 4: 가이드라인
    productDescription: "",
    requiredMentions: "",
    prohibitedItems: "",
    hashtags: "",
    adDisclosure: true,  // 광고 표기 필수 여부
  });

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 제품 추가
  const addProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, { name: "", value: 0, quantity: 1, description: "" }],
    }));
  };

  // 제품 삭제
  const removeProduct = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  // 제품 정보 업데이트
  const updateProduct = (index: number, field: keyof ProductInfo, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  // 총 제품 가치 계산
  const totalProductValue = formData.products.reduce(
    (sum, p) => sum + (p.value * p.quantity),
    0
  );

  // 인플루언서당 총 보상 가치
  const totalRewardValue = (() => {
    switch (formData.rewardType) {
      case "product_only":
        return totalProductValue;
      case "cash_only":
        return formData.cashReward;
      case "product_and_cash":
        return totalProductValue + formData.cashReward;
      default:
        return 0;
    }
  })();

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 캠페인 생성 요청
      const campaignPayload = {
        title: formData.title,
        description: formData.description,
        goal: formData.goal,
        // 보상 정보
        reward_type: formData.rewardType,
        products: formData.rewardType !== "cash_only" ? formData.products : [],
        cash_reward: formData.rewardType !== "product_only" ? formData.cashReward : 0,
        total_reward_value: totalRewardValue,
        // 타겟 설정
        target_follower_min: formData.minFollowers,
        target_follower_max: formData.maxFollowers,
        min_engagement_rate: formData.minEngagementRate,
        max_influencers: formData.targetInfluencerCount,
        target_categories: formData.category ? [formData.category] : [],
        // 가이드라인
        required_hashtags: formData.hashtags ? formData.hashtags.split(" ").filter(Boolean) : [],
        guidelines: formData.productDescription,
        required_mentions: formData.requiredMentions,
        prohibited_items: formData.prohibitedItems,
        ad_disclosure_required: formData.adDisclosure,
        // 일정
        start_date: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      const campaign = await api.createCampaign(campaignPayload as any);

      // 캠페인 목록 페이지로 이동
      router.push(`/advertiser/campaigns?created=${campaign.id}`);
    } catch (error) {
      console.error("Campaign creation error:", error);
      setSubmitError(
        error instanceof Error ? error.message : "캠페인 생성 중 오류가 발생했습니다"
      );
      setIsSubmitting(false);
    }
  };

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
                className={`w-16 sm:w-32 h-1 mx-2 ${
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
      {submitError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">오류가 발생했습니다</p>
            <p className="text-sm text-destructive/80">{submitError}</p>
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
            {currentStep === 3 && "인플루언서에게 제공할 보상을 설정하세요"}
            {currentStep === 4 && "인플루언서를 위한 가이드라인을 작성하세요"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">캠페인명 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData("title", e.target.value)}
                  placeholder="예: 여름 신상품 체험단 모집"
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
                    <SelectItem value="product_review">제품 리뷰</SelectItem>
                    <SelectItem value="sales_conversion">판매 전환</SelectItem>
                    <SelectItem value="engagement">인게이지먼트</SelectItem>
                    <SelectItem value="event_promotion">이벤트 홍보</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
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
                  placeholder="캠페인에 대한 상세 설명을 입력하세요. 인플루언서들이 지원 여부를 결정할 때 참고합니다."
                  className="w-full min-h-[120px] px-3 py-2 border rounded-md text-sm"
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
                    onChange={(e) => updateFormData("minFollowers", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFollowers">최대 팔로워</Label>
                  <Input
                    id="maxFollowers"
                    type="number"
                    value={formData.maxFollowers}
                    onChange={(e) => updateFormData("maxFollowers", parseInt(e.target.value) || 0)}
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
                  onChange={(e) => updateFormData("minEngagementRate", parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  나노(1K-10K): 평균 5% | 마이크로(10K-100K): 평균 3.5%
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetInfluencerCount">모집 인원</Label>
                <Input
                  id="targetInfluencerCount"
                  type="number"
                  value={formData.targetInfluencerCount}
                  onChange={(e) => updateFormData("targetInfluencerCount", parseInt(e.target.value) || 1)}
                />
              </div>
            </>
          )}

          {/* Step 3: Reward Setting */}
          {currentStep === 3 && (
            <>
              {/* 보상 유형 선택 */}
              <div className="space-y-3">
                <Label>보상 유형 *</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => updateFormData("rewardType", "product_only")}
                    className={`p-4 border rounded-lg text-center transition-colors ${
                      formData.rewardType === "product_only"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:border-muted-foreground/50"
                    }`}
                  >
                    <Gift className="h-6 w-6 mx-auto mb-2 text-pink-500" />
                    <p className="font-medium text-sm">제품 협찬</p>
                    <p className="text-xs text-muted-foreground mt-1">제품만 제공</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData("rewardType", "cash_only")}
                    className={`p-4 border rounded-lg text-center transition-colors ${
                      formData.rewardType === "cash_only"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:border-muted-foreground/50"
                    }`}
                  >
                    <Banknote className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="font-medium text-sm">현금 보상</p>
                    <p className="text-xs text-muted-foreground mt-1">현금만 지급</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData("rewardType", "product_and_cash")}
                    className={`p-4 border rounded-lg text-center transition-colors ${
                      formData.rewardType === "product_and_cash"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:border-muted-foreground/50"
                    }`}
                  >
                    <Package className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="font-medium text-sm">제품 + 현금</p>
                    <p className="text-xs text-muted-foreground mt-1">복합 보상</p>
                  </button>
                </div>
              </div>

              <Separator />

              {/* 제품 협찬 정보 */}
              {(formData.rewardType === "product_only" || formData.rewardType === "product_and_cash") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>제품 협찬 정보</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                      <Plus className="h-4 w-4 mr-1" />
                      제품 추가
                    </Button>
                  </div>

                  {formData.products.map((product, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                      {formData.products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="absolute top-2 right-2 p-1 hover:bg-muted rounded"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">제품명 *</Label>
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(index, "name", e.target.value)}
                            placeholder="예: 스킨케어 세트"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">제품 가치 (원)</Label>
                            <Input
                              type="number"
                              value={product.value || ""}
                              onChange={(e) => updateProduct(index, "value", parseInt(e.target.value) || 0)}
                              placeholder="50000"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">수량</Label>
                            <Input
                              type="number"
                              min={1}
                              value={product.quantity}
                              onChange={(e) => updateProduct(index, "quantity", parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">제품 설명</Label>
                        <Input
                          value={product.description}
                          onChange={(e) => updateProduct(index, "description", e.target.value)}
                          placeholder="예: 클렌저 + 토너 + 세럼 3종 세트"
                        />
                      </div>
                    </div>
                  ))}

                  <p className="text-sm text-muted-foreground">
                    제품 총 가치: <span className="font-medium text-foreground">{formatCurrency(totalProductValue)}</span>
                  </p>
                </div>
              )}

              {/* 현금 보상 */}
              {(formData.rewardType === "cash_only" || formData.rewardType === "product_and_cash") && (
                <div className="space-y-2">
                  <Label htmlFor="cashReward">
                    현금 보상 (인플루언서당)
                  </Label>
                  <Input
                    id="cashReward"
                    type="number"
                    value={formData.cashReward}
                    onChange={(e) => updateFormData("cashReward", parseInt(e.target.value) || 0)}
                    step={5000}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    평균 현금 리워드: 3만원 (마이크로 인플루언서 기준)
                  </p>
                </div>
              )}

              <Separator />

              {/* 보상 요약 */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">보상 요약</p>
                <div className="text-sm space-y-1">
                  {(formData.rewardType === "product_only" || formData.rewardType === "product_and_cash") && (
                    <p>제품 협찬: {formData.products.filter(p => p.name).map(p => `${p.name} x${p.quantity}`).join(", ") || "-"}</p>
                  )}
                  {(formData.rewardType === "cash_only" || formData.rewardType === "product_and_cash") && (
                    <p>현금 보상: {formatCurrency(formData.cashReward)}</p>
                  )}
                  <Separator className="my-2" />
                  <p className="font-medium">
                    인플루언서당 총 보상 가치: <span className="text-primary">{formatCurrency(totalRewardValue)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {formData.targetInfluencerCount}명 모집 시 총 예상 비용: {formatCurrency(totalRewardValue * formData.targetInfluencerCount)}
                  </p>
                </div>
              </div>

              {/* 일정 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">모집 시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateFormData("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">모집 종료일</Label>
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
                <Label htmlFor="productDescription">제품/서비스 상세 설명 *</Label>
                <textarea
                  id="productDescription"
                  value={formData.productDescription}
                  onChange={(e) => updateFormData("productDescription", e.target.value)}
                  placeholder="인플루언서가 콘텐츠 제작 시 참고할 수 있는 제품/서비스에 대한 상세 설명을 입력하세요."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredMentions">필수 포함 내용</Label>
                <textarea
                  id="requiredMentions"
                  value={formData.requiredMentions}
                  onChange={(e) => updateFormData("requiredMentions", e.target.value)}
                  placeholder="콘텐츠에 반드시 포함되어야 할 내용을 작성하세요. (예: 브랜드명 언급, 제품 사용 후기, 구매 링크 등)"
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prohibitedItems">금지 사항</Label>
                <textarea
                  id="prohibitedItems"
                  value={formData.prohibitedItems}
                  onChange={(e) => updateFormData("prohibitedItems", e.target.value)}
                  placeholder="콘텐츠에 포함되면 안 되는 내용을 작성하세요. (예: 경쟁사 언급, 부정적 표현, 특정 단어 사용 등)"
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hashtags">필수 해시태그</Label>
                <Input
                  id="hashtags"
                  value={formData.hashtags}
                  onChange={(e) => updateFormData("hashtags", e.target.value)}
                  placeholder="#브랜드명 #제품명 #이벤트명 (공백으로 구분)"
                />
              </div>

              <Separator />

              {/* 광고 표기 */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="adDisclosure"
                  checked={formData.adDisclosure}
                  onCheckedChange={(checked) => updateFormData("adDisclosure", !!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="adDisclosure" className="cursor-pointer">
                    광고/협찬 표기 필수
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    공정거래위원회 지침에 따라 &quot;광고&quot;, &quot;협찬&quot;, &quot;제품제공&quot; 등의 표기가 필요합니다.
                  </p>
                </div>
              </div>

              {/* 최종 확인 안내 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">캠페인 등록 후 진행 과정</p>
                <ol className="list-decimal list-inside text-blue-800 space-y-1">
                  <li>캠페인이 등록되면 인플루언서들이 지원할 수 있습니다.</li>
                  <li>지원자 중 원하는 인플루언서를 선정하세요.</li>
                  <li>선정된 인플루언서가 콘텐츠를 제작하고 업로드합니다.</li>
                  <li>콘텐츠 검수 후 보상을 지급합니다.</li>
                </ol>
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
        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            다음
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title || !formData.category}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                등록 중...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                캠페인 등록하기
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
