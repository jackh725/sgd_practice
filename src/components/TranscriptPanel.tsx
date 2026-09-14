import React, { useState, useRef, useEffect } from 'react';
import { SGDQuestion } from '../data/questionsData';
import { parseKeyPoints } from '../utils/keyPointsParser';
import { 
  FileText, 
  Trophy, 
  Columns, 
  X, 
  Check, 
  Copy, 
  Play, 
  Pause, 
  Volume2 
} from 'lucide-react';

interface TranscriptPanelProps {
  question: SGDQuestion;
  isOpen: boolean;
  onClose: () => void;
}

interface DialogueBlock {
  speaker: string;
  role: 'narration' | 's1' | 's2' | 's3';
  text: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ question, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'bilingual' | 'en' | 'model'>('bilingual');
  const [copiedModel, setCopiedModel] = useState<boolean>(false);
  const parsedKeyPoints = parseKeyPoints(question);

  // 内置复盘微型音频播放器（边听原声边对照原文精听）
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 当弹窗关闭时暂停内部音频
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 解析英文原文中的角色对话
  const parseDialogue = (raw: string): DialogueBlock[] => {
    if (!raw) return [];
    const paragraphs = raw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const result: DialogueBlock[] = [];

    for (const p of paragraphs) {
      if (/^Narration\s*:/i.test(p)) {
        result.push({
          speaker: 'Narration (旁白背景)',
          role: 'narration',
          text: p.replace(/^Narration\s*:\s*/i, '')
        });
      } else if (/^Speaker\s*1\s*:/i.test(p)) {
        result.push({
          speaker: 'Speaker 1 (发言者1)',
          role: 's1',
          text: p.replace(/^Speaker\s*1\s*:\s*/i, '')
        });
      } else if (/^Speaker\s*2\s*:/i.test(p)) {
        result.push({
          speaker: 'Speaker 2 (发言者2)',
          role: 's2',
          text: p.replace(/^Speaker\s*2\s*:\s*/i, '')
        });
      } else if (/^Speaker\s*3\s*:/i.test(p)) {
        result.push({
          speaker: 'Speaker 3 (发言者3)',
          role: 's3',
          text: p.replace(/^Speaker\s*3\s*:\s*/i, '')
        });
      } else {
        result.push({
          speaker: 'Dialogue',
          role: 'narration',
          text: p
        });
      }
    }
    return result;
  };

  const blocks = parseDialogue(question.transcript);

  const getRoleBadgeStyle = (role: DialogueBlock['role']) => {
    switch (role) {
      case 'narration':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 's1':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 's2':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 's3':
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  const handleCopyModel = () => {
    if (!question.modelAnswer) return;
    navigator.clipboard.writeText(question.modelAnswer);
    setCopiedModel(true);
    setTimeout(() => setCopiedModel(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <audio
        ref={audioRef}
        src={question.audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏与精听音频控制条 */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xl shadow-xs">
                📖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    讨论原文与双语精听复盘
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    第 {question.num} 题 · {question.title}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  主题: <span className="font-semibold text-slate-700">{question.topic}</span> · 支持边听音频边对照原文复盘
                </p>
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-800 border border-slate-200 flex items-center justify-center transition-colors shadow-2xs"
              title="关闭复盘页面 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 选项卡切换与精听随行播放器 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* 选项卡（不再单独设中文考点，直接保留左右双语对照、纯英文、示范答案 3 项） */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('bilingual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'bilingual'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>左右双语对照</span>
              </button>

              <button
                onClick={() => setActiveTab('en')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'en'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>纯英文原文</span>
              </button>

              <button
                onClick={() => setActiveTab('model')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'model'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>满分示范范文</span>
              </button>
            </div>

            {/* 精听随身听控制栏 */}
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={togglePlay}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isPlaying ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-blue-600 text-white'
                }`}
                title={isPlaying ? '暂停原题录音' : '播放原题录音进行精听'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-blue-600 hidden sm:inline" />
                <input
                  type="range"
                  min={0}
                  max={duration || 160}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-24 sm:w-36 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[11px] font-mono text-slate-500">
                  {formatTime(currentTime)} / {formatTime(duration || 160)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容展示区 (充裕大空间，带流畅滚动) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* 视图 1：左右双语对照（英文台词在左，中文考点要点在右，全宽展开绝不挤压） */}
          {activeTab === 'bilingual' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* 左列：英文原声台词 (7 列) */}
              <div className="md:col-span-7 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between pb-2 border-b border-slate-200">
                  <span>🇬🇧 英文原声录音台词 (English Transcript)</span>
                  <span className="text-[11px] font-normal text-slate-400">共 {blocks.length} 轮发言</span>
                </div>
                <div className="space-y-3">
                  {blocks.map((b, idx) => (
                    <div key={idx} className="space-y-1.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${getRoleBadgeStyle(b.role)}`}>
                        {b.speaker}
                      </span>
                      <p className="text-xs leading-relaxed text-slate-800 font-sans mt-0.5">
                        {b.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右列：对应考点中文解析 (5 列) - 结构化卡片精细排版 */}
              <div className="md:col-span-5 space-y-4">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="text-blue-600">🎯</span>
                    <span>核心采分点与中文解析 (Key Points)</span>
                  </span>
                  <span className="text-[11px] font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    按角色拆解采分
                  </span>
                </div>

                {/* 讨论主题卡片 (Topic) */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                    <span className="flex items-center gap-1">
                      <span>📌</span> 讨论议题 (Topic)
                    </span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                      开头与结尾总结核心词
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 pt-0.5">
                    {parsedKeyPoints.topicEn}
                  </div>
                  {parsedKeyPoints.topicZh && (
                    <div className="text-xs text-amber-900/80 font-medium">
                      中文主题：{parsedKeyPoints.topicZh}
                    </div>
                  )}
                </div>

                {/* 逐个发言者解析卡片 */}
                <div className="space-y-3.5">
                  {parsedKeyPoints.speakers.map((spk, sIdx) => {
                    const isS1 = spk.role === 's1';
                    const isS2 = spk.role === 's2';
                    const isS3 = spk.role === 's3';

                    const cardBg = isS1
                      ? 'bg-blue-50/40 border-blue-200'
                      : isS2
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isS3
                      ? 'bg-purple-50/40 border-purple-200'
                      : 'bg-slate-50 border-slate-200';

                    const badgeStyle = isS1
                      ? 'bg-blue-100/70 text-blue-800 border-blue-300'
                      : isS2
                      ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                      : isS3
                      ? 'bg-purple-100/70 text-purple-800 border-purple-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <div
                        key={sIdx}
                        className={`rounded-2xl border p-4 shadow-2xs space-y-3 ${cardBg}`}
                      >
                        {/* 角色卡片头部 */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>
                              {spk.speakerName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {isS1 ? '观点视角 1' : isS2 ? '观点视角 2' : isS3 ? '观点视角 3' : '讨论观点'}
                          </span>
                        </div>

                        {/* 小节列表 */}
                        <div className="space-y-3">
                          {spk.sections.map((sec, secIdx) => (
                            <div key={secIdx} className="space-y-1.5">
                              {sec.title && (
                                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                                  <span>{sec.title}</span>
                                </div>
                              )}
                              <div className="space-y-2 pl-2">
                                {sec.items.map((item, itIdx) => (
                                  <div
                                    key={itIdx}
                                    className="text-xs bg-white/80 p-2.5 rounded-lg border border-slate-200/80 shadow-3xs space-y-0.5"
                                  >
                                    {item.en && (
                                      <p className="font-semibold text-slate-900 leading-snug">
                                        <span className="text-blue-600 mr-1 font-mono">{itIdx + 1}.</span>
                                        {item.en}
                                      </p>
                                    )}
                                    {item.zh && (
                                      <p className="text-[11px] text-slate-600 leading-relaxed font-sans pl-3.5">
                                        {item.zh}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 视图 2：单列纯英文原文 */}
          {activeTab === 'en' && (
            <div className="max-w-3xl mx-auto space-y-3">
              {blocks.map((b, idx) => (
                <div key={idx} className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold border ${getRoleBadgeStyle(b.role)}`}>
                    {b.speaker}
                  </span>
                  <p className="text-xs leading-relaxed text-slate-800 font-sans mt-1">
                    {b.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 视图 3：满分示范范文 */}
          {activeTab === 'model' && (
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <span>★</span> 90 分满分参考转述范文：
                </span>
                <button
                  onClick={handleCopyModel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors shadow-2xs cursor-pointer"
                >
                  {copiedModel ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedModel ? '已复制范文' : '复制整段范文'}</span>
                </button>
              </div>

              <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-mono shadow-2xs">
                {question.modelAnswer || '暂无示范答案'}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮栏 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            关闭返回作答
          </button>
        </div>
      </div>
    </div>
  );
};
