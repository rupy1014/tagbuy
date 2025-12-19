"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Import type from hooks/usePayment.ts - BootpayWidget type is declared there
import "@/hooks/usePayment";

// Bootpay Application ID
const BOOTPAY_APPLICATION_ID = process.env.NEXT_PUBLIC_BOOTPAY_APPLICATION_ID || "";

export default function TestPaymentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [price, setPrice] = useState(1000);
  const [orderName, setOrderName] = useState("테스트 상품");
  const [logs, setLogs] = useState<string[]>([]);
  const scriptLoadedRef = useRef(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // CDN 스크립트 로드
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    // 이미 로드되어 있는지 확인
    if (typeof window !== "undefined" && "BootpayWidget" in window) {
      addLog("BootpayWidget SDK 이미 로드됨");
      setIsScriptLoaded(true);
      scriptLoadedRef.current = true;
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.bootpay.co.kr/bootpay-widget-5.2.0.min.js";
    script.type = "application/javascript";
    script.async = true;
    script.onload = () => {
      addLog("BootpayWidget SDK 로드 완료");
      addLog("- CDN: bootpay-widget-5.2.0.min.js");
      setIsScriptLoaded(true);
      scriptLoadedRef.current = true;

      // 약간의 딜레이 후 위젯 렌더링
      setTimeout(() => {
        renderWidget();
      }, 100);
    };
    script.onerror = () => {
      addLog("BootpayWidget SDK 로드 실패");
    };
    document.head.appendChild(script);
  }, []);

  // 위젯 렌더링
  const renderWidget = () => {
    if (!window.BootpayWidget?.render) {
      addLog("BootpayWidget.render를 찾을 수 없습니다");
      return;
    }

    try {
      addLog(`위젯 렌더링 시작`);
      addLog(`- Application ID: ${BOOTPAY_APPLICATION_ID}`);
      addLog(`- 금액: ${price}원`);

      window.BootpayWidget.render("#bootpay-widget", {
        application_id: BOOTPAY_APPLICATION_ID,
        price: price,
        sandbox: true,
        use_terms: true,
        extra: {
          card_quota: [0, 2, 3, 4, 5, 6], // 일시불, 2~6개월
        },
        hooks: {
          ready: (data) => {
            addLog("위젯 렌더링 완료 (ready)");
            setIsWidgetReady(true);
          },
          allTermsAccepted: (data) => {
            addLog("모든 약관 동의 완료 (allTermsAccepted)");
            setIsTermsAccepted(true);
          },
          resize: (data) => {
            addLog(`위젯 크기 변경: ${data.height}px`);
          },
          paymentMethodUpdated: (data) => {
            addLog(`결제수단 선택: ${data.method}`);
          },
        },
      });

      addLog("위젯 render() 호출 완료");
    } catch (error: any) {
      addLog(`위젯 렌더링 에러: ${error?.message || error}`);
      console.error("Widget render error:", error);
    }
  };

  const handleRefreshWidget = () => {
    if (window.BootpayWidget?.destroy) {
      window.BootpayWidget.destroy();
    }
    setIsWidgetReady(false);
    setIsTermsAccepted(false);
    renderWidget();
  };

  const handlePayment = async () => {
    if (!window.BootpayWidget?.requestPayment) {
      addLog("BootpayWidget.requestPayment를 찾을 수 없습니다");
      return;
    }

    const orderId = `TEST_${Date.now()}`;
    const redirectUrl = `${window.location.origin}/test/payment/result`;

    addLog(`결제 요청 시작`);
    addLog(`- 주문번호: ${orderId}`);
    addLog(`- 상품명: ${orderName}`);
    addLog(`- 금액: ${price}원`);
    addLog(`- redirect_url: ${redirectUrl}`);

    setIsLoading(true);

    try {
      await window.BootpayWidget.requestPayment({
        order_name: orderName,
        order_id: orderId,
        redirect_url: redirectUrl,
      });
      // 성공 시 redirect_url로 이동됨
    } catch (error: any) {
      addLog(`결제 에러: ${error?.message || error}`);
      console.error("Payment error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bootpay 위젯 결제 테스트</h1>
      <p className="text-muted-foreground">
        CDN (bootpay-widget-5.2.0.min.js) - BootpayWidget.render() + requestPayment()
      </p>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Payment Widget */}
        <Card>
          <CardHeader>
            <CardTitle>결제 위젯</CardTitle>
            <CardDescription>
              Application ID: {BOOTPAY_APPLICATION_ID || "(미설정)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label>결제 금액 (원)</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                  min={100}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={handleRefreshWidget} disabled={!isScriptLoaded}>
                  위젯 새로고침
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>상품명</Label>
              <Input
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
              />
            </div>

            {/* Bootpay Widget Container */}
            <div
              id="bootpay-widget"
              className="min-h-[350px] border rounded-lg bg-white"
            />

            <Button
              onClick={handlePayment}
              disabled={isLoading || !BOOTPAY_APPLICATION_ID || !isWidgetReady}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  결제 진행 중...
                </>
              ) : (
                `${price.toLocaleString()}원 결제하기`
              )}
            </Button>

            {!BOOTPAY_APPLICATION_ID && (
              <p className="text-sm text-red-500">
                환경변수 NEXT_PUBLIC_BOOTPAY_APPLICATION_ID가 설정되지 않았습니다.
              </p>
            )}

            <div className="bg-muted p-3 rounded-lg text-xs space-y-1">
              <p><strong>SDK:</strong> BootpayWidget (CDN v5.2.0)</p>
              <p><strong>PG:</strong> KCP</p>
              <p><strong>SDK 상태:</strong> {isScriptLoaded ? "✅ 로드됨" : "⏳ 로딩중..."}</p>
              <p><strong>위젯 상태:</strong> {isWidgetReady ? "✅ 준비됨" : "⏳ 대기중..."}</p>
              <p><strong>약관 동의:</strong> {isTermsAccepted ? "✅ 완료" : "⏳ 대기중..."}</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Logs */}
        <Card>
          <CardHeader>
            <CardTitle>로그</CardTitle>
            <CardDescription>위젯 및 결제 과정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[450px] overflow-y-auto bg-gray-900 text-green-400 p-4 rounded font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">SDK 로딩중...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogs([])}
              className="mt-2"
            >
              로그 지우기
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>테스트 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>Bootpay 샌드박스 환경에서는 실제 결제가 발생하지 않습니다.</p>
            <p>테스트 카드번호: <code className="bg-muted px-2 py-1 rounded">4242-4242-4242-4242</code></p>
            <p>유효기간: 아무거나 / CVC: 아무거나</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
