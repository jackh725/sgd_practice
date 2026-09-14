import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SGDQuestion } from '../data/questionsData';
import { SGDScoreReport } from '../utils/scoringEngine';
import {
  Award,
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  X,
  FileText,
  Volume2,
  Sparkles,
  TrendingUp,
  Layers,
  AlertCircle
} from 'lucide-react';

export interface MockExamItemResult {
  question: SGDQuestion;
  report: SGDScoreReport;
  recordedAudioUrl?: string;
  recognizedText: string;
  durationSeconds: number;
  scratchpadNotes: { topic: string; s1: string; s2: string; s3: string };
}

interface MockScoreReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  q1Result: MockExamItemResult;
  q2Result: MockExamItemResult;
  onRetakeMock: () => void;
  onBackToPractice: () => void;
}

export const MockScoreReportModal: React.FC<MockScoreReportModalProps> = ({
  isOpen,
  onClose,
  q1Result,
  q2Result,
  onRetakeMock,
  onBackToPractice
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'q1_review' | 'q2_review'>('overview');
  const [playingAudioType, setPlayingAudioType] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 切换 tab 时停止音频
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAudioType(null);
    }
  }, [activeTab]);

  if (!isOpen) return null;

  // 综合成绩计算
  const avgTotalScore = Math.round((q1Result.report.totalScore + q2Result.report.totalScore) / 2);
  const avgContentScore = Number(((q1Result.report.contentScore + q2Result.report.contentScore) / 2).toFixed(1));
  const avgPronunciationScore = Math.round((q1Result.report.pronunciationScore + q2Result.report.pronunciationScore) / 2);
  const avgFluencyScore = Math.round((q1Result.report.fluencyScore + q2Result.report.fluencyScore) / 2);
  const totalWords = q1Result.report.wordCount + q2Result.report.wordCount;
  const avgWpm = Math.round((q1Result.report.wpm + q2Result.report.wpm) / 2);

  const getTargetBand = (score: number) => {
    if (score >= 79) return { label: '79+ (八炸/九炸档位)', color: 'bg-emerald-500 text-white' };
    if (score >= 65) return { label: '65+ (七炸档位)', color: 'bg-blue-500 text-white' };
    if (score >= 50) return { label: '50+ (六炸档位)', color: 'bg-amber-500 text-white' };
    return { label: '需加强练习', color: 'bg-rose-500 text-white' };
  };

  const band = getTargetBand(avgTotalScore);

  const togglePlayAudio = (type: string, src: string) => {
    if (!audioPlayerRef.current) return;
    if (playingAudioType === type) {
      audioPlayerRef.current.pause();
      setPlayingAudioType(null);
    } else {
      audioPlayerRef.current.src = src;
      audioPlayerRef.current.play();
      setPlayingAudioType(type);
    }
  };

  const renderReviewContent = (item: MockExamItemResult, qIndex: number) => {
    const q = item.question;
    const r = item.report;

    return (
      <div className="space-y-5 animate-fadeIn">
        {/* 题目概况卡片 */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-xs">
                Question {qIndex}
              </span>
              <h3 className="text-sm font-bold text-indigo-950">
                第 {q.num} 题 · {q.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              核心议题: <span className="font-semibold text-slate-700">{q.topic}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-center px-3 py-1 bg-white rounded-xl border border-indigo-100 shadow-3xs">
              <div className="text-[10px] text-slate-400">单题得分</div>
              <div className="text-base font-extrabold text-indigo-600">{r.totalScore} / 90</div>
            </div>
            <div className="text-center px-3 py-1 bg-white rounded-xl border border-indigo-100 shadow-3xs">
              <div className="text-[10px] text-slate-400">作答时长</div>
              <div className="text-base font-extrabold text-slate-700">{r.durationSeconds}s</div>
            </div>
          </div>
        </div>

        {/* 考生实际录音回听与发音识别 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>🎙️ 考生作答录音与逐词发音诊断</span>
              <span className="text-[10px] font-normal text-slate-400">（点击单词可看发音质量）</span>
            </h4>

            {item.recordedAudioUrl && (
              <button
                onClick={() => togglePlayAudio(`user_${qIndex}`, item.recordedAudioUrl!)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {playingAudioType === `user_${qIndex}` ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-blue-700" />
                    <span>暂停录音</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-blue-700" />
                    <span>回听我的作答录音</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 逐词发音识别区 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed font-mono">
            {r.coloredWords && r.coloredWords.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {r.coloredWords.map((cw, wIdx) => {
                  const colorClass =
                    cw.level === 'good'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : cw.level === 'average'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-rose-100 text-rose-900 border-rose-300';
                  return (
                    <span
                      key={wIdx}
                      className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold ${colorClass}`}
                      title={`置信度: ${Math.round(cw.confidence * 100)}%`}
                    >
                      {cw.word}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic">
                {r.rawTranscript || '未检测到有效语音输入或作答时长过短'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-400 inline-block" />
              绿色：发音优秀
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400 inline-block" />
              黄色：发音良好
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400 inline-block" />
              红色：需纠音
            </span>
          </div>
        </div>

        {/* 采分要点双论点覆盖与扣分诊断 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🎯 考点双论点覆盖度诊断</span>
              <span className="text-[10px] font-normal text-slate-400">（对标内容分 0-6 与流利度机改模型）</span>
            </span>
            <span className="text-xs font-mono font-bold text-blue-600">
              内容得分: {r.contentScore} / 6 分
            </span>
          </h4>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-lg font-medium border ${r.speakerDetails?.topicHit ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {r.speakerDetails?.topicHit ? '✓ 主题核心' : '⚠️ 缺少具体主题'}
            </span>

            {/* S1 */}
            <span className={`px-2.5 py-1 rounded-lg font-medium border ${r.speakerDetails?.s1Count === 2
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : r.speakerDetails?.s1Count === 1
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
              {r.speakerDetails?.s1Count === 2 ? '✓ S1 (满2观点)' : r.speakerDetails?.s1Count === 1 ? '⚠️ S1 (仅1/2观点 -50%)' : '✗ S1 (0观点)'}
            </span>

            {/* S2 */}
            <span className={`px-2.5 py-1 rounded-lg font-medium border ${r.speakerDetails?.s2Count === 2
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : r.speakerDetails?.s2Count === 1
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
              {r.speakerDetails?.s2Count === 2 ? '✓ S2 (满2观点)' : r.speakerDetails?.s2Count === 1 ? '⚠️ S2 (仅1/2观点 -50%)' : '✗ S2 (0观点)'}
            </span>

            {/* S3 */}
            <span className={`px-2.5 py-1 rounded-lg font-medium border ${r.speakerDetails?.s3Count === 2
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : r.speakerDetails?.s3Count === 1
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
              {r.speakerDetails?.s3Count === 2 ? '✓ S3 (满2观点)' : r.speakerDetails?.s3Count === 1 ? '⚠️ S3 (仅1/2观点 -50%)' : '✗ S3 (0观点)'}
            </span>

            <span className={`px-2.5 py-1 rounded-lg font-medium border ${r.speakerDetails?.conclusionHit ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {r.speakerDetails?.conclusionHit ? '✓ 结尾总结' : '✗ 缺少结尾'}
            </span>
          </div>

          {/* 扣分诊断列表 */}
          {r.speakerDetails?.diagnostics && r.speakerDetails.diagnostics.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <span>⚠️</span>
                <span>考场扣分明细与诊断：</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 font-mono text-[11px]">
                {r.speakerDetails.diagnostics.map((diag, dIdx) => (
                  <li key={dIdx}>{diag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 考场速记白板真实还原 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span>📝 模考时您的速记白板记录</span>
            <span className="text-[10px] font-normal text-slate-400">（还原实考笔记）</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Topic (议题)</div>
              <div className="mt-1 font-semibold text-slate-800 break-words">
                {item.scratchpadNotes.topic || <span className="text-slate-300 italic">空白</span>}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="text-[10px] font-bold text-blue-500 uppercase">Speaker 1</div>
              <div className="mt-1 font-semibold text-slate-800 break-words">
                {item.scratchpadNotes.s1 || <span className="text-slate-300 italic">空白</span>}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="text-[10px] font-bold text-emerald-600 uppercase">Speaker 2</div>
              <div className="mt-1 font-semibold text-slate-800 break-words">
                {item.scratchpadNotes.s2 || <span className="text-slate-300 italic">空白</span>}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
              <div className="text-[10px] font-bold text-purple-600 uppercase">Speaker 3</div>
              <div className="mt-1 font-semibold text-slate-800 break-words">
                {item.scratchpadNotes.s3 || <span className="text-slate-300 italic">空白</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 原文精听与高分示范 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>考题原声音频与讨论文本</span>
            </h4>

            <button
              onClick={() => togglePlayAudio(`original_${qIndex}`, q.audioUrl)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              {playingAudioType === `original_${qIndex}` ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-slate-700" />
                  <span>暂停考题原声</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-slate-700" />
                  <span>重播三人讨论原声</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700 max-h-48 overflow-y-auto whitespace-pre-line font-sans">
            {q.transcript}
          </div>

          {/* 高分范例 */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              高分参考答题范文：
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs leading-relaxed font-mono text-emerald-950">
              {q.modelAnswer}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 隐藏音频播放器 */}
        <audio
          ref={audioPlayerRef}
          onEnded={() => setPlayingAudioType(null)}
          className="hidden"
        />

        {/* 顶部标题栏 */}
        <div className="bg-slate-900 text-white p-5 sm:p-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                PTE MOCK REPORT
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                SGD 全真模考成绩单
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            title="关闭报告"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 模考导航 Tab 切换 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition-all border-b-2 cursor-pointer ${activeTab === 'overview'
              ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>模考综合总览 (Overall)</span>
          </button>

          <button
            onClick={() => setActiveTab('q1_review')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition-all border-b-2 cursor-pointer ${activeTab === 'q1_review'
              ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span>Q1 深度复盘 (第 {q1Result.question.num} 题)</span>
          </button>

          <button
            onClick={() => setActiveTab('q2_review')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition-all border-b-2 cursor-pointer ${activeTab === 'q2_review'
              ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span>Q2 深度复盘 (第 {q2Result.question.num} 题)</span>
          </button>
        </div>

        {/* 主内容区域 */}
        <div className="p-5 sm:p-7 max-h-[72vh] overflow-y-auto space-y-6">
          {activeTab === 'overview' ? (
            /* 页面 1：总分与两题对比综合总览 */
            <div className="space-y-6 animate-fadeIn">
              {/* 总分核心大卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80 border border-indigo-100 shadow-xs">
                {/* 综合总分 */}
                <div className="sm:col-span-1 flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-indigo-200/80 shadow-xs text-center">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">综合模考总分</div>
                  <div className="text-4xl sm:text-5xl font-extrabold text-blue-600 font-mono my-1">
                    {avgTotalScore}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">/ 90 分制</div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-2 ${band.color}`}>
                    {band.label}
                  </span>
                </div>

                {/* 3 大核心分值 */}
                <div className="sm:col-span-3 grid grid-cols-3 gap-3 my-auto">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-3xs">
                    <div className="text-[11px] font-bold text-slate-500">内容分 (Content)</div>
                    <div className="text-2xl font-extrabold text-slate-900 font-mono my-0.5">
                      {avgContentScore}
                      <span className="text-xs text-slate-400 font-normal"> / 6</span>
                    </div>
                    <div className="text-[10px] text-slate-400">两题核心要点抓取</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-3xs">
                    <div className="text-[11px] font-bold text-slate-500">发音分 (Pronunciation)</div>
                    <div className="text-2xl font-extrabold text-slate-900 font-mono my-0.5">
                      {avgPronunciationScore}
                      <span className="text-xs text-slate-400 font-normal"> / 90</span>
                    </div>
                    <div className="text-[10px] text-slate-400">元音饱满与重音精准</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-3xs">
                    <div className="text-[11px] font-bold text-slate-500">流利度 (Fluency)</div>
                    <div className="text-2xl font-extrabold text-slate-900 font-mono my-0.5">
                      {avgFluencyScore}
                      <span className="text-xs text-slate-400 font-normal"> / 90</span>
                    </div>
                    <div className="text-[10px] text-slate-400">均速 {avgWpm} WPM · 无卡顿</div>
                  </div>
                </div>
              </div>

              {/* Q1 与 Q2 实战指标横向对比表格 */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    两道题目作答表现横向对齐 (Question 1 vs Question 2)
                  </span>
                  <span className="text-[10px] text-slate-400">2 题连续出分</span>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {/* 对比行 1: 题目名称 */}
                  <div className="grid grid-cols-3 p-3 bg-white">
                    <div className="font-semibold text-slate-500">考题题号与标题</div>
                    <div className="font-bold text-blue-700">Q1: 第 {q1Result.question.num} 题 · {q1Result.question.title}</div>
                    <div className="font-bold text-indigo-700">Q2: 第 {q2Result.question.num} 题 · {q2Result.question.title}</div>
                  </div>

                  {/* 对比行 2: 单题总分 */}
                  <div className="grid grid-cols-3 p-3 bg-slate-50/50 font-mono">
                    <div className="font-semibold text-slate-500 font-sans">单题总分 (/90)</div>
                    <div className="font-bold text-base text-slate-900">{q1Result.report.totalScore} 分</div>
                    <div className="font-bold text-base text-slate-900">{q2Result.report.totalScore} 分</div>
                  </div>

                  {/* 对比行 3: 内容得分 */}
                  <div className="grid grid-cols-3 p-3 bg-white font-mono">
                    <div className="font-semibold text-slate-500 font-sans">内容要点分 (/6)</div>
                    <div>{q1Result.report.contentScore} / 6</div>
                    <div>{q2Result.report.contentScore} / 6</div>
                  </div>

                  {/* 对比行 4: 发音得分 */}
                  <div className="grid grid-cols-3 p-3 bg-slate-50/50 font-mono">
                    <div className="font-semibold text-slate-500 font-sans">发音得分 (/90)</div>
                    <div>{q1Result.report.pronunciationScore} / 90</div>
                    <div>{q2Result.report.pronunciationScore} / 90</div>
                  </div>

                  {/* 对比行 5: 流利度得分 */}
                  <div className="grid grid-cols-3 p-3 bg-white font-mono">
                    <div className="font-semibold text-slate-500 font-sans">流利度得分 (/90)</div>
                    <div>{q1Result.report.fluencyScore} / 90</div>
                    <div>{q2Result.report.fluencyScore} / 90</div>
                  </div>

                  {/* 对比行 6: 作答时长与语速 */}
                  <div className="grid grid-cols-3 p-3 bg-slate-50/50 font-mono">
                    <div className="font-semibold text-slate-500 font-sans">作答时长 & 语速</div>
                    <div>{q1Result.report.durationSeconds} 秒 · {q1Result.report.wpm} WPM</div>
                    <div>{q2Result.report.durationSeconds} 秒 · {q2Result.report.wpm} WPM</div>
                  </div>

                  {/* 对比行 7: 快速复盘入口 */}
                  <div className="grid grid-cols-3 p-3 bg-white">
                    <div className="font-semibold text-slate-500">深入诊断与原文</div>
                    <div>
                      <button
                        onClick={() => setActiveTab('q1_review')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                      >
                        查看 Q1 逐词发音与复盘 →
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => setActiveTab('q2_review')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      >
                        查看 Q2 逐词发音与复盘 →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 模考总结评语 */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  PTE SGD 实战综合考评总结：
                </div>
                <p>
                  本次全真模考共输出 <strong>{totalWords}</strong> 个词汇，平均作答语速 <strong>{avgWpm} WPM</strong>。
                  {avgTotalScore >= 79
                    ? '恭喜！您的答题结构严谨完整，发音与流利度均处于高分区间，已具备考场八炸九炸的绝对实力！'
                    : avgTotalScore >= 65
                      ? '表现良好！整体结构完整，建议点击上方“复盘”标签，重点回听发音泛红的单词，加强 S1/S2/S3 两个观点的连贯度。'
                      : '继续加油！建议强化“5步阶梯模版”的熟练度，利用右侧白板养成快速记录 S1/S2/S3 各两句话的速记习惯。'}
                </p>
              </div>

              {/* 评分说明与免责提示 */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-slate-600 space-y-1 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>评分说明</span>
                </div>
                <p>
                  本模考评分仅供练习参考，不代表真实考试成绩。本网站的主要目的是帮助大家熟悉模版和做题方法。
                </p>
              </div>
            </div>
          ) : activeTab === 'q1_review' ? (
            /* 页面 2: Q1 深度复盘 */
            renderReviewContent(q1Result, 1)
          ) : (
            /* 页面 3: Q2 深度复盘 */
            renderReviewContent(q2Result, 2)
          )}
        </div>

        {/* 底部功能控制条 */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBackToPractice}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回单题专项练习</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onRetakeMock}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>再来一套全真模考 (随机换 2 题)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
