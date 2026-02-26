"use client";

import { useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Download, Upload, CheckCircle, AlertTriangle, FileSpreadsheet, X } from "lucide-react";

interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
  total: number;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
  onSuccess: () => void;
}

export default function ImportModal({
  open,
  onClose,
  portfolioId,
  onSuccess,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setServerError(null);
    onClose();
  };

  const handleFileChange = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setServerError(".xlsx 또는 .xls 파일만 업로드 가능합니다.");
      return;
    }
    setFile(f);
    setResult(null);
    setServerError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileChange(e.dataTransfer.files[0] ?? null);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setServerError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/portfolios/${portfolioId}/import`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "업로드 중 오류가 발생했습니다.");
        return;
      }
      setResult(data);
      if (data.imported > 0) onSuccess();
    } finally {
      setUploading(false);
    }
  };

  const hardErrors = result?.errors.filter((e) => !e.message.startsWith("경고")) ?? [];
  const warnings = result?.errors.filter((e) => e.message.startsWith("경고")) ?? [];

  return (
    <Modal open={open} onClose={handleClose} title="엑셀로 거래내역 가져오기">
      <div className="space-y-4">
        {/* 템플릿 다운로드 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div>
            <p className="text-sm font-medium text-blue-300">양식 다운로드</p>
            <p className="text-xs text-slate-400 mt-0.5">
              작성 예시와 안내가 포함된 xlsx 파일
            </p>
          </div>
          <a href="/api/template" download>
            <Button type="button" variant="secondary" size="sm">
              <Download size={14} />
              양식 받기
            </Button>
          </a>
        </div>

        {/* 결과 없는 경우: 업로드 UI */}
        {!result && (
          <>
            {/* 드래그 앤 드롭 영역 */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors p-8 text-center ${
                dragging
                  ? "border-blue-400 bg-blue-500/10"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-600 hover:border-slate-500 bg-slate-800/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet size={28} className="text-emerald-400" />
                  <p className="text-sm font-medium text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={28} className="text-slate-500" />
                  <p className="text-sm text-slate-400">
                    파일을 여기에 드래그하거나 클릭해서 선택
                  </p>
                  <p className="text-xs text-slate-600">.xlsx, .xls 지원</p>
                </div>
              )}
            </div>

            {serverError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {serverError}
              </p>
            )}

            <Button
              type="button"
              onClick={handleImport}
              disabled={!file}
              loading={uploading}
              className="w-full"
            >
              <Upload size={15} />
              가져오기
            </Button>
          </>
        )}

        {/* 결과 표시 */}
        {result && (
          <div className="space-y-3">
            {/* 성공 요약 */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              result.imported > 0
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-slate-700/40 border-slate-600"
            }`}>
              <CheckCircle
                size={20}
                className={result.imported > 0 ? "text-emerald-400" : "text-slate-500"}
              />
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {result.imported}개 거래 가져오기 완료
                </p>
                <p className="text-xs text-slate-400">
                  전체 {result.total + warnings.length}행 처리
                  {hardErrors.length > 0 && ` · ${hardErrors.length}행 오류 제외`}
                  {warnings.length > 0 && ` · ${warnings.length}행 경고`}
                </p>
              </div>
            </div>

            {/* 오류 목록 */}
            {hardErrors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> 건너뛴 행 ({hardErrors.length}개)
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {hardErrors.map((e, i) => (
                    <div key={i} className="text-xs text-slate-400 bg-red-500/5 border border-red-500/10 rounded px-2.5 py-1.5">
                      <span className="text-red-400 font-medium">행 {e.row}</span> — {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 경고 목록 */}
            {warnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> 경고 ({warnings.length}개, 가져오기는 완료됨)
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {warnings.map((e, i) => (
                    <div key={i} className="text-xs text-slate-400 bg-yellow-500/5 border border-yellow-500/10 rounded px-2.5 py-1.5">
                      <span className="text-yellow-400 font-medium">행 {e.row}</span> — {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setFile(null); setResult(null); }}
                className="flex-1"
              >
                다시 업로드
              </Button>
              <Button type="button" onClick={handleClose} className="flex-1">
                완료
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
