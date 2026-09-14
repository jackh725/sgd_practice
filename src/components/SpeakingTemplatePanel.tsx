import React, { useState } from 'react';
import { SGDQuickNotes } from '../data/questionsData';
import { 
  Copy, 
  Check, 
  Lightbulb, 
  X,
  Sparkles
} from 'lucide-react';

interface SpeakingTemplatePanelProps {
  notes: {
    topic: string;
    s1: string;
    s2: string;
    s3: string;
  };
  quickNotesRef?: SGDQuickNotes;
  onOpenTips: () => void;
  onClose?: () => void;
  isExampleFilled?: boolean;
  onToggleExample?: () => void;
}

export const SpeakingTemplatePanel: React.FC<SpeakingTemplatePanelProps> = ({
  notes,
  onOpenTips,
  onClose,
  isExampleFilled = false,
  onToggleExample
}) => {
  const [templateViewMode, setTemplateViewMode] = useState<'steps' | 'full'>('steps');
  const [copied, setCopied] = useState<boolean>(false);

  const cleanText = (str: string) => {
    const val = str.trim();
    if (!val) return '';
    return val.endsWith('.') ? val.slice(0, -1) : val;
  };

  // 纯从草稿 notes 提取要点，不自动填充范例
  const extractSpeakerSentences = (input: string) => {
    const val = input.trim();
    let s1 = '';
    let s2 = '';

    if (val) {
      const parts = val.split(/[;\n\r]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        s1 = cleanText(parts[0]);
        s2 = cleanText(parts[1]);
      } else {
        s1 = cleanText(val);
      }
    }
    return { s1, s2, hasInput: Boolean(val) };
  };

  const s1Points = extractSpeakerSentences(notes.s1);
  const s2Points = extractSpeakerSentences(notes.s2);
  const s3Points = extractSpeakerSentences(notes.s3);
  const topicText = cleanText(notes.topic);

  // 待填空槽位下划线与提示
  const renderBlank = (label: string, color: 'indigo' | 'blue' | 'emerald' | 'purple') => {
    const themeStyles = {
      indigo: 'border-indigo-400 bg-indigo-50/70 text-indigo-700',
      blue: 'border-blue-400 bg-blue-50/70 text-blue-700',
      emerald: 'border-emerald-500 bg-emerald-50/70 text-emerald-800',
      purple: 'border-purple-400 bg-purple-50/70 text-purple-800',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-t border-b-2 border-dashed ${themeStyles[color]} font-sans text-xs font-semibold shadow-3xs select-none`}
        title="待填空：在右侧白板输入或点击“填入高分范例”即可填入"
      >
        <span className="opacity-60 text-[10px] tracking-tighter">____</span>
        <span>{label}</span>
        <span className="opacity-60 text-[10px] tracking-tighter">____</span>
      </span>
    );
  };

  // 已填入文本高亮样式（黑色加粗，带柔和下划线以示意属于填入内容）
  const renderFilled = (text: string) => (
    <span className="text-slate-950 font-sans font-bold px-1.5 underline decoration-slate-300 decoration-1 underline-offset-2">
      {text}
    </span>
  );

  // 用于复制的纯文本组合
  const tCopy = topicText || '______ [Topic 核心议题] ______';
  const s1_1Copy = s1Points.s1 || '______ [S1 观点 1] ______';
  const s1_2Copy = s1Points.s2 || '______ [S1 观点 2] ______';
  const s2_1Copy = s2Points.s1 || '______ [S2 观点 1] ______';
  const s2_2Copy = s2Points.s2 || '______ [S2 观点 2] ______';
  const s3_1Copy = s3Points.s1 || '______ [S3 观点 1] ______';
  const s3_2Copy = s3Points.s2 || '______ [S3 观点 2] ______';

  const fullOralSpeech = `The discussion involves three people talking about ${tCopy}. According to the recording, the first speaker mentioned that ${s1_1Copy}. What's more, the speaker explained that ${s1_2Copy}. And for the second speaker, she said ${s2_1Copy}. In addition, she suggested that ${s2_2Copy}. As for the third speaker, he highlighted that ${s3_1Copy}. Besides, he concluded that ${s3_2Copy}. In conclusion, the three speakers are discussing ${tCopy}.`;

  const handleCopyFramework = () => {
    navigator.clipboard.writeText(fullOralSpeech);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-white border border-indigo-200/80 shadow-md p-4 space-y-3.5 animate-fadeIn">
      {/* 顶部标题与控制操作条 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
            🎙️
          </span>
          <div>
            <h3 className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
              高分口语答题模版
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                实时联动漫游
              </span>
            </h3>
            <p className="text-[10px] text-slate-500">
              <span className="bg-indigo-100/90 text-indigo-900 font-bold px-1 py-0.2 rounded border border-indigo-200">荧光底色</span> 为固定模版句 · <span className="border-b border-dashed border-indigo-400 font-semibold text-indigo-600 px-1">下划线空白</span> 为待填空 · <span className="text-slate-950 font-bold">黑色字</span> 为已填入内容
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 模式切换：分步拆解 vs 整段朗读 */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setTemplateViewMode('steps')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                templateViewMode === 'steps'
                  ? 'bg-white text-indigo-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              分步拆解
            </button>
            <button
              onClick={() => setTemplateViewMode('full')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                templateViewMode === 'full'
                  ? 'bg-white text-indigo-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              整段朗读
            </button>
          </div>

          {/* 填入高分范例快速联动按钮 */}
          {onToggleExample && (
            <button
              onClick={onToggleExample}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all border cursor-pointer ${
                isExampleFilled
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-300 font-bold'
                  : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 font-semibold'
              }`}
              title={isExampleFilled ? '已填入高分示范，点击可清空并还原空白下划线模版' : '一键填入高分示范要点'}
            >
              {isExampleFilled ? (
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              ) : (
                <Sparkles className="w-3 h-3 text-amber-500" />
              )}
              <span>{isExampleFilled ? '已选范例' : '填入范例'}</span>
            </button>
          )}

          {/* 复制整段 */}
          <button
            onClick={handleCopyFramework}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-indigo-950 border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
            title="一键复制纯文本答题范文"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-600" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>

          {/* 收起模版按钮 */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="收起答题模版，还原机考大卡片"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 做题技巧紧凑横幅 */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-[11px] leading-snug">
            <strong>2句法则：</strong>每个 Speaker 抓两句完整话串联，时长以<strong>1分钟左右为佳（≥50s）</strong>。
          </p>
        </div>
        <button
          onClick={onOpenTips}
          className="shrink-0 text-amber-800 hover:text-amber-950 font-bold underline decoration-amber-400 text-[11px] cursor-pointer"
        >
          技巧秘诀 →
        </button>
      </div>

      {/* 模版内容区 */}
      {templateViewMode === 'steps' ? (
        /* 模式 A：分步句式拆解阶梯流 (1~5步层层递进) */
        <div className="space-y-2.5">
          {/* 01 开头议题 */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 p-2.5 rounded-xl bg-slate-50/60 border border-indigo-100/80 shadow-3xs">
            <span className="shrink-0 w-20 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200 text-center">
              01 开头议题
            </span>
            <div className="text-xs leading-relaxed flex-1 font-mono">
              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                The discussion involves three people talking about
              </span>
              {topicText ? renderFilled(topicText) : renderBlank('填入核心议题 Topic', 'indigo')}
              <span className="text-indigo-950 font-bold">.</span>
            </div>
          </div>

          {/* 02 S1 立场 */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 p-2.5 rounded-xl bg-slate-50/60 border border-blue-100/80 shadow-3xs">
            <span className="shrink-0 w-20 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200 text-center">
              02 S1 立场
            </span>
            <div className="text-xs leading-relaxed flex-1 font-mono">
              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                According to the recording, the first speaker mentioned that
              </span>
              {s1Points.s1 ? renderFilled(s1Points.s1) : renderBlank('填入 S1 核心立场 1', 'blue')}
              <span className="text-indigo-950 font-bold">. </span>

              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                What's more, the speaker explained that
              </span>
              {s1Points.s2 ? renderFilled(s1Points.s2) : renderBlank('填入 S1 补充要点 2', 'blue')}
              <span className="text-indigo-950 font-bold">.</span>
            </div>
          </div>

          {/* 03 S2 建议 */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 p-2.5 rounded-xl bg-slate-50/60 border border-emerald-100/80 shadow-3xs">
            <span className="shrink-0 w-20 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 text-center">
              03 S2 建议
            </span>
            <div className="text-xs leading-relaxed flex-1 font-mono">
              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                And for the second speaker, she said
              </span>
              {s2Points.s1 ? renderFilled(s2Points.s1) : renderBlank('填入 S2 核心建议 1', 'emerald')}
              <span className="text-indigo-950 font-bold">. </span>

              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                In addition, she suggested that
              </span>
              {s2Points.s2 ? renderFilled(s2Points.s2) : renderBlank('填入 S2 补充要点 2', 'emerald')}
              <span className="text-indigo-950 font-bold">.</span>
            </div>
          </div>

          {/* 04 S3 总结 */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 p-2.5 rounded-xl bg-slate-50/60 border border-purple-100/80 shadow-3xs">
            <span className="shrink-0 w-20 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 text-center">
              04 S3 总结
            </span>
            <div className="text-xs leading-relaxed flex-1 font-mono">
              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                As for the third speaker, he highlighted that
              </span>
              {s3Points.s1 ? renderFilled(s3Points.s1) : renderBlank('填入 S3 核心总结 1', 'purple')}
              <span className="text-indigo-950 font-bold">. </span>

              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                Besides, he concluded that
              </span>
              {s3Points.s2 ? renderFilled(s3Points.s2) : renderBlank('填入 S3 补充要点 2', 'purple')}
              <span className="text-indigo-950 font-bold">.</span>
            </div>
          </div>

          {/* 05 结尾重述 */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 p-2.5 rounded-xl bg-slate-50/60 border border-indigo-100/80 shadow-3xs">
            <span className="shrink-0 w-20 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200 text-center">
              05 结尾重述
            </span>
            <div className="text-xs leading-relaxed flex-1 font-mono">
              <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
                In conclusion, the three speakers are discussing
              </span>
              {topicText ? renderFilled(topicText) : renderBlank('填入核心议题 Topic', 'indigo')}
              <span className="text-indigo-950 font-bold">.</span>
            </div>
          </div>
        </div>
      ) : (
        /* 模式 B：整段连续朗读流 (段落连贯，一气呵成) */
        <div className="text-xs leading-loose bg-slate-50/60 p-4 rounded-xl border border-indigo-100 font-mono shadow-3xs">
          <p className="space-y-1.5">
            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              The discussion involves three people talking about
            </span>
            {topicText ? renderFilled(topicText) : renderBlank('核心议题 Topic', 'indigo')}
            <span className="text-indigo-950 font-bold">. </span>

            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              According to the recording, the first speaker mentioned that
            </span>
            {s1Points.s1 ? renderFilled(s1Points.s1) : renderBlank('S1 观点 1', 'blue')}
            <span className="text-indigo-950 font-bold">. </span>

            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              What's more, the speaker explained that
            </span>
            {s1Points.s2 ? renderFilled(s1Points.s2) : renderBlank('S1 观点 2', 'blue')}
            <span className="text-indigo-950 font-bold">. </span>

            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              And for the second speaker, she said
            </span>
            {s2Points.s1 ? renderFilled(s2Points.s1) : renderBlank('S2 建议 1', 'emerald')}
            <span className="text-indigo-950 font-bold">. </span>

            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              In addition, she suggested that
            </span>
            {s2Points.s2 ? renderFilled(s2Points.s2) : renderBlank('S2 建议 2', 'emerald')}
            <span className="text-indigo-950 font-bold">. </span>

            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              As for the third speaker, he highlighted that
            </span>
            {s3Points.s1 ? renderFilled(s3Points.s1) : renderBlank('S3 总结 1', 'purple')}
            <span className="text-indigo-950 font-bold">. </span>

            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              Besides, he concluded that
            </span>
            {s3Points.s2 ? renderFilled(s3Points.s2) : renderBlank('S3 总结 2', 'purple')}
            <span className="text-indigo-950 font-bold">. </span>

            <span className="bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold shadow-3xs">
              In conclusion, the three speakers are discussing
            </span>
            {topicText ? renderFilled(topicText) : renderBlank('核心议题 Topic', 'indigo')}
            <span className="text-indigo-950 font-bold">.</span>
          </p>
        </div>
      )}
    </div>
  );
};
