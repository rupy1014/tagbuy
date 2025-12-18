import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  Users,
  BarChart3
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            TagBuy
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">로그인</Button>
            </Link>
            <Link href="/auth/register">
              <Button>무료로 시작하기</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
            에스크로 <span className="text-primary">0.5%</span> + PG 실비
            <br />
            <span className="text-primary">10분</span> 만에 정산받는
            <br />
            인플루언서 마케팅 플랫폼
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            자체 PG + 전자대금예치업 보유로 경쟁사 대비 73% 저렴한 수수료.
            <br />
            광고주는 투명한 비용으로, 인플루언서는 빠른 정산으로.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register?type=advertiser">
              <Button size="lg" className="w-full sm:w-auto">
                광고주로 시작하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/register?type=influencer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                인플루언서로 시작하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features for Advertisers */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">광고주를 위한 기능</h2>
          <p className="text-center text-muted-foreground mb-12">
            투명한 수수료와 강력한 관리 도구로 효율적인 마케팅을 경험하세요
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">투명한 수수료</h3>
              <p className="text-muted-foreground">
                에스크로 0.5% + PG 실비만 부담. 가상계좌 사용 시 총 0.8%로 경쟁사 대비 73% 절감.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI 인플루언서 매칭</h3>
              <p className="text-muted-foreground">
                캠페인 목표에 최적화된 인플루언서를 AI가 자동 추천. 가짜 팔로워 자동 필터링.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">실시간 성과 분석</h3>
              <p className="text-muted-foreground">
                도달률, 인게이지먼트, 전환율을 실시간으로 확인. 자동 리포트 생성.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features for Influencers */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">인플루언서를 위한 기능</h2>
          <p className="text-center text-muted-foreground mb-12">
            빠른 정산과 편리한 캠페인 관리로 수익에 집중하세요
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">10분 내 정산</h3>
              <p className="text-muted-foreground">
                광고주 승인 후 10분 이내 정산 완료. 24시간 365일 언제든 출금 가능.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI 캠페인 매칭</h3>
              <p className="text-muted-foreground">
                내 프로필에 맞는 캠페인을 AI가 자동 추천. 매칭률 높은 순으로 정렬.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">간편한 콘텐츠 제출</h3>
              <p className="text-muted-foreground">
                URL 입력만으로 콘텐츠 제출. AI가 자동으로 가이드라인 준수 여부 검증.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">수수료 비교</h2>
          <div className="max-w-2xl mx-auto">
            <div className="bg-background rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-4 text-left">항목</th>
                    <th className="px-6 py-4 text-center">경쟁사</th>
                    <th className="px-6 py-4 text-center text-primary">TagBuy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-6 py-4">플랫폼 수수료</td>
                    <td className="px-6 py-4 text-center">3%</td>
                    <td className="px-6 py-4 text-center font-semibold text-primary">0.5%</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-6 py-4">PG 수수료 (가상계좌)</td>
                    <td className="px-6 py-4 text-center">포함</td>
                    <td className="px-6 py-4 text-center font-semibold text-primary">0.3%</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-6 py-4">총 비용 (1,000만원 기준)</td>
                    <td className="px-6 py-4 text-center">30만원</td>
                    <td className="px-6 py-4 text-center font-semibold text-primary">8만원</td>
                  </tr>
                  <tr className="border-t bg-primary/5">
                    <td className="px-6 py-4 font-semibold">절감액</td>
                    <td className="px-6 py-4 text-center">-</td>
                    <td className="px-6 py-4 text-center font-bold text-primary">22만원 (73%)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground mb-8">
            무료로 가입하고 첫 캠페인을 시작해보세요
          </p>
          <Link href="/auth/register">
            <Button size="lg">
              무료로 시작하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-2xl font-bold text-primary">TagBuy</div>
            <div className="text-sm text-muted-foreground">
              © 2024 TagBuy. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
