import React, { useState } from 'react';
import {
  X,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { ApiVerificationResult } from '../types';

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ApiVerificationResult | null;
  onVerifyKey: (newKey?: string) => Promise<void>;
  isVerifying: boolean;
  userEnteredKey: string;
  setUserEnteredKey: (key: string) => void;
}

export const ApiStatusModal: React.FC<ApiStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onVerifyKey,
  isVerifying,
  userEnteredKey,
  setUserEnteredKey,
}) => {
  const [inputKey, setInputKey] = useState(userEnteredKey || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApplyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserEnteredKey(inputKey.trim());
    localStorage.setItem('d0_custom_gmap_key', inputKey.trim());
    await onVerifyKey(inputKey.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRecheck = async () => {
    await onVerifyKey(userEnteredKey || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Google Maps Platform API 金鑰與服務檢測</h3>
              <p className="text-xs text-stone-400">
                即時驗證 Maps JS、Places (New)、Geocoding、Routes 4 大 API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Missing API Direct Warning */}
          {status && status.missingApis && status.missingApis.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-red-900">
              <div className="flex items-center space-x-2 font-bold text-sm text-red-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>【系統警告】發現缺少 Google API 或金鑰無權限：</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 font-semibold text-xs">
                {status.missingApis.map((api, idx) => (
                  <li key={idx} className="text-red-800">
                    {api}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-red-700 pt-1">
                請登入 Google Cloud Console，確認已啟用對應 API 並解除金鑰限制。
              </p>
            </div>
          )}

          {/* API Key Input Form */}
          <form onSubmit={handleApplyKey} className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="api-key-input" className="font-bold text-stone-800 text-xs flex items-center space-x-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>自訂 Google Maps API Key：</span>
              </label>
              {saveSuccess && (
                <span className="text-emerald-600 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>已套用並檢測</span>
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                id="api-key-input"
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="貼上您的 AIzaSy... 金鑰"
                className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-lg font-semibold flex items-center space-x-1.5 shrink-0"
              >
                {isVerifying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>套用並測試</span>
                )}
              </button>
            </div>
            <div className="text-[11px] text-stone-500">
              亦可在後端環境變數 <code className="bg-stone-200 px-1 py-0.5 rounded font-mono">GOOGLE_MAPS_API_KEY</code> 直接設定。
            </div>
          </form>

          {/* 4 APIs Diagnostic Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-800 text-sm flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-stone-600" />
                <span>4 大核心 Google API 狀態診斷</span>
              </h4>
              <button
                type="button"
                onClick={handleRecheck}
                disabled={isVerifying}
                className="text-stone-600 hover:text-stone-900 font-medium inline-flex items-center space-x-1 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>重新檢測</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Maps JS */}
              <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-start justify-between">
                <div>
                  <div className="font-bold text-stone-900">Maps JavaScript API</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">負責前台地圖渲染、Marker 與標註</p>
                  <div className="text-[10px] text-stone-400 mt-1">前端動態 SDK 載入</div>
                </div>
                <div className="shrink-0 mt-0.5">
                  {status?.apis?.mapsJs?.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* 2. Places API (New) */}
              <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-start justify-between">
                <div>
                  <div className="font-bold text-stone-900">Places API (New)</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">搜尋登山口附近真實住宿、飯店、民宿</p>
                  <div className="text-[10px] text-stone-400 mt-1">
                    狀態：{status?.apis?.places?.status || '未測試'}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  {status?.apis?.places?.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* 3. Geocoding API */}
              <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-start justify-between">
                <div>
                  <div className="font-bold text-stone-900">Geocoding API</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">將輸入之登山口名稱解析為精確經緯度</p>
                  <div className="text-[10px] text-stone-400 mt-1">
                    狀態：{status?.apis?.geocoding?.status || '未測試'}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  {status?.apis?.geocoding?.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* 4. Routes API */}
              <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-start justify-between">
                <div>
                  <div className="font-bold text-stone-900">Routes API</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">計算登山口到各住宿之真實駕車路程與時間</p>
                  <div className="text-[10px] text-stone-400 mt-1">
                    狀態：{status?.apis?.routes?.status || '未測試'}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  {status?.apis?.routes?.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cloud Console Guides */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-start space-x-2.5 text-stone-600 text-[11px]">
            <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-stone-800">如何取得與啟用 Google Maps API：</span>
              <p>
                前往{' '}
                <a
                  href="https://console.cloud.google.com/google/maps-apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-800 hover:underline font-bold inline-flex items-center space-x-0.5"
                >
                  <span>Google Cloud Console 金鑰頁面</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                ，並在「已啟用的 API 與服務」中確保啟用上述 4 個 API。金鑰可綁定網址以保障安全。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
