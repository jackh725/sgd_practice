import React from 'react';
import { SGDQuickNotes } from '../data/questionsData';
import { 
  Sparkles, 
  RotateCcw, 
  ToggleLeft, 
  ToggleRight, 
  Lightbulb,
  Check
} from 'lucide-react';

interface ScratchpadProps {
  questionNum: number;
  questionTitle?: string;
  quickNotesRef: SGDQuickNotes;
  showTemplate: boolean;
  onToggleTemplate: () => void;
  onOpenTips: () => void;
  notes: {
    topic: string;
    s1: string;
    s2: string;
    s3: string;
  };
  onNotesChange: (notes: { topic: string; s1: string; s2: string; s3: string }) => void;
  onClose?: () => void;
  isExampleFilled?: boolean;
  onToggleExample?: () => void;
  isMockMode?: boolean;
}

export const Scratchpad: React.FC<ScratchpadProps> = ({
  quickNotesRef,
  showTemplate,
  onToggleTemplate,
  onOpenTips,
  notes,
  onNotesChange,
  onClose,
  isExampleFilled: propIsExampleFilled,
  onToggleExample: propOnToggleExample,
  isMockMode = false
}) => {
  const exampleTopic = (quickNotesRef.topic || '').trim();
  const exampleS1 = (quickNotesRef.s1 || []).join('; ').trim();
  const exampleS2 = (quickNotesRef.s2 || []).join('; ').trim();
  const exampleS3 = (quickNotesRef.s3 || []).join('; ').trim();

  // 判断是否与高分范例一致
  const isExampleFilled = propIsExampleFilled !== undefined 
    ? propIsExampleFilled 
    : Boolean(
        (notes.topic.trim() || notes.s1.trim()) &&
        notes.topic.trim() === exampleTopic &&
        notes.s1.trim() === exampleS1 &&
        notes.s2.trim() === exampleS2 &&
        notes.s3.trim() === exampleS3
      );

  // 点击“填入高分范例”：已选状态下点击可清空恢复空白，未选状态下填入
  const handleToggleExample = () => {
    if (propOnToggleExample) {
      propOnToggleExample();
      return;
    }
    if (isExampleFilled) {
      onNotesChange({ topic: '', s1: '', s2: '', s3: '' });
    } else {
      onNotesChange({ topic: exampleTopic, s1: exampleS1, s2: exampleS2, s3: exampleS3 });
    }
  };

  const handleClear = () => {
    onNotesChange({ topic: '', s1: '', s2: '', s3: '' });
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-4 sm:p-5 text-slate-800 space-y-4">
      {/* 顶部标题与功能控制条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 text-base font-bold shadow-xs">
            📝
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              考场速记白板 (Scratchpad)
            </h3>
            <p className="text-[11px] text-slate-500">
              横向记主题 · 纵向分S1/S2/S3 · 还原真实考场记笔记环境
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isMockMode ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>考场环境 · 真实速记模式</span>
            </span>
          ) : (
            <>
              {/* 答题模板开关：控制是否在左侧展开答题模板与衔接词 */}
              <button
                onClick={onToggleTemplate}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  showTemplate
                    ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
                title="控制是否在左侧展开套句模版与衔接词"
              >
                {showTemplate ? (
                  <ToggleRight className="w-4 h-4 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                )}
                <span>{showTemplate ? '已开启左侧答题模版' : '显示答题模版'}</span>
              </button>

              {/* 做题技巧按钮：点击唤起技巧弹窗 */}
              <button
                onClick={onOpenTips}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors shadow-2xs cursor-pointer"
                title="查看 PTE SGD 考场核心做题技巧与速记秘诀"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span>做题技巧</span>
              </button>

              {/* 填入高分范例 */}
              <button
                onClick={handleToggleExample}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border cursor-pointer ${
                  isExampleFilled
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300/70 font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-semibold'
                }`}
                title={isExampleFilled ? '当前已应用高分范例，再次点击可清空并恢复空白模版' : '填入高分示范要点作为参考'}
              >
                {isExampleFilled ? (
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{isExampleFilled ? '已选高分范例' : '填入高分范例'}</span>
              </button>
            </>
          )}

          {/* 清空草稿 */}
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
            title="清空当前速记草稿"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>清空草稿</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="收起速记白板"
            >
              收起
            </button>
          )}
        </div>
      </div>

      {/* 横向：讨论核心主题 TOPIC */}
      <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 focus-within:border-amber-500 focus-within:bg-white transition-all shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-1.5">
          <span className="flex items-center gap-1.5">
            <span>🎯</span> 【横向】讨论核心主题 TOPIC
          </span>
          {showTemplate ? (
            <span className="text-[11px] font-normal text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 animate-fadeIn">
              已联动左侧模版 Step 01 开头与 Step 05 结尾
            </span>
          ) : (
            <span className="text-[11px] font-normal text-slate-400">
              用于开头句与结尾重述核心词
            </span>
          )}
        </div>
        <input
          type="text"
          value={notes.topic}
          onChange={(e) => onNotesChange({ ...notes, topic: e.target.value })}
          placeholder="在此输入讨论核心主题关键词..."
          className="w-full bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
        />
      </div>

      {/* 纵向：S1 / S2 / S3 三位讨论者关键词 (每个 Speaker 记两句话，句间衔接) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* S1 */}
        <div className="bg-blue-50/40 rounded-xl p-3 border border-blue-200/80 focus-within:border-blue-500 focus-within:bg-white transition-all flex flex-col">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 mb-1.5">
            <span className="flex items-center gap-1">
              <span>👤</span> S1 (发言者1)
            </span>
          </div>
          {showTemplate && (
            <div className="text-[10px] text-blue-700 mb-1.5 font-medium leading-relaxed bg-blue-100/60 p-1.5 rounded animate-fadeIn">
              <strong>衔接:</strong> According to the recording... <strong>What's more</strong>, ...
            </div>
          )}
          <textarea
            value={notes.s1}
            onChange={(e) => onNotesChange({ ...notes, s1: e.target.value })}
            rows={8}
            placeholder={"记两句完整的话 (分号或换行隔开)：\n1. S1核心论点或现状...\n2. S1展开理由或细节..."}
            className="w-full bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y font-medium leading-relaxed min-h-[170px] flex-1"
          />
        </div>

        {/* S2 */}
        <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-200/80 focus-within:border-emerald-500 focus-within:bg-white transition-all flex flex-col">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1.5">
            <span className="flex items-center gap-1">
              <span>👤</span> S2 (发言者2)
            </span>
          </div>
          {showTemplate && (
            <div className="text-[10px] text-emerald-700 mb-1.5 font-medium leading-relaxed bg-emerald-100/60 p-1.5 rounded animate-fadeIn">
              <strong>衔接:</strong> And for the second speaker, ... <strong>In addition</strong>, ...
            </div>
          )}
          <textarea
            value={notes.s2}
            onChange={(e) => onNotesChange({ ...notes, s2: e.target.value })}
            rows={8}
            placeholder={"记两句完整的话 (分号或换行隔开)：\n1. S2关键步骤或建议...\n2. S2论述理由或补充..."}
            className="w-full bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y font-medium leading-relaxed min-h-[170px] flex-1"
          />
        </div>

        {/* S3 */}
        <div className="bg-purple-50/40 rounded-xl p-3 border border-purple-200/80 focus-within:border-purple-500 focus-within:bg-white transition-all flex flex-col">
          <div className="flex items-center justify-between text-xs font-bold text-purple-700 mb-1.5">
            <span className="flex items-center gap-1">
              <span>👤</span> S3 (发言者3)
            </span>
          </div>
          {showTemplate && (
            <div className="text-[10px] text-purple-700 mb-1.5 font-medium leading-relaxed bg-purple-100/60 p-1.5 rounded animate-fadeIn">
              <strong>衔接:</strong> As for the third speaker, ... <strong>Besides</strong>, ...
            </div>
          )}
          <textarea
            value={notes.s3}
            onChange={(e) => onNotesChange({ ...notes, s3: e.target.value })}
            rows={8}
            placeholder={"记两句完整的话 (分号或换行隔开)：\n1. S3补充视角或资源...\n2. S3心态或行动建议..."}
            className="w-full bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-y font-medium leading-relaxed min-h-[170px] flex-1"
          />
        </div>
      </div>
    </div>
  );
};
