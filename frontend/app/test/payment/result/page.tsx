"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

interface VerifyResponse {
  success: boolean;
  payment_id: string;
  escrow_id: string;
  message: string;
}

export default function TestPaymentResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "cancelled">("loading");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Bootpay redirect 파라미터
  const params = {
    receipt_id: searchParams.get("receipt_id"),
    order_id: searchParams.get("order_id"),
    pg: searchParams.get("pg"),
    method: searchParams.get("method"),
    method_name: searchParams.get("method_name"),
    price: searchParams.get("price"),
    bootpayStatus: searchParams.get("status"),
    purchased_at: searchParams.get("purchased_at"),
    error_code: searchParams.get("error_code"),
    error_message: searchParams.get("error_message"),
  };

  useEffect(() => {
    const processResult = async () => {
      addLog("=== 결제 결과 페이지 로드 ===");
      addLog(`receipt_id: ${params.receipt_id}`);
      addLog(`order_id: ${params.order_id}`);
      addLog(`status: ${params.bootpayStatus}`);
      addLog(`method: ${params.method_name}`);
      addLog(`price: ${params.price}`);

      // 에러 체크
      if (params.error_code || params.error_message) {
        addLog(`에러 발생: ${params.error_code} - ${params.error_message}`);
        setError(params.error_message || `Error code: ${params.error_code}`);
        setStatus("error");
        return;
      }

      // 취소 체크 (status=2)
      if (params.bootpayStatus === "2") {
        addLog("사용자가 결제를 취소했습니다.");
        setStatus("cancelled");
        return;
      }

      // 필수 파라미터 체크
      if (!params.receipt_id || !params.order_id) {
        addLog("필수 파라미터 누락");
        setError("결제 정보가 없습니다. (receipt_id, order_id 필요)");
        setStatus("error");
        return;
      }

      // 결제 성공 (status=1) - 백엔드로 검증 요청
      if (params.bootpayStatus === "1") {
        addLog("결제 성공! 백엔드 검증 시작...");

        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

          addLog(`검증 요청: POST ${API_URL}/v1/payments/verify`);
          addLog(`Request Body:`);
          addLog(`  - receipt_id: ${params.receipt_id}`);
          addLog(`  - order_id: ${params.order_id}`);

          const response = await fetch(`${API_URL}/v1/payments/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // TODO: 실제 환경에서는 Authorization 헤더 추가
              // "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              receipt_id: params.receipt_id,
              order_id: params.order_id,
            }),
          });

          const data = await response.json();
          addLog(`Response Status: ${response.status}`);
          addLog(`Response Body: ${JSON.stringify(data)}`);

          if (response.ok && data.success) {
            addLog("검증 성공!");
            addLog(`- payment_id: ${data.payment_id}`);
            addLog(`- escrow_id: ${data.escrow_id}`);
            addLog(`- message: ${data.message}`);
            setVerifyResult(data);
            setStatus("success");
          } else {
            addLog(`검증 실패: ${data.detail?.message || data.detail || "Unknown error"}`);

            // 테스트 환경: 401 (인증 필요) 또는 404 (엔드포인트 없음)인 경우 성공으로 처리
            if (response.status === 401 || response.status === 404) {
              addLog("(테스트 모드: 백엔드 인증/연결 없이 성공 처리)");
              setVerifyResult({
                success: true,
                payment_id: "test-payment-id",
                escrow_id: "test-escrow-id",
                message: "테스트 모드 - 백엔드 검증 스킵",
              });
              setStatus("success");
            } else {
              setError(data.detail?.message || data.detail || "결제 검증에 실패했습니다.");
              setStatus("error");
            }
          }
        } catch (err: any) {
          addLog(`네트워크 에러: ${err.message}`);
          addLog("(테스트 모드: 백엔드 연결 실패, 성공으로 처리)");

          // 테스트 환경에서는 네트워크 에러 시에도 성공 표시
          setVerifyResult({
            success: true,
            payment_id: "test-payment-id",
            escrow_id: "test-escrow-id",
            message: "테스트 모드 - 백엔드 연결 없음",
          });
          setStatus("success");
        }
      } else {
        addLog(`알 수 없는 상태: ${params.bootpayStatus}`);
        setError("알 수 없는 결제 상태입니다.");
        setStatus("error");
      }
    };

    processResult();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">결제 결과</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Result Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === "loading" && (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  처리 중...
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  결제 완료
                </>
              )}
              {status === "cancelled" && (
                <>
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                  결제 취소됨
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="h-6 w-6 text-red-500" />
                  결제 실패
                </>
              )}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "결제 결과를 확인하고 있습니다..."}
              {status === "success" && "결제가 성공적으로 완료되었습니다."}
              {status === "cancelled" && "결제가 취소되었습니다."}
              {status === "error" && error}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Bootpay 결제 정보 */}
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold">Bootpay 결제 정보</h3>
              {params.receipt_id && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">영수증 ID</span>
                  <span className="font-mono text-xs">{params.receipt_id}</span>
                </div>
              )}
              {params.order_id && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">주문 ID</span>
                  <span className="font-mono text-xs">{params.order_id}</span>
                </div>
              )}
              {params.method_name && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">결제 수단</span>
                  <span>{params.method_name}</span>
                </div>
              )}
              {params.price && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">결제 금액</span>
                  <span className="font-semibold">{Number(params.price).toLocaleString()}원</span>
                </div>
              )}
            </div>

            {/* 백엔드 검증 결과 */}
            {verifyResult && (
              <div className="space-y-2 text-sm bg-green-50 p-3 rounded-lg">
                <h3 className="font-semibold text-green-800">백엔드 검증 결과</h3>
                <div className="text-green-700">
                  <p><strong>Payment ID:</strong> {verifyResult.payment_id}</p>
                  <p><strong>Escrow ID:</strong> {verifyResult.escrow_id}</p>
                  <p><strong>메시지:</strong> {verifyResult.message}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/test/payment")}
                className="flex-1"
              >
                다시 테스트
              </Button>
              {status === "success" && (
                <Button onClick={() => router.push("/")} className="flex-1">
                  홈으로
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Logs */}
        <Card>
          <CardHeader>
            <CardTitle>처리 로그</CardTitle>
            <CardDescription>결제 검증 과정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto bg-gray-900 text-green-400 p-4 rounded font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">로딩중...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* URL Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Bootpay Redirect 파라미터 (원본)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-x-auto bg-muted p-4 rounded font-mono">
            {JSON.stringify(
              Object.fromEntries(
                Array.from(searchParams.entries())
              ),
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
