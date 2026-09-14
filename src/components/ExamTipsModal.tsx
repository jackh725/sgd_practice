import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ExamTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExamTipsModal: React.FC<ExamTipsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] my-auto flex flex-col border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗顶部栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-amber-50/60">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold text-base shadow-3xs">
              💡
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                PTE SGD 考场核心做题技巧与满分心法
              </h3>
              <p className="text-xs text-slate-500">
                2句法则 · 句间自然衔接 · 黄金时长把控 · 5步万能骨架
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
            title="关闭弹窗 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 弹窗主体内容 */}
        <div className="overflow-y-auto p-5 space-y-3.5 text-xs text-slate-700">
          {/* 核心秘诀 1 */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
              <span>🎯</span>
              <span>1. 【两句法则】每个发言者记两句完整的话</span>
            </div>
            <p className="text-slate-600 leading-relaxed pl-5">
              不要只记孤立的单个单词！每个 Speaker 务必记下<strong>两句完整表达</strong>：第一句陈述核心论点或现状，第二句陈述补充细节、理由或行动建议。这样既能保证内容完整覆盖（Content 分拉满），又能确保转述流畅。
            </p>
          </div>

          {/* 核心秘诀 2 */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
              <span>🔗</span>
              <span>2. 【句间衔接】使用自然衔接词无缝连接</span>
            </div>
            <p className="text-slate-600 leading-relaxed pl-5">
              在两句话之间加入固定连词，构建连续语流：
              <br />
              • <strong>S1:</strong> According to the recording, ... mentioned that [句1]. <strong>What's more</strong>, the speaker explained that [句2].
              <br />
              • <strong>S2:</strong> And for the second speaker, she said [句1]. <strong>In addition</strong>, she suggested that [句2].
              <br />
              • <strong>S3:</strong> As for the third speaker, he highlighted that [句1]. <strong>Besides</strong>, he concluded that [句2].
            </p>
          </div>

          {/* 核心秘诀 3 */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
              <span>⏱️</span>
              <span>3. 【黄金作答时长】1分钟左右为佳，切勿低于50秒</span>
            </div>
            <p className="text-slate-600 leading-relaxed pl-5">
              PTE SGD 录音总时长 90 秒，系统会在 50 秒时提示达标。<strong>作答时间建议在 50~65 秒之间（约 110~140 词）为最佳</strong>。如果你足够流利且要点记得多，可以多说点，但<strong>切勿低于 50 秒提前交卷</strong>，确保计算机对流利度与内容广度的充分打分！
            </p>
          </div>

          {/* 核心秘诀 4 */}
          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
              <span>🏆</span>
              <span>4. 【三大评分维度要求】</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-5 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <span className="font-bold text-purple-950 block mb-0.5">① 内容分 (Content)</span>
                <span className="text-[11px] text-slate-500">全面覆盖 Topic 与 3 位讨论者核心论点，不遗漏 Speaker。</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <span className="font-bold text-purple-950 block mb-0.5">② 流利度 (Fluency)</span>
                <span className="text-[11px] text-slate-500">平稳连贯无卡顿，利用套句骨架自然过渡，哪怕听不清也绝不停顿。</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <span className="font-bold text-purple-950 block mb-0.5">③ 发音 (Pronunciation)</span>
                <span className="text-[11px] text-slate-500">重音清晰、断句自然、元音饱满，语调自信从容。</span>
              </div>
            </div>
          </div>
        </div>

        {/* 弹窗底部操作条 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            按 <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">Esc</kbd> 或点击外部任意处均可关闭
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            我知道了，开始练习
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
