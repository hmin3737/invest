"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { TRANSACTION_TYPES } from "@/lib/utils";

const schema = z
  .object({
    date: z.string().min(1, "날짜를 입력해주세요."),
    type: z.enum(["BUY", "SELL", "CASH_IN", "CASH_OUT", "DIVIDEND"]),
    ticker: z.string().optional(),
    tickerName: z.string().optional(),
    quantity: z.string().optional(),
    price: z.string().optional(),
    totalAmount: z.string().min(1, "금액을 입력해주세요."),
    priceType: z.enum(["MANUAL", "OPEN", "CLOSE"]),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const needsTicker = ["BUY", "SELL", "DIVIDEND"].includes(data.type);
      if (needsTicker && !data.ticker) return false;
      return true;
    },
    { message: "티커를 입력해주세요.", path: ["ticker"] }
  );

type FormData = z.infer<typeof schema>;

interface TransactionFormProps {
  portfolioId: string;
  onSuccess: () => void;
  initialData?: Partial<FormData> & { id?: string };
  portfolioCurrency?: string;
}

export default function TransactionForm({
  portfolioId,
  onSuccess,
  initialData,
  portfolioCurrency = "USD",
}: TransactionFormProps) {
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceInputCurrency, setPriceInputCurrency] = useState<"KRW" | "USD">("KRW");
  const [convertingRate, setConvertingRate] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: initialData?.date || new Date().toISOString().slice(0, 10),
      type: initialData?.type || "BUY",
      ticker: initialData?.ticker || "",
      tickerName: initialData?.tickerName || "",
      quantity: initialData?.quantity || "",
      price: initialData?.price || "",
      totalAmount: initialData?.totalAmount || "",
      priceType: initialData?.priceType || "MANUAL",
      notes: initialData?.notes || "",
    },
  });

  const watchType = watch("type");
  const watchPriceType = watch("priceType");
  const watchTicker = watch("ticker");
  const watchDate = watch("date");
  const watchQuantity = watch("quantity");
  const needsTicker = ["BUY", "SELL", "DIVIDEND"].includes(watchType);

  const fetchPrice = async () => {
    if (!watchTicker || !watchDate || watchPriceType === "MANUAL") return;
    setFetchingPrice(true);
    setPriceError(null);
    try {
      const res = await fetch(
        `/api/price?ticker=${encodeURIComponent(watchTicker)}&date=${watchDate}&priceType=${watchPriceType}&currency=${portfolioCurrency}`
      );
      const data = await res.json();
      if (!res.ok) {
        setPriceError(data.error || "가격 조회 실패");
      } else {
        setValue("price", String(data.price));
        // 수량이 있으면 totalAmount 자동 계산
        const qty = parseFloat(watchQuantity || "0");
        if (qty > 0) {
          setValue("totalAmount", String((qty * data.price).toFixed(0)));
        }
        // 티커 이름도 업데이트 (있으면)
        if (data.ticker && data.ticker !== watchTicker) {
          setValue("ticker", data.ticker);
        }
      }
    } finally {
      setFetchingPrice(false);
    }
  };

  // 자동조회 모드로 바뀌면 입력 통화를 KRW로 초기화
  useEffect(() => {
    if (watchPriceType !== "MANUAL") setPriceInputCurrency("KRW");
  }, [watchPriceType]);

  // USD 단가를 해당 날짜 환율로 KRW 환산
  const convertToKRW = async () => {
    const rawPrice = parseFloat(watch("price") || "0");
    if (!rawPrice || !watchDate) return;
    setConvertingRate(true);
    setPriceError(null);
    try {
      const res = await fetch(
        `/api/price?ticker=USDKRW%3DX&date=${watchDate}&priceType=CLOSE`
      );
      const data = await res.json();
      if (res.ok && data.price) {
        const converted = Math.round(rawPrice * data.price);
        setValue("price", String(converted));
        setPriceInputCurrency("KRW");
        const qty = parseFloat(watchQuantity || "0");
        if (qty > 0) {
          setValue("totalAmount", String(converted * qty));
        }
      } else {
        setPriceError("환율 조회 실패. 날짜를 확인해주세요.");
      }
    } finally {
      setConvertingRate(false);
    }
  };

  // 수량 또는 가격 변경 시 totalAmount 자동 계산
  const watchPrice = watch("price");
  const handleQtyOrPriceChange = () => {
    const qty = parseFloat(watch("quantity") || "0");
    const price = parseFloat(watch("price") || "0");
    if (qty > 0 && price > 0) {
      setValue("totalAmount", String((qty * price).toFixed(0)));
    }
  };

  const onSubmit = async (data: FormData) => {
    const url = initialData?.id
      ? `/api/portfolios/${portfolioId}/transactions/${initialData.id}`
      : `/api/portfolios/${portfolioId}/transactions`;
    const method = initialData?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        price: data.price ? parseFloat(data.price) : null,
        totalAmount: parseFloat(data.totalAmount),
      }),
    });

    if (res.ok) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 유형 선택 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">거래 유형</label>
        <div className="grid grid-cols-5 gap-1">
          {(Object.keys(TRANSACTION_TYPES) as Array<keyof typeof TRANSACTION_TYPES>).map(
            (key) => (
              <label
                key={key}
                className={`cursor-pointer text-center py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                  watchType === key
                    ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
                    : "bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  value={key}
                  {...register("type")}
                  className="sr-only"
                />
                {TRANSACTION_TYPES[key]}
              </label>
            )
          )}
        </div>
      </div>

      <Input
        label="날짜"
        type="date"
        {...register("date")}
        error={errors.date?.message}
      />

      {needsTicker && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="티커 심볼"
              placeholder="AAPL, 005930.KS"
              {...register("ticker")}
              error={errors.ticker?.message}
              hint="한국주식: 005930.KS 형식"
            />
            <Input
              label="종목명 (선택)"
              placeholder="Apple Inc."
              {...register("tickerName")}
            />
          </div>

          <Input
            label="수량"
            type="number"
            step="any"
            placeholder="10"
            {...register("quantity", { onChange: handleQtyOrPriceChange })}
          />

          {/* 가격 입력 방식 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">가격 입력 방식</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: "MANUAL", label: "직접 입력" },
                { value: "OPEN", label: "시가 자동" },
                { value: "CLOSE", label: "종가 자동" },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className={`cursor-pointer text-center py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                    watchPriceType === value
                      ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
                      : "bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    value={value}
                    {...register("priceType")}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                단가
                {priceInputCurrency === "USD" && (
                  <span className="ml-1.5 text-xs font-normal text-blue-400">(USD 입력 중)</span>
                )}
              </label>
              {portfolioCurrency === "KRW" && watchPriceType === "MANUAL" && (
                <div className="flex rounded-md overflow-hidden border border-slate-600 text-xs">
                  {(["KRW", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPriceInputCurrency(c)}
                      className={`px-2.5 py-1 font-medium transition-colors ${
                        priceInputCurrency === c
                          ? "bg-blue-500/30 text-blue-300"
                          : "bg-slate-700/50 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <input
                  type="number"
                  step="any"
                  placeholder={priceInputCurrency === "USD" ? "191.00" : "150.00"}
                  {...register("price", { onChange: handleQtyOrPriceChange })}
                  readOnly={watchPriceType !== "MANUAL"}
                  className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 bg-slate-800 border border-slate-700 hover:border-slate-600 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors duration-150"
                />
              </div>
              {watchPriceType !== "MANUAL" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={fetchPrice}
                  loading={fetchingPrice}
                >
                  가격 조회
                </Button>
              )}
              {watchPriceType === "MANUAL" && portfolioCurrency === "KRW" && priceInputCurrency === "USD" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={convertToKRW}
                  loading={convertingRate}
                >
                  → KRW 환산
                </Button>
              )}
            </div>
            {priceError && (
              <p className="text-xs text-red-400">{priceError}</p>
            )}
          </div>
        </>
      )}

      <Input
        label={
          watchType === "CASH_IN"
            ? "입금 금액"
            : watchType === "CASH_OUT"
            ? "출금 금액"
            : "총 거래 금액"
        }
        type="number"
        step="any"
        placeholder="1000000"
        {...register("totalAmount")}
        error={errors.totalAmount?.message}
      />

      <Input
        label="메모 (선택)"
        placeholder="거래 메모..."
        {...register("notes")}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {initialData?.id ? "수정 완료" : "거래 추가"}
        </Button>
      </div>
    </form>
  );
}
