import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, Sparkles } from 'lucide-react';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMilestone?: boolean;
}

export const SponsorModal: React.FC<SponsorModalProps> = ({ 
  isOpen, 
  onClose,
  isMilestone = false
}) => {
  const [activeTab, setActiveTab] = useState<'payid' | 'wechat'>('payid');
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [copiedPayId, setCopiedPayId] = useState<boolean>(false);
  const [copiedDesc, setCopiedDesc] = useState<boolean>(false);

  const PAY_ID_EMAIL = 'jackhaoinau2@gmail.com';
  const TRANSFER_NOTE = 'PTE SGD Support';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyPayId = () => {
    navigator.clipboard.writeText(PAY_ID_EMAIL);
    setCopiedPayId(true);
    setTimeout(() => setCopiedPayId(false), 2000);
  };

  const handleCopyDesc = () => {
    navigator.clipboard.writeText(TRANSFER_NOTE);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer z-10"
          title="关闭弹窗"
        >
          ✕
        </button>

        {/* 弹窗头部 */}
        <div className="flex items-center gap-3 mb-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-xl shadow-md shadow-amber-500/20 text-slate-950 font-bold shrink-0">
            {isMilestone ? '🎉' : '☕'}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              {isMilestone ? '达成 5 题连练里程碑！' : '赞助支持开发者'}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isMilestone 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {isMilestone ? '已练 5 题' : '随喜赞赏'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMilestone 
                ? '手感火热！本站永久免登录、无广告、纯净全真离线可用' 
                : '保持本站永久免登录、无广告、全真 34 题离线免费练习'}
            </p>
          </div>
        </div>

        {/* 赞助说明文案 */}
        <div className="bg-slate-50 rounded-2xl p-3 sm:p-3.5 border border-slate-200 text-xs text-slate-600 leading-relaxed mb-3.5">
          {isMilestone ? (
            <p>
              太棒了！您已累计完成 <strong>5 道不同真题</strong> 实操。全站全真原声、白板速记与答题模版均由作者业余维护。若对您的口语听力提分有所启发，欢迎随喜请喝杯咖啡 ☕ 助力服务器日常运营！
            </p>
          ) : (
            <p>
              嗨！我是 PTE 考生与全栈独立开发者。为备考 SGD 新题型，我精心复刻整理了全量 34 题全真原声并研发了本套系统。如果对您有所帮助，欢迎随喜请作者喝杯咖啡 ☕ 祝顺利拿下自己的目标分数！🎉
            </p>
          )}
        </div>

        {/* 支付方式双通道切换 Tab */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 mb-3.5">
          <button
            onClick={() => setActiveTab('payid')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'payid'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇦🇺 澳洲 PayID (AUD)</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-normal">0手续费</span>
          </button>
          <button
            onClick={() => setActiveTab('wechat')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'wechat'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇨🇳 微信支付 (RMB)</span>
          </button>
        </div>

        {/* 通道一：澳洲 PayID 银行秒转 */}
        {activeTab === 'payid' && (
          <div className="space-y-3 p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-fadeIn">
            {/* 建议金额档位选择器 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  建议支持心意：
                </span>
                <span className="text-[10px] text-slate-500">
                  金额随意 · 任意澳洲手机银行秒转
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { amount: 2, label: '微甜奶茶', desc: '$2 AUD' },
                  { amount: 5, label: '标准咖啡', desc: '$5 AUD', recommended: true },
                  { amount: 10, label: '咖啡套餐', desc: '$10 AUD' },
                ].map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => setSelectedAmount(tier.amount)}
                    className={`relative p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedAmount === tier.amount
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tier.recommended && (
                      <span className={`absolute -top-1.5 right-1.5 text-[8px] font-extrabold px-1 rounded-full ${
                        selectedAmount === tier.amount ? 'bg-amber-400 text-slate-950' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        推荐
                      </span>
                    )}
                    <div className="text-xs font-extrabold">{tier.desc}</div>
                    <div className={`text-[10px] mt-0.5 ${
                      selectedAmount === tier.amount ? 'text-indigo-100' : 'text-slate-500'
                    }`}>
                      {tier.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* PayID 复制卡片 */}
            <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    澳洲 PayID (Email 地址)
                  </div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-indigo-950 truncate select-all">
                    {PAY_ID_EMAIL}
                  </div>
                </div>
                <button
                  onClick={handleCopyPayId}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="一键复制 PayID 邮箱"
                >
                  {copiedPayId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPayId ? '已复制' : '复制'}</span>
                </button>
              </div>

              {/* 转账附言辅助复制 (纯英文) */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                <span className="text-slate-500">
                  Description / 附言: <strong className="text-slate-800 font-mono font-bold">{TRANSFER_NOTE}</strong>
                </span>
                <button
                  onClick={handleCopyDesc}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] underline cursor-pointer"
                >
                  {copiedDesc ? '已复制' : '复制附言'}
                </button>
              </div>
            </div>

            {/* 极简转账 3 步指南 */}
            <div className="px-2 text-[10px] text-slate-500 space-y-0.5 leading-relaxed">
              <p>💡 <strong>转账流程：</strong></p>
              <p>1. 点击上方复制 PayID 邮箱；</p>
              <p>2. 打开澳洲任意银行 App（CommBank, ANZ, NAB, Westpac, ING 等）；</p>
              <p>3. 选择 PayID → 粘贴邮箱 → 输入建议金额（<strong>${selectedAmount} AUD</strong> 或随喜）即可秒到账。</p>
            </div>
          </div>
        )}

        {/* 通道二：微信支付 (RMB) */}
        {activeTab === 'wechat' && (
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-fadeIn">
            <div className="relative p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              <img 
                src="/wechat_sponsor.png" 
                alt="微信赞助二维码" 
                className="w-40 h-40 object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://github.com';
                }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700 mt-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              微信扫一扫 · 支持作者
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              扫码支持 · 您的认可就是最大的动力
            </span>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="mt-3.5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {isMilestone ? '收下这份心意，继续免费刷题 →' : '收下这份心意，继续刷题！'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
