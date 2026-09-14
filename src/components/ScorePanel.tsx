import React, { useState, useRef, useEffect } from 'react';
import { SGDScoreReport } from '../utils/scoringEngine';
import { Play, Pause, RotateCcw, CheckCircle2, HelpCircle, X, ChevronRight, Award, AlertCircle } from 'lucide-react';

interface ScorePanelProps {
  report: SGDScoreReport;
  questionNum: number;
  questionTitle: string;
  recordedAudioUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onNextQuestion?: () => void;
}

export const ScorePanel: React.FC<ScorePanelProps> = ({
  report,
  questionNum,
  questionTitle,
  recordedAudioUrl,
  isOpen,
  onClose,
  onRetry,
  onNextQuestion
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const togglePlayRecorded = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-2xs"
          title="关闭评分页面"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 顶部标题区 */}
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-2xl font-bold shadow-xs">
            <Award className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                PTE Academic 评分报告
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                SGD #{questionNum}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              题目: <span className="font-semibold text-slate-700">{questionTitle}</span>
            </p>
          </div>
        </div>

        {/* 主体左右排版 (充裕大空间，再无挤压重叠) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* 左列：分数总览与细项 (4 列) */}
          <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center text-center shadow-xs">
            {/* 大总分圆环 */}
            <div className="relative w-40 h-40 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* 底环 */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-200"
                  fill="transparent"
                />
                {/* 进度环 */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={report.totalScore === 0 ? 251.2 : 251.2 - (251.2 * report.totalScore) / 90}
                  strokeLinecap="round"
                  className={`${report.totalScore === 0 ? 'text-slate-300' : report.totalScore >= 79 ? 'text-emerald-500' : 'text-amber-500'} transition-all duration-1000 ease-out`}
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-baseline">
                  <span className={`text-4xl font-extrabold tracking-tight ${report.totalScore === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                    {report.totalScore}
                  </span>
                  <span className="text-slate-400 text-sm font-semibold ml-0.5">/90</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mt-1">
                  TOTAL SCORE
                </span>
              </div>
            </div>

            {/* 细项分：内容 6/6、发音 85/90、流利度 90/90 */}
            <div className="w-full space-y-3 my-4 px-2">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200">
                <span className="text-slate-600 flex items-center gap-1 font-medium">
                  内容 (Content):
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                </span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {report.contentScore} <span className="text-slate-400 text-xs font-normal">/ 6</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200">
                <span className="text-slate-600 flex items-center gap-1 font-medium">
                  发音 (Pronunciation):
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                </span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {report.pronunciationScore} <span className="text-slate-400 text-xs font-normal">/ 90</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200">
                <span className="text-slate-600 flex items-center gap-1 font-medium">
                  流利度 (Fluency):
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                </span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {report.fluencyScore} <span className="text-slate-400 text-xs font-normal">/ 90</span>
                </span>
              </div>
            </div>


            {/* 评分说明与免责提示 */}
            <div className="w-full mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-slate-600 leading-relaxed text-left space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>评分说明</span>
              </div>
              <p>
                本评分仅供练习参考，不代表真实考试成绩。本网站的主要目的是帮助大家熟悉 SGD 题型模版和做题方法。
              </p>
            </div>
          </div>

          {/* 右列：录音回听、逐词置信度色彩报告与诊断建议 (8 列) */}
          <div className="md:col-span-8 space-y-4">
            {/* 口语录音回听控制器 */}
            {recordedAudioUrl && (
              <div className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <audio
                  ref={audioRef}
                  src={recordedAudioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayRecorded}
                    className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xs transition-colors"
                    title="回放我的作答录音"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      我的口语录音回听
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-2">
                      <span>时长: {formatSeconds(report.durationSeconds)} · 词数: {report.wordCount} words</span>
                      {report.durationSeconds > 0 && report.durationSeconds < 50 && report.wordCount > 0 && (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                          低于50秒推荐 (建议1分钟左右)
                        </span>
                      )}
                      {report.durationSeconds >= 50 && report.durationSeconds <= 75 && (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                          1分钟左右黄金时长
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onRetry();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重新作答</span>
                </button>
              </div>
            )}

            {/* 逐词发音诊断（绿、黄、红） */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🎯</span> 语音识别及发音置信度分布:
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    绿色: 优 (&ge;85)
                  </span>
                  <span className="flex items-center gap-1 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    黄色: 尚可
                  </span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    红色: 需加强
                  </span>
                </div>
              </div>

              <div className="text-sm leading-relaxed p-4 bg-white rounded-lg border border-slate-200 min-h-[110px] max-h-[220px] overflow-y-auto font-sans">
                {report.coloredWords && report.coloredWords.length > 0 ? (
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                    {report.coloredWords.map((item, idx) => {
                      let colorClass = 'text-emerald-700 font-semibold';
                      if (item.level === 'poor') {
                        colorClass = 'text-rose-600 underline decoration-rose-300 font-bold';
                      } else if (item.level === 'average') {
                        colorClass = 'text-amber-700 font-medium';
                      }
                      return (
                        <span
                          key={idx}
                          className={`${colorClass} hover:opacity-80 transition-opacity cursor-default`}
                          title={`置信度: ${Math.round(item.confidence * 100)}%`}
                        >
                          {item.word}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">
                    {report.rawTranscript || '未检测到清晰发音，请检查麦克风后重新录制。'}
                  </p>
                )}
              </div>
            </div>

            {/* 考官综合建议与采分点达成情况 */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2.5">
              <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  考官综合评价与提分建议:
                </span>
                <span className="text-[11px] font-mono text-emerald-700">
                  WPM 语速: {report.wpm} (标准 120~150)
                </span>
              </div>
              <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  {report.totalScore === 0
                    ? '未检测到有效口语作答或发音。根据评分准则，当内容分（Content）判定为 0 时，说明未收录到讨论相关有效观点，发音与流利度均不计分（判为 0 分）。请确保麦克风权限已开启并正常收音，尝试大声朗读速记白板模版。'
                    : report.totalScore >= 79
                      ? '太棒了！你的作答内容完整覆盖了讨论各方观点，语速稳定，发音置信度极高，已达到 PTE 85+ 乃至 90 炸满分水准！'
                      : report.totalScore >= 65
                        ? '表现良好！成功涵盖了核心讨论主题。建议进一步使用固定模板连接词（如 according to the first speaker, as for the second speaker），避免中间犹豫停顿，冲击 79+ / 85+！'
                        : '内容或流利度有待加强。建议直接点击「考场速记白板」恢复示范要点，按照 5 步模板大声朗读并记录关键词后再练习。'}
                </p>
                {report.totalScore > 0 && report.durationSeconds < 50 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                    ⚠️ <strong>作答时长建议：</strong>本次作答用时 {report.durationSeconds} 秒，未达推荐的 50 秒下限。PTE SGD 总结回答时间建议<strong>1 分钟左右为佳（切勿低于 50 秒）</strong>。若足够流利且内容记得多可多说点，确保每个 Speaker 说满两句话并用衔接词衔接！
                  </div>
                )}
              </div>
              <div className="pt-2.5 border-t border-emerald-200/60 space-y-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-600 font-bold">采分要点双论点覆盖:</span>
                  <span className={`px-2 py-0.5 rounded font-medium border ${report.speakerDetails?.topicHit ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {report.speakerDetails?.topicHit ? '✓ 主题核心' : '⚠️ 缺少具体主题'}
                  </span>

                  {/* S1 论点数 */}
                  <span className={`px-2 py-0.5 rounded font-medium border ${report.speakerDetails?.s1Count === 2
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : report.speakerDetails?.s1Count === 1
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                    {report.speakerDetails?.s1Count === 2 ? '✓ S1 (满2观点)' : report.speakerDetails?.s1Count === 1 ? '⚠️ S1 (仅1/2观点 -50%)' : '✗ S1 (0观点)'}
                  </span>

                  {/* S2 论点数 */}
                  <span className={`px-2 py-0.5 rounded font-medium border ${report.speakerDetails?.s2Count === 2
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : report.speakerDetails?.s2Count === 1
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                    {report.speakerDetails?.s2Count === 2 ? '✓ S2 (满2观点)' : report.speakerDetails?.s2Count === 1 ? '⚠️ S2 (仅1/2观点 -50%)' : '✗ S2 (0观点)'}
                  </span>

                  {/* S3 论点数 */}
                  <span className={`px-2 py-0.5 rounded font-medium border ${report.speakerDetails?.s3Count === 2
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : report.speakerDetails?.s3Count === 1
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                    {report.speakerDetails?.s3Count === 2 ? '✓ S3 (满2观点)' : report.speakerDetails?.s3Count === 1 ? '⚠️ S3 (仅1/2观点 -50%)' : '✗ S3 (0观点)'}
                  </span>

                  <span className={`px-2 py-0.5 rounded font-medium border ${report.speakerDetails?.conclusionHit ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {report.speakerDetails?.conclusionHit ? '✓ 结尾总结' : '✗ 缺少结尾'}
                  </span>
                </div>

                {/* 扣分诊断明细列表 */}
                {report.speakerDetails?.diagnostics && report.speakerDetails.diagnostics.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-[11px] space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>机改诊断与扣分明细：</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800 font-mono text-[10.5px]">
                      {report.speakerDetails.diagnostics.map((diag, dIdx) => (
                        <li key={dIdx}>{diag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onRetry();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新作答本题</span>
          </button>

          <div className="flex items-center gap-3">
            {onNextQuestion && (
              <button
                onClick={() => {
                  onClose();
                  onNextQuestion();
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <span>进入下一题</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              返回练习
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
