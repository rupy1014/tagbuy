"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { PaymentPrepareResponse, PaymentVerifyResponse } from "@/types";

// Bootpay Application ID (from environment)
const BOOTPAY_APPLICATION_ID = process.env.NEXT_PUBLIC_BOOTPAY_APPLICATION_ID || "";
const BOOTPAY_SANDBOX = process.env.NEXT_PUBLIC_BOOTPAY_SANDBOX !== "false";

export type PaymentMethod = "card" | "vbank" | "bank" | "kakao" | "naver" | "toss";

// BootpayWidget global type declaration
declare global {
  interface Window {
    BootpayWidget: {
      render: (selector: string, config: BootpayWidgetConfig) => void;
      requestPayment: (params: BootpayPaymentParams) => Promise<void>;
      update: (config: Partial<BootpayWidgetConfig>) => void;
      destroy: () => void;
    };
  }
}

interface BootpayWidgetConfig {
  application_id: string;
  price: number;
  sandbox?: boolean;
  use_terms?: boolean;
  methods?: string[];
  extra?: {
    card_quota?: number[];
    [key: string]: unknown;
  };
  hooks?: {
    ready?: (data: unknown) => void;
    allTermsAccepted?: (data: unknown) => void;
    resize?: (data: { height: number }) => void;
    paymentMethodUpdated?: (data: { method: string }) => void;
  };
}

interface BootpayPaymentParams {
  order_name: string;
  order_id: string;
  redirect_url: string;
}

interface UseBootpayWidgetReturn {
  isScriptLoaded: boolean;
  isWidgetReady: boolean;
  isTermsAccepted: boolean;
  selectedMethod: string | null;
  error: Error | null;
  renderWidget: (containerId: string, price: number) => void;
  requestPayment: (orderId: string, orderName: string, redirectUrl: string) => Promise<void>;
  updatePrice: (price: number) => void;
  destroyWidget: () => void;
}

// Hook for loading Bootpay script
function useBootpayScript(): boolean {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if already loaded
    if (window.BootpayWidget) {
      setIsLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="bootpay"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsLoaded(true));
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = "https://js.bootpay.co.kr/bootpay-latest.min.js";
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error("Failed to load Bootpay script");
    document.head.appendChild(script);

    return () => {
      // Cleanup is handled by browser
    };
  }, []);

  return isLoaded;
}

// Main hook for BootpayWidget
export function useBootpayWidget(): UseBootpayWidgetReturn {
  const isScriptLoaded = useBootpayScript();
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const widgetRendered = useRef(false);

  const renderWidget = useCallback((containerId: string, price: number) => {
    if (!isScriptLoaded || !window.BootpayWidget) {
      console.error("Bootpay script not loaded");
      return;
    }

    // Destroy existing widget
    if (widgetRendered.current) {
      try {
        window.BootpayWidget.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    }

    try {
      window.BootpayWidget.render(`#${containerId}`, {
        application_id: BOOTPAY_APPLICATION_ID,
        price: price,
        sandbox: BOOTPAY_SANDBOX,
        use_terms: true,
        methods: ["card", "vbank", "kakao", "naverpay", "npay"],
        extra: {
          card_quota: [0, 2, 3, 4, 5, 6], // 일시불, 2~6개월
        },
        hooks: {
          ready: () => {
            setIsWidgetReady(true);
            setError(null);
          },
          allTermsAccepted: () => {
            setIsTermsAccepted(true);
          },
          resize: (data) => {
            // Widget resized, can adjust container if needed
            console.log("Widget height:", data.height);
          },
          paymentMethodUpdated: (data) => {
            setSelectedMethod(data.method);
            // Update card quota for card payments
            if (data.method === "card") {
              window.BootpayWidget.update({
                extra: { card_quota: [0, 2, 3, 4, 5, 6] },
              });
            }
          },
        },
      });
      widgetRendered.current = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("위젯 렌더링 실패");
      setError(error);
    }
  }, [isScriptLoaded]);

  const requestPayment = useCallback(async (
    orderId: string,
    orderName: string,
    redirectUrl: string
  ): Promise<void> => {
    if (!isScriptLoaded || !window.BootpayWidget) {
      throw new Error("Bootpay script not loaded");
    }

    if (!isTermsAccepted) {
      throw new Error("약관에 동의해주세요");
    }

    await window.BootpayWidget.requestPayment({
      order_name: orderName,
      order_id: orderId,
      redirect_url: redirectUrl,
    });
  }, [isScriptLoaded, isTermsAccepted]);

  const updatePrice = useCallback((price: number) => {
    if (isScriptLoaded && window.BootpayWidget && widgetRendered.current) {
      window.BootpayWidget.update({ price });
    }
  }, [isScriptLoaded]);

  const destroyWidget = useCallback(() => {
    if (isScriptLoaded && window.BootpayWidget && widgetRendered.current) {
      try {
        window.BootpayWidget.destroy();
        widgetRendered.current = false;
        setIsWidgetReady(false);
        setIsTermsAccepted(false);
        setSelectedMethod(null);
      } catch (e) {
        // Ignore destroy errors
      }
    }
  }, [isScriptLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyWidget();
    };
  }, [destroyWidget]);

  return {
    isScriptLoaded,
    isWidgetReady,
    isTermsAccepted,
    selectedMethod,
    error,
    renderWidget,
    requestPayment,
    updatePrice,
    destroyWidget,
  };
}

// Legacy hook for backward compatibility (uses direct SDK method)
interface PaymentOptions {
  campaignId: string;
  paymentMethod?: PaymentMethod;
  onSuccess?: (result: PaymentVerifyResponse) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

interface UsePaymentReturn {
  isLoading: boolean;
  isPreparing: boolean;
  isVerifying: boolean;
  error: Error | null;
  prepareData: PaymentPrepareResponse | null;
  requestPayment: (options: PaymentOptions) => Promise<PaymentVerifyResponse | null>;
  preparePayment: (campaignId: string, paymentMethod?: PaymentMethod) => Promise<PaymentPrepareResponse>;
}

export function usePayment(): UsePaymentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [prepareData, setPrepareData] = useState<PaymentPrepareResponse | null>(null);

  const preparePayment = useCallback(async (
    campaignId: string,
    paymentMethod?: PaymentMethod
  ): Promise<PaymentPrepareResponse> => {
    setIsPreparing(true);
    setError(null);

    try {
      const data = await api.preparePayment(campaignId, paymentMethod);
      setPrepareData(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("결제 준비 중 오류가 발생했습니다");
      setError(error);
      throw error;
    } finally {
      setIsPreparing(false);
    }
  }, []);

  const requestPayment = useCallback(async (
    options: PaymentOptions
  ): Promise<PaymentVerifyResponse | null> => {
    // This is now a stub - use useBootpayWidget instead
    console.warn("usePayment.requestPayment is deprecated. Use useBootpayWidget instead.");
    return null;
  }, []);

  return {
    isLoading,
    isPreparing,
    isVerifying,
    error,
    prepareData,
    requestPayment,
    preparePayment,
  };
}

export default usePayment;
