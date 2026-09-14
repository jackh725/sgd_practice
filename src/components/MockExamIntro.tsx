import React, { useState } from 'react';
import { SGDQuestion } from '../data/questionsData';
import { 
  Play, 
  Shuffle, 
  Clock, 
  Mic, 
  Volume2, 
  ArrowLeft,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';

interface MockExamIntroProps {
  questions: [SGDQuestion, SGDQuestion];
  onReshuffle: () => void;
  onStartExam: () => void;
  onBackToPractice: () => void;
}

export const MockExamIntro: React.FC<MockExamIntroProps> = ({
  questions,
  onReshuffle,
  onStartExam,
  onBackToPractice
}) => {
  const [isBlindMode, setIsBlindMode] = useState<boolean>(true);

  return (
    <div className="w-full space-y-4 animate-fadeIn">
      {/* 顶部返回与状态 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToPractice}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回单题练习</span>
        </button>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          PTE Academic / Core 全真模考标准卷
        </span>
      </div>

      {/* 核心宣读大卡片 */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        {/* 顶部深色考场横幅 */}
        <div className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest mb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                PTE MOCK EXAM SYSTEM
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Summarize Group Discussion
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                三人讨论概括 · 考场 2 题连续全真模拟机考
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">考试题量</div>
                <div className="text-xl font-mono font-extrabold text-white">2 题连续</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right">
                <div className="text-xs text-slate-400">建议总时长</div>
                <div className="text-xl font-mono font-extrabold text-emerald-400">~ 7-8 分钟</div>
              </div>
            </div>
          </div>
        </div>

        {/* 考规说明与流程 */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* 四步实战考试流程 */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              机考实战流程 (EXAM FLOW)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  听取三人原声
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  自动起播，不可暂停与重放，边听边在右侧速记白板捕捉要点。
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  10 秒准备倒计时
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  录音放完后自动倒计时，理顺 S1/S2/S3 发言逻辑，等待 Beep 声。
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-rose-600" />
                  Beep 后开麦作答
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  最长 120 秒，建议说满 50s-60s，完成后点击 Next 进入第 2 题。
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  综合模考成绩单
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  两题全部交卷后，生成 90 分制总评分报告与双语深度复盘。
                </p>
              </div>
            </div>
          </div>

          {/* 本次抽取的 2 道考题 */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  本次全真模考试卷包含以下 2 道考题：
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* 盲测模式开关 */}
                <button
                  onClick={() => setIsBlindMode(!isBlindMode)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                    isBlindMode
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="盲测模式下隐藏考题标题，听到原声后方知题目"
                >
                  {isBlindMode ? '🔒 盲测考场（题名隐藏）' : '👁️ 显示题目名称'}
                </button>

                {/* 换一组题目 */}
                <button
                  onClick={onReshuffle}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer font-medium"
                  title="从 34 题库中重新随机抽取两道题目"
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>换一组题目</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-3xs flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 font-mono font-extrabold flex items-center justify-center text-xs shrink-0">
                    Q{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {isBlindMode ? '🔒 真实考场盲测题（作答时揭晓）' : `第 ${q.num} 题 · ${q.title}`}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {isBlindMode ? '原声音频将在进入考题后自动播放' : `主题: ${q.topic}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 考场提示 */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong>考场严谨提醒：</strong>模考期间系统将<strong>自动隐藏答题模版、做题技巧与高分范例</strong>。请佩戴好耳机，备齐草稿纸或直接在屏幕右侧考场速记白板打字速记。作答完毕后点击右侧的 Next 按钮进入下一题。
            </div>
          </div>

          {/* 底部启动按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={onBackToPractice}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              暂不模考，返回单题专项
            </button>

            <button
              onClick={onStartExam}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-sm shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>立即开始全真模考</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
