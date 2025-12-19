"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

export default function PaymentResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      // Get params from URL (Bootpay redirects with these)
      const receiptId = searchParams.get("receipt_id");
      const orderId = searchParams.get("order_id");
      const campaignIdParam = searchParams.get("campaign_id");
      const errorMessage = searchParams.get("error_message");

      setCampaignId(campaignIdParam);

      // Check for error from Bootpay
      if (errorMessage) {
        setStatus("error");
        setMessage(decodeURIComponent(errorMessage));
        return;
      }

      // Verify payment with backend
      if (receiptId && orderId) {
        try {
          const result = await api.verifyPayment(receiptId, orderId);

          if (result.success) {
            setStatus("success");
            setMessage("결제가 성공적으로 완료되었습니다. 캠페인이 활성화됩니다.");
          } else {
            setStatus("error");
            setMessage(result.message || "결제 검증에 실패했습니다.");
          }
        } catch (error) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "결제 검증 중 오류가 발생했습니다."
          );
        }
      } else {
        // No receipt_id means payment was cancelled or failed
        setStatus("error");
        setMessage("결제가 완료되지 않았습니다. 다시 시도해주세요.");
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleGoToCampaign = () => {
    if (campaignId) {
      router.push(`/advertiser/campaigns/${campaignId}`);
    } else {
      router.push("/advertiser/campaigns");
    }
  };

  const handleRetry = () => {
    if (campaignId) {
      router.push(`/advertiser/campaigns/${campaignId}/payment`);
    } else {
      router.push("/advertiser/campaigns/new");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <Card>
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
              <CardTitle>결제 확인 중...</CardTitle>
              <CardDescription>잠시만 기다려주세요</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-green-600">결제 완료!</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-red-600">결제 실패</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "success" && (
            <Button onClick={handleGoToCampaign} className="w-full">
              캠페인 확인하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                다시 시도하기
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/advertiser/campaigns")}
                className="w-full"
              >
                캠페인 목록으로
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
