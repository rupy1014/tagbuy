"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth";

const advertiserSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  confirmPassword: z.string(),
  name: z.string().min(2, "이름을 입력하세요"),
  companyName: z.string().min(2, "회사명을 입력하세요"),
  businessNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

const influencerSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  confirmPassword: z.string(),
  name: z.string().min(2, "이름을 입력하세요"),
  instagramUsername: z.string().min(1, "인스타그램 아이디를 입력하세요"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type AdvertiserFormData = z.infer<typeof advertiserSchema>;
type InfluencerFormData = z.infer<typeof influencerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") || "advertiser";
  const [userType, setUserType] = useState<"advertiser" | "influencer">(
    defaultType as "advertiser" | "influencer"
  );
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [showError, setShowError] = useState(false);

  const advertiserForm = useForm<AdvertiserFormData>({
    resolver: zodResolver(advertiserSchema),
  });

  const influencerForm = useForm<InfluencerFormData>({
    resolver: zodResolver(influencerSchema),
  });

  const onAdvertiserSubmit = async (data: AdvertiserFormData) => {
    try {
      clearError();
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        type: "advertiser",
        companyName: data.companyName,
        businessNumber: data.businessNumber,
      });
      router.push("/advertiser/dashboard");
    } catch (err) {
      setShowError(true);
    }
  };

  const onInfluencerSubmit = async (data: InfluencerFormData) => {
    try {
      clearError();
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        type: "influencer",
        instagramUsername: data.instagramUsername,
      });
      router.push("/influencer/dashboard");
    } catch (err) {
      setShowError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-primary mb-2 inline-block">
            TagBuy
          </Link>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            TagBuy와 함께 시작하세요
          </CardDescription>
        </CardHeader>

        <Tabs value={userType} onValueChange={(v) => setUserType(v as "advertiser" | "influencer")}>
          <TabsList className="grid w-full grid-cols-2 mx-6" style={{ width: "calc(100% - 48px)" }}>
            <TabsTrigger value="advertiser">광고주</TabsTrigger>
            <TabsTrigger value="influencer">인플루언서</TabsTrigger>
          </TabsList>

          <TabsContent value="advertiser">
            <form onSubmit={advertiserForm.handleSubmit(onAdvertiserSubmit)}>
              <CardContent className="space-y-4">
                {showError && error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="adv-email">이메일</Label>
                  <Input
                    id="adv-email"
                    type="email"
                    placeholder="you@example.com"
                    {...advertiserForm.register("email")}
                  />
                  {advertiserForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {advertiserForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adv-name">담당자명</Label>
                  <Input
                    id="adv-name"
                    placeholder="홍길동"
                    {...advertiserForm.register("name")}
                  />
                  {advertiserForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {advertiserForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">회사명</Label>
                  <Input
                    id="companyName"
                    placeholder="주식회사 OO"
                    {...advertiserForm.register("companyName")}
                  />
                  {advertiserForm.formState.errors.companyName && (
                    <p className="text-sm text-destructive">
                      {advertiserForm.formState.errors.companyName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessNumber">사업자등록번호 (선택)</Label>
                  <Input
                    id="businessNumber"
                    placeholder="000-00-00000"
                    {...advertiserForm.register("businessNumber")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adv-password">비밀번호</Label>
                  <Input
                    id="adv-password"
                    type="password"
                    placeholder="••••••••"
                    {...advertiserForm.register("password")}
                  />
                  {advertiserForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {advertiserForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adv-confirmPassword">비밀번호 확인</Label>
                  <Input
                    id="adv-confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...advertiserForm.register("confirmPassword")}
                  />
                  {advertiserForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {advertiserForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "가입 중..." : "광고주로 가입하기"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="influencer">
            <form onSubmit={influencerForm.handleSubmit(onInfluencerSubmit)}>
              <CardContent className="space-y-4">
                {showError && error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="inf-email">이메일</Label>
                  <Input
                    id="inf-email"
                    type="email"
                    placeholder="you@example.com"
                    {...influencerForm.register("email")}
                  />
                  {influencerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {influencerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inf-name">이름</Label>
                  <Input
                    id="inf-name"
                    placeholder="홍길동"
                    {...influencerForm.register("name")}
                  />
                  {influencerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {influencerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagramUsername">인스타그램 아이디</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="instagramUsername"
                      className="pl-8"
                      placeholder="username"
                      {...influencerForm.register("instagramUsername")}
                    />
                  </div>
                  {influencerForm.formState.errors.instagramUsername && (
                    <p className="text-sm text-destructive">
                      {influencerForm.formState.errors.instagramUsername.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    입력하신 인스타그램 계정의 프로필 정보를 자동으로 가져옵니다
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inf-password">비밀번호</Label>
                  <Input
                    id="inf-password"
                    type="password"
                    placeholder="••••••••"
                    {...influencerForm.register("password")}
                  />
                  {influencerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {influencerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inf-confirmPassword">비밀번호 확인</Label>
                  <Input
                    id="inf-confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...influencerForm.register("confirmPassword")}
                  />
                  {influencerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {influencerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "가입 중..." : "인플루언서로 가입하기"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>

        <div className="px-6 pb-6">
          <p className="text-sm text-muted-foreground text-center">
            이미 계정이 있으신가요?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
