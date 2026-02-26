"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import TransactionForm from "@/components/TransactionForm";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  TRANSACTION_TYPES,
  type TxType,
} from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  type: string;
  ticker?: string | null;
  tickerName?: string | null;
  quantity?: number | null;
  price?: number | null;
  totalAmount: number;
  priceType: string;
  notes?: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  portfolioId: string;
  currency: string;
  onRefresh: () => void;
}

const TYPE_BADGE: Record<string, "blue" | "purple" | "success" | "danger" | "warning"> = {
  BUY: "blue",
  SELL: "purple",
  CASH_IN: "success",
  CASH_OUT: "danger",
  DIVIDEND: "warning",
};

export default function TransactionTable({
  transactions,
  portfolioId,
  currency,
  onRefresh,
}: TransactionTableProps) {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("이 거래를 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/portfolios/${portfolioId}/transactions/${id}`, {
        method: "DELETE",
      });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        아직 거래 내역이 없습니다. 위 버튼을 눌러 거래를 추가해보세요.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                날짜
              </th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                유형
              </th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                종목
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                수량
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                단가
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                금액
              </th>
              <th className="py-2.5 px-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-slate-700/20 transition-colors"
              >
                <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                  {formatDate(tx.date)}
                </td>
                <td className="py-3 px-3">
                  <Badge variant={TYPE_BADGE[tx.type] || "default"}>
                    {TRANSACTION_TYPES[tx.type as TxType] || tx.type}
                  </Badge>
                </td>
                <td className="py-3 px-3">
                  {tx.ticker ? (
                    <div>
                      <span className="text-slate-200 font-medium">
                        {tx.ticker}
                      </span>
                      {tx.tickerName && (
                        <span className="text-slate-500 text-xs ml-1.5">
                          {tx.tickerName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                  {tx.quantity != null ? formatNumber(tx.quantity, 4) : "—"}
                </td>
                <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                  {tx.price != null
                    ? formatCurrency(tx.price, currency)
                    : "—"}
                </td>
                <td className="py-3 px-3 text-right font-medium tabular-nums">
                  <span
                    className={
                      ["CASH_IN", "SELL", "DIVIDEND"].includes(tx.type)
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {["CASH_IN", "SELL", "DIVIDEND"].includes(tx.type)
                      ? "+"
                      : "-"}
                    {formatCurrency(tx.totalAmount, currency)}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTx(tx)}
                      className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="거래 수정"
      >
        {editingTx && (
          <TransactionForm
            portfolioId={portfolioId}
            initialData={{
              id: editingTx.id,
              date: editingTx.date.slice(0, 10),
              type: editingTx.type as "BUY" | "SELL" | "CASH_IN" | "CASH_OUT" | "DIVIDEND",
              ticker: editingTx.ticker || "",
              tickerName: editingTx.tickerName || "",
              quantity: editingTx.quantity?.toString() || "",
              price: editingTx.price?.toString() || "",
              totalAmount: editingTx.totalAmount.toString(),
              priceType: editingTx.priceType as "MANUAL" | "OPEN" | "CLOSE",
              notes: editingTx.notes || "",
            }}
            onSuccess={() => {
              setEditingTx(null);
              onRefresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}
