"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  Camera,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Monitor,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Mock user data
const userData = {
  name: "김태업",
  email: "demo@tagbuy.kr",
  phone: "010-1234-5678",
  profileImage: "",
  createdAt: "2024-10-15",
};

const businessData = {
  companyName: "데모회사",
  businessNumber: "123-45-67890",
  representative: "김대표",
  businessType: "도소매업",
  businessItem: "전자상거래",
  address: "서울시 강남구 테헤란로 123",
  isVerified: true,
};

const paymentMethods = [
  {
    id: "1",
    type: "card",
    name: "신한카드",
    last4: "1234",
    isDefault: true,
  },
  {
    id: "2",
    type: "card",
    name: "삼성카드",
    last4: "5678",
    isDefault: false,
  },
];

const billingHistory = [
  { id: "1", date: "2024-12-15", description: "캠페인 결제 - 여름 신상품", amount: 5000000, status: "completed" },
  { id: "2", date: "2024-12-01", description: "캠페인 결제 - 스킨케어", amount: 3000000, status: "completed" },
  { id: "3", date: "2024-11-15", description: "캠페인 결제 - 맛집 리뷰", amount: 2000000, status: "completed" },
];

const devices = [
  { id: "1", name: "MacBook Pro", type: "desktop", lastActive: "현재 활성", location: "서울, 한국", current: true },
  { id: "2", name: "iPhone 15 Pro", type: "mobile", lastActive: "2시간 전", location: "서울, 한국", current: false },
];

const notifications = {
  email: {
    campaign: true,
    marketing: false,
    report: true,
  },
  push: {
    campaign: true,
    marketing: false,
    report: false,
  },
};

export default function MyPage() {
  const [editMode, setEditMode] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(notifications);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          마이페이지
        </h1>
        <p className="text-muted-foreground">계정 정보와 설정을 관리합니다</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="profile">계정 정보</TabsTrigger>
          <TabsTrigger value="business">사업자 정보</TabsTrigger>
          <TabsTrigger value="payment">결제 관리</TabsTrigger>
          <TabsTrigger value="security">보안 설정</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>기본 계정 정보를 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={userData.profileImage} />
                    <AvatarFallback className="text-2xl">{userData.name[0]}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{userData.name}</h3>
                  <p className="text-sm text-muted-foreground">가입일: {userData.createdAt}</p>
                </div>
              </div>

              <Separator />

              {/* Form */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" defaultValue={userData.name} disabled={!editMode} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" defaultValue={userData.email} disabled className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" defaultValue={userData.phone} disabled={!editMode} className="pl-10" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button onClick={() => setEditMode(false)}>저장</Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>취소</Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    정보 수정
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>알림 수신 방법을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">이메일 알림</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">캠페인 알림</p>
                        <p className="text-sm text-muted-foreground">신청, 승인, 콘텐츠 제출 알림</p>
                      </div>
                      <Switch checked={notificationSettings.email.campaign} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">리포트 알림</p>
                        <p className="text-sm text-muted-foreground">주간/월간 성과 리포트</p>
                      </div>
                      <Switch checked={notificationSettings.email.report} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">마케팅 알림</p>
                        <p className="text-sm text-muted-foreground">프로모션 및 새로운 기능 안내</p>
                      </div>
                      <Switch checked={notificationSettings.email.marketing} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>사업자 정보</CardTitle>
                  <CardDescription>사업자 등록 정보를 관리합니다</CardDescription>
                </div>
                {businessData.isVerified && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    인증완료
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>상호명</Label>
                  <Input value={businessData.companyName} disabled />
                </div>
                <div className="space-y-2">
                  <Label>사업자등록번호</Label>
                  <Input value={businessData.businessNumber} disabled />
                </div>
                <div className="space-y-2">
                  <Label>대표자명</Label>
                  <Input value={businessData.representative} disabled />
                </div>
                <div className="space-y-2">
                  <Label>업태</Label>
                  <Input value={businessData.businessType} disabled />
                </div>
                <div className="space-y-2">
                  <Label>업종</Label>
                  <Input value={businessData.businessItem} disabled />
                </div>
                <div className="space-y-2">
                  <Label>사업장 주소</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={businessData.address} disabled className="pl-10" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  사업자등록증 보기
                </Button>
                <Button variant="outline">사업자 정보 변경 요청</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-6">
          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>결제 수단</CardTitle>
                  <CardDescription>등록된 결제 수단을 관리합니다</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  결제 수단 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-8 bg-muted rounded">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{method.name}</span>
                          {method.isDefault && (
                            <Badge variant="secondary">기본</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">•••• {method.last4}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>결제 내역</CardTitle>
              <CardDescription>최근 결제 내역입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">{item.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.amount)}</p>
                      <Badge variant="secondary" className="text-green-600">
                        결제완료
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="link" className="mt-4 px-0">
                전체 내역 보기 →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>계정 보안을 위해 주기적으로 비밀번호를 변경해주세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">현재 비밀번호</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <Button>비밀번호 변경</Button>
            </CardContent>
          </Card>

          {/* Connected Devices */}
          <Card>
            <CardHeader>
              <CardTitle>로그인 기기</CardTitle>
              <CardDescription>현재 로그인된 기기 목록입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {device.type === "desktop" ? (
                        <Monitor className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <Smartphone className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{device.name}</span>
                          {device.current && (
                            <Badge className="bg-green-100 text-green-800">현재 기기</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {device.location} • {device.lastActive}
                        </p>
                      </div>
                    </div>
                    {!device.current && (
                      <Button variant="outline" size="sm">
                        로그아웃
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">계정 삭제</CardTitle>
              <CardDescription>
                계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                계정 삭제하기
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
