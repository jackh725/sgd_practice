import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { SGD_QUESTIONS, SGDQuestion } from './data/questionsData';
import { 
  playExamBeep, 
  SGDRecorder, 
  createSGDRecognizer, 
  calculateSGDScore, 
  SGDScoreReport 
} from './utils/scoringEngine';
import { 
  saveOfflineRecording, 
  getOfflineRecording, 
  getAllOfflineRecordings, 
  clearAllOfflineRecordings, 
  getOfflineStorageStats 
} from './utils/audioStorage';
import { Scratchpad } from './components/Scratchpad';
import { SpeakingTemplatePanel } from './components/SpeakingTemplatePanel';
import { ExamTipsModal } from './components/ExamTipsModal';
import { TranscriptPanel } from './components/TranscriptPanel';
import { ScorePanel } from './components/ScorePanel';
import { SponsorModal } from './components/SponsorModal';
import { QuestionListDrawer } from './components/QuestionListDrawer';
import { MockExamIntro } from './components/MockExamIntro';
import { MockScoreReportModal, MockExamItemResult } from './components/MockScoreReportModal';
import { initTimeEngagementTracker, logEvent } from './utils/analytics';
import { 
  Play, 
  Pause, 
  Mic, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  List, 
  Coffee,
  ChevronLeft,
  ChevronRight,
  FileText,
  PenTool,
  Volume2,
  Sparkles,
  Award
} from 'lucide-react';

export function App() {
  const [currentQuestion, setCurrentQuestion] = useState<SGDQuestion>(() => SGD_QUESTIONS[0]);
  const [mode, setMode] = useState<'practice' | 'mock'>('practice');

  // 'idle' | 'audio_playing' | 'prep_countdown' (10s) | 'recording' (2min) | 'scored'
  const [examStage, setExamStage] = useState<'idle' | 'audio_playing' | 'prep_countdown' | 'recording' | 'scored'>('idle');
  const [prepSeconds, setPrepSeconds] = useState<number>(10);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const maxRecordSeconds = 120; // 2 分钟上限

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const recorderRef = useRef<SGDRecorder>(new SGDRecorder());
  const recognizerRef = useRef<ReturnType<typeof createSGDRecognizer> | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [recognizedWords, setRecognizedWords] = useState<{ word: string; confidence: number }[]>([]);
  const [userRecordedAudioUrl, setUserRecordedAudioUrl] = useState<string>('');

  // 挂载用户活跃停留时长追踪器（30s / 1m / 3m / 5m / 10m 阶梯事件）
  useEffect(() => {
    const cleanup = initTimeEngagementTracker();
    return cleanup;
  }, []);
  const [scoreReport, setScoreReport] = useState<SGDScoreReport | null>(null);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);

  // 本地离线录音管理 (IndexedDB)
  const [offlineRecordingsMap, setOfflineRecordingsMap] = useState<Record<number, { score: number; duration: number }>>({});
  const [offlineStats, setOfflineStats] = useState<{ count: number; totalMB: string }>({ count: 0, totalMB: '0.00' });

  const loadRecordingsMap = async () => {
    try {
      const list = await getAllOfflineRecordings();
      const map: Record<number, { score: number; duration: number }> = {};
      for (const r of list) {
        map[r.questionId] = {
          score: r.scoreReport?.totalScore ?? 0,
          duration: r.durationSeconds ?? 0
        };
      }
      setOfflineRecordingsMap(map);
      const stats = await getOfflineStorageStats();
      setOfflineStats(stats);
    } catch (err) {
      console.warn('Failed to load offline recordings map:', err);
    }
  };

  useEffect(() => {
    loadRecordingsMap();
  }, []);

  // 全真模考模式状态管理 (固定抽取 2 题连续盲测出分)
  const [mockStage, setMockStage] = useState<'intro' | 'testing' | 'finished'>('intro');
  const [mockQuestions, setMockQuestions] = useState<[SGDQuestion, SGDQuestion]>(() => {
    const shuffled = [...SGD_QUESTIONS].sort(() => 0.5 - Math.random());
    return [shuffled[0], shuffled[1]];
  });
  const [mockCurrentIndex, setMockCurrentIndex] = useState<0 | 1>(0);
  const [mockQ1Result, setMockQ1Result] = useState<MockExamItemResult | null>(null);
  const [mockQ2Result, setMockQ2Result] = useState<MockExamItemResult | null>(null);
  const [isMockScoreOpen, setIsMockScoreOpen] = useState<boolean>(false);

  // 默认展开考场速记白板（左右分栏），默认收起讨论原文
  const [showScratchpad, setShowScratchpad] = useState<boolean>(true);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  // 答题模版状态（开启后在左侧展示模版，并将左侧控制台收起为微型控制坞）
  const [showTemplate, setShowTemplate] = useState<boolean>(false);
  const [showTipsModal, setShowTipsModal] = useState<boolean>(false);
  const [currentNotes, setCurrentNotes] = useState<{ topic: string; s1: string; s2: string; s3: string }>({
    topic: '',
    s1: '',
    s2: '',
    s3: ''
  });

  // 题目切换时加载对应的速记草稿笔记与本地历史作答录音
  useEffect(() => {
    const storageKey = `pte_sgd_scratch_${currentQuestion.num}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCurrentNotes({
          topic: data.topic || '',
          s1: data.s1 || '',
          s2: data.s2 || '',
          s3: data.s3 || ''
        });
      } catch {
        setCurrentNotes({ topic: '', s1: '', s2: '', s3: '' });
      }
    } else {
      setCurrentNotes({ topic: '', s1: '', s2: '', s3: '' });
    }

    // 在普通模式下，自动加载本题的历史离线录音与历史评分报告（支持断点回听）
    if (mode === 'practice') {
      let isCurrent = true;
      getOfflineRecording(currentQuestion.id).then((rec) => {
        if (!isCurrent) return;
        if (rec && rec.audioBlob) {
          const audioUrl = URL.createObjectURL(rec.audioBlob);
          setUserRecordedAudioUrl(audioUrl);
          setScoreReport(rec.scoreReport);
          setExamStage('scored');
          setRecognizedText(rec.recognizedText || '');
        } else {
          // 本题尚无历史录音，重置为待作答
          setUserRecordedAudioUrl('');
          setScoreReport(null);
          setExamStage('idle');
          setRecognizedText('');
          setRecognizedWords([]);
        }
      }).catch(() => {});

      return () => {
        isCurrent = false;
      };
    }
  }, [currentQuestion.id, currentQuestion.num, mode]);

  const handleClearAllRecordings = async () => {
    await clearAllOfflineRecordings();
    setUserRecordedAudioUrl('');
    setScoreReport(null);
    setExamStage('idle');
    loadRecordingsMap();
  };

  const handleNotesChange = (updated: { topic: string; s1: string; s2: string; s3: string }) => {
    setCurrentNotes(updated);
    const storageKey = `pte_sgd_scratch_${currentQuestion.num}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // 推荐高分范例比对与一键切换
  const exampleTopic = (currentQuestion.quickNotes?.topic || '').trim();
  const exampleS1 = (currentQuestion.quickNotes?.s1 || []).join('; ').trim();
  const exampleS2 = (currentQuestion.quickNotes?.s2 || []).join('; ').trim();
  const exampleS3 = (currentQuestion.quickNotes?.s3 || []).join('; ').trim();

  const isExampleFilled = Boolean(
    (currentNotes.topic.trim() || currentNotes.s1.trim()) &&
    currentNotes.topic.trim() === exampleTopic &&
    currentNotes.s1.trim() === exampleS1 &&
    currentNotes.s2.trim() === exampleS2 &&
    currentNotes.s3.trim() === exampleS3
  );

  const handleToggleExample = () => {
    if (isExampleFilled) {
      handleNotesChange({ topic: '', s1: '', s2: '', s3: '' });
    } else {
      handleNotesChange({
        topic: exampleTopic,
        s1: exampleS1,
        s2: exampleS2,
        s3: exampleS3
      });
    }
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSponsorOpen, setIsSponsorOpen] = useState<boolean>(false);
  const [isSponsorMilestone, setIsSponsorMilestone] = useState<boolean>(false);
  const [completedQuestionIds, setCompletedQuestionIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('pte_sgd_completed_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 检查并触发单题专项练习 5 题里程碑赞赏弹窗（仅在单题专项练习关闭成绩单时触发，全真模考下完全禁用）
  const checkAndTriggerPracticeMilestone = () => {
    if (mode === 'mock') return;
    const hasPrompted = localStorage.getItem('pte_sgd_sponsor_prompted_once') === 'true';
    if (hasPrompted || isSponsorOpen) return;

    let currentCompletedCount = completedQuestionIds.length;
    try {
      const saved = localStorage.getItem('pte_sgd_completed_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) currentCompletedCount = parsed.length;
      }
    } catch {}

    if (currentCompletedCount >= 5) {
      setTimeout(() => {
        setIsSponsorMilestone(true);
        setIsSponsorOpen(true);
        localStorage.setItem('pte_sgd_sponsor_prompted_once', 'true');
      }, 350);
    }
  };

  const handleCloseScoreModal = () => {
    setIsScoreModalOpen(false);
    checkAndTriggerPracticeMilestone();
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isScoringInProgress = useRef<boolean>(false);
  const isStartingRecording = useRef<boolean>(false);
  const createdUrlRef = useRef<string | null>(null);
  const pauseCountRef = useRef<number>(0);

  useEffect(() => {
    resetAll();
  }, [currentQuestion, mode]);

  const resetAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
    }
    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    if (createdUrlRef.current) {
      try {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      } catch {}
    }
    setIsAudioPlaying(false);
    setExamStage('idle');
    setPrepSeconds(10);
    setRecordSeconds(0);
    setRecognizedText('');
    setRecognizedWords([]);
    setUserRecordedAudioUrl('');
    setScoreReport(null);
    setIsScoreModalOpen(false);
    isScoringInProgress.current = false;
    isStartingRecording.current = false;
  };

  const togglePlayDiscussion = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
      if (mode === 'mock') setExamStage('idle');
    } else {
      audioRef.current.play();
      setIsAudioPlaying(true);
      setExamStage('audio_playing');
      logEvent('play_audio');
    }
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
    startPrepCountdown();
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(val) && isFinite(val)) {
      audioRef.current.currentTime = Math.max(0, Math.min(val, audioDuration || 160));
      setAudioCurrentTime(val);
    }
  };

  const startPrepCountdown = () => {
    setExamStage('prep_countdown');
    setPrepSeconds(10);

    let sec = 10;
    timerRef.current = setInterval(async () => {
      sec -= 1;
      setPrepSeconds(sec);

      if (sec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        await playExamBeep();
        startRecording();
      }
    }, 1000);
  };

  const startRecording = async () => {
    if (isStartingRecording.current || examStage === 'recording') return;
    isStartingRecording.current = true;
    try {
      setExamStage('recording');
      setRecordSeconds(0);
      setRecognizedText('');
      setRecognizedWords([]);

      await recorderRef.current.start();

      pauseCountRef.current = 0;
      recognizerRef.current = createSGDRecognizer(
        (text, wordsWithConf, pauses) => {
          setRecognizedText(text);
          setRecognizedWords(wordsWithConf);
          pauseCountRef.current = pauses;
        },
        (err) => console.warn('Recognizer error:', err)
      );
      recognizerRef.current.start();

      let elapsed = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordSeconds(elapsed);
        if (elapsed >= maxRecordSeconds) {
          stopRecordingAndScore();
        }
      }, 1000);
    } catch {
      alert('无法访问麦克风，请允许麦克风权限后重试。');
      setExamStage('idle');
    } finally {
      isStartingRecording.current = false;
    }
  };

  const stopRecordingAndScore = async () => {
    if (isScoringInProgress.current) return;
    isScoringInProgress.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    const detectedPauses = recognizerRef.current?.getPauseCount?.() ?? pauseCountRef.current;

    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
    }

    try {
      const { blob, url } = await recorderRef.current.stop();
      if (createdUrlRef.current && createdUrlRef.current !== url) {
        try {
          URL.revokeObjectURL(createdUrlRef.current);
        } catch {}
      }
      createdUrlRef.current = url;
      setUserRecordedAudioUrl(url);

      const currentTargetQ = mode === 'mock' ? mockQuestions[mockCurrentIndex] : currentQuestion;
      const report = calculateSGDScore(
        recognizedText,
        recognizedWords,
        recordSeconds,
        currentTargetQ.topic,
        currentTargetQ.quickNotes?.s1,
        currentTargetQ.quickNotes?.s2,
        currentTargetQ.quickNotes?.s3,
        detectedPauses
      );

      // 保存录音到本地 IndexedDB，支持刷新和换题后依然能离线回听
      if (blob && blob.size > 0) {
        saveOfflineRecording({
          questionId: currentTargetQ.id,
          questionNum: currentTargetQ.num,
          audioBlob: blob,
          durationSeconds: recordSeconds,
          timestamp: Date.now(),
          scoreReport: report,
          recognizedText
        }).then(() => {
          loadRecordingsMap();
        }).catch((err) => console.warn('IndexedDB save error:', err));
      }

      if (mode === 'mock') {
        const itemResult: MockExamItemResult = {
          question: currentTargetQ,
          report,
          recordedAudioUrl: url,
          recognizedText,
          durationSeconds: recordSeconds,
          scratchpadNotes: { ...currentNotes }
        };

        if (mockCurrentIndex === 0) {
          // 第 1 题完成，保存 Q1 并自动进入第 2 题
          setMockQ1Result(itemResult);
          setMockCurrentIndex(1);
          setCurrentQuestion(mockQuestions[1]);
          setCurrentNotes({ topic: '', s1: '', s2: '', s3: '' }); // Q2 全新空白速记白板
          setRecognizedText('');
          setRecognizedWords([]);
          setRecordSeconds(0);
          setExamStage('audio_playing');
          setIsAudioPlaying(true);

          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.src = mockQuestions[1].audioUrl;
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => console.warn('Q2 audio play error:', e));
            }
          }, 350);
        } else {
          // 第 2 题完成，保存 Q2 并生成全真模考综合报告
          setMockQ2Result(itemResult);
          setMockStage('finished');
          setIsMockScoreOpen(true);
          setExamStage('idle');
          setIsAudioPlaying(false);

          // 记录完成的题目 ID
          const nextCompleted = Array.from(new Set([...completedQuestionIds, mockQuestions[0].id, mockQuestions[1].id]));
          setCompletedQuestionIds(nextCompleted);
          localStorage.setItem('pte_sgd_completed_ids', JSON.stringify(nextCompleted));

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 }
          });
          logEvent('finish_mock_exam');
        }
      } else {
        setScoreReport(report);
        setExamStage('scored');
        setIsScoreModalOpen(true);
        logEvent('complete_practice');

        if (!completedQuestionIds.includes(currentQuestion.id)) {
          const nextIds = [...completedQuestionIds, currentQuestion.id];
          setCompletedQuestionIds(nextIds);
          localStorage.setItem('pte_sgd_completed_ids', JSON.stringify(nextIds));
        }

        if (report.totalScore >= 79) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (e) {
      console.error('Stop recording error:', e);
      setExamStage('idle');
    } finally {
      isScoringInProgress.current = false;
    }
  };

  const handleReshuffleMock = () => {
    const shuffled = [...SGD_QUESTIONS].sort(() => 0.5 - Math.random());
    setMockQuestions([shuffled[0], shuffled[1]]);
  };

  const handleStartMockExam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      alert('请允许浏览器麦克风权限以参加模考');
      return;
    }

    setMockStage('testing');
    setMockCurrentIndex(0);
    setMockQ1Result(null);
    setMockQ2Result(null);
    setCurrentQuestion(mockQuestions[0]);
    setCurrentNotes({ topic: '', s1: '', s2: '', s3: '' });
    setShowTemplate(false);
    resetAll();
    logEvent('start_mock_exam');

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = mockQuestions[0].audioUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => {
          setIsAudioPlaying(true);
          setExamStage('audio_playing');
        }).catch(err => {
          console.warn('Auto play failed:', err);
          setIsAudioPlaying(false);
          setExamStage('idle');
        });
      }
    }, 300);
  };

  const handleExitMock = () => {
    if (confirm('确定要退出当前模考并返回单题练习模式吗？未完成的答题将不会计入成绩。')) {
      resetAll();
      setMode('practice');
      setMockStage('intro');
      setMockCurrentIndex(0);
    }
  };

  const handleRetakeMock = () => {
    setIsMockScoreOpen(false);
    const shuffled = [...SGD_QUESTIONS].sort(() => 0.5 - Math.random());
    setMockQuestions([shuffled[0], shuffled[1]]);
    handleStartMockExam();
  };

  const handleBackToPractice = () => {
    setIsMockScoreOpen(false);
    setMode('practice');
    setMockStage('intro');
    resetAll();
  };

  const handlePrevQuestion = () => {
    const idx = SGD_QUESTIONS.findIndex(q => q.id === currentQuestion.id);
    if (idx > 0) {
      resetAll();
      setCurrentQuestion(SGD_QUESTIONS[idx - 1]);
    }
  };

  const handleNextQuestion = () => {
    const idx = SGD_QUESTIONS.findIndex(q => q.id === currentQuestion.id);
    if (idx < SGD_QUESTIONS.length - 1) {
      resetAll();
      setCurrentQuestion(SGD_QUESTIONS[idx + 1]);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      <audio
        ref={audioRef}
        src={currentQuestion.audioUrl}
        onTimeUpdate={() => audioRef.current && setAudioCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setAudioDuration(audioRef.current.duration)}
        onEnded={handleAudioEnded}
        preload="auto"
      />

      {/* 考试风格顶栏 */}
      {mode === 'mock' && mockStage === 'testing' ? (
        /* 全真模考进行中专用考场顶栏 */
        <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md py-3">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-xl shadow-xs font-bold text-white">
                🎯
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-white tracking-tight">
                    PTE Academic SGD 全真模考
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    考试进行中
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  2-Item Standard Test · 标准闭卷连考模式
                </p>
              </div>
            </div>

            {/* 中间进度条 */}
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-800/90 px-4 py-2 rounded-full border border-slate-700 text-xs font-mono shadow-inner">
              <span className={`flex items-center gap-1 font-bold ${mockCurrentIndex === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {mockCurrentIndex === 0 ? '● 第 1 题 (作答中)' : '✓ 第 1 题 (已完成)'}
              </span>
              <span className="text-slate-600 font-sans">➔</span>
              <span className={`flex items-center gap-1 font-bold ${mockCurrentIndex === 1 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                {mockCurrentIndex === 1 ? '● 第 2 题 (作答中)' : '○ 第 2 题 (待开始)'}
              </span>
            </div>

            {/* 右侧快捷工具 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScratchpad(!showScratchpad)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  showScratchpad
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="切换考场速记白板"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{showScratchpad ? '收起速记板' : '考场速记板'}</span>
              </button>

              <button
                onClick={handleExitMock}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer"
                title="提前退出模考返回练习模式"
              >
                <span>退出模考</span>
              </button>
            </div>
          </div>
        </header>
      ) : (
        /* 标准普通顶栏 */
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs py-3">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between">
            {/* Logo 与 题型 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl shadow-xs font-bold text-white">
                🎙️
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  PTE Academic SGD
                </h1>
                <p className="text-[11px] text-slate-500">
                  Summarize Group Discussion
                </p>
              </div>
            </div>

            {/* 模式选择 */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 text-[11px] sm:text-xs">
              <button
                onClick={() => setMode('practice')}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'practice'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">单题练习</span>
                <span className="hidden sm:inline">单题专项练习</span>
              </button>
              <button
                onClick={() => {
                  setMode('mock');
                  setMockStage('intro');
                }}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'mock'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">全真模考</span>
                <span className="hidden sm:inline">全真模考模式</span>
              </button>
            </div>

            {/* 顶栏右侧快捷工具 */}
            <div className="flex items-center gap-2">
              {/* 速记白板快捷开关 */}
              <button
                onClick={() => setShowScratchpad(!showScratchpad)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  showScratchpad
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="切换右侧考场速记白板"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{showScratchpad ? '收起速记白板' : '考场速记白板'}</span>
              </button>

              {/* 讨论原文快捷入口 */}
              <button
                onClick={() => setShowTranscript(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
                title="打开独立全屏讨论原文与双语精听复盘页面"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">讨论原文</span>
              </button>

              {/* 查看评分报告快捷入口 */}
              {scoreReport && (
                <button
                  onClick={() => setIsScoreModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all cursor-pointer"
                  title="查看最新评分报告"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>评分报告 ({scoreReport.totalScore}分)</span>
                </button>
              )}

              {/* 题库清单 */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
              >
                <List className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">题库清单</span>
                <span className="text-blue-600 font-mono font-bold">第 {currentQuestion.num} 题</span>
              </button>

              {/* 赞助支持 */}
              <button
                onClick={() => {
                  setIsSponsorMilestone(false);
                  setIsSponsorOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-all active:scale-95 cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                <span>赞助</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* 主体工作区 */}
      {mode === 'mock' && mockStage === 'intro' ? (
        /* 全真模考考生考前须知与抽签确认页面 */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-4 lg:py-6 space-y-4">
          <MockExamIntro
            questions={mockQuestions}
            onStartExam={handleStartMockExam}
            onReshuffle={handleReshuffleMock}
            onBackToPractice={() => setMode('practice')}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-4 lg:py-6 space-y-4">
          {/* 题号与题目信息栏 */}
          {mode === 'mock' ? (
            /* 模考模式信息条：显示当前题号与两题进度 */
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-rose-200 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-bold font-mono">
                  全真模考 · 第 {mockCurrentIndex + 1} 题 / 共 2 题
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {mockQuestions[mockCurrentIndex].title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    讨论主题: <span className="text-slate-800 font-medium">{mockQuestions[mockCurrentIndex].topic}</span> · 闭卷环境 (已隐藏模版与答题提示)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className={mockQ1Result ? 'text-emerald-600 font-bold' : mockCurrentIndex === 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                  第 1 题: {mockQ1Result ? '✓ 已完成' : mockCurrentIndex === 0 ? '● 进行中' : '○ 待开始'}
                </span>
                <span className="text-slate-300">|</span>
                <span className={mockCurrentIndex === 1 ? 'text-rose-600 font-bold animate-pulse' : 'text-slate-500'}>
                  第 2 题: {mockCurrentIndex === 1 ? '● 进行中' : '○ 待开始'}
                </span>
              </div>
            </div>
          ) : (
            /* 普通练习模式信息条 */
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-sm font-bold font-mono">
                  第 {currentQuestion.num} 题 / 34
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {currentQuestion.title}
                    {completedQuestionIds.includes(currentQuestion.id) && (
                      <span title="已完成该题练习">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    讨论主题: <span className="text-slate-800 font-medium">{currentQuestion.topic}</span> · 考试分值: 口语 19% | 听力 20%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevQuestion}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
                  title="上一题"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>上一题</span>
                </button>
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
                  title="下一题"
                >
                  <span>下一题</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        {/* 核心左右布局容器：开启模版时 50/50 (6:6) 宽屏黄金对称；收起模版时 5:7 还原考场主次 */}
        <div className={`grid gap-6 ${showScratchpad ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
          {/* 左侧：练习主体、听力播放与控制、录音作答 (未开模版占5列，开启模版时占6列) */}
          <div className={`space-y-4 ${showScratchpad ? (showTemplate ? 'xl:col-span-6' : 'xl:col-span-5') : 'w-full'}`}>
            {!showTemplate ? (
              /* 考试风：完整大控制台 */
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5">
                {/* 考试作答指令 */}
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-slate-700 leading-relaxed shadow-2xs">
                  <span className="text-blue-700 font-bold mr-1">考试作答指令：</span>
                  You will hear three students discussing a topic. After the audio, you will summarize the discussion. You will have 10 seconds to prepare, and 2 minutes to speak. (听取三人讨论后总结观点，听到提示音 Beep 立即开始作答)。
                </div>

                {/* 核心互动区：录音状态下替换为录音时间监控，非录音状态下显示原音频播放器或倒计时 */}
                {examStage === 'recording' ? (
                  /* 当开始录音后：原音频位置替换为录音时间面板 (原音频不显示，专属显示作答进度) */
                  <div className="bg-rose-50/70 p-3.5 sm:p-4 rounded-xl border border-rose-200 shadow-2xs space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs animate-pulse">
                          <Mic className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                            <span>正在录音作答 (原音频已暂停)</span>
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                          </div>
                          <div className="text-[11px] text-rose-700/80 font-mono">
                            答题上限 2 分钟 · 建议 1 分钟左右（≥50秒）
                          </div>
                        </div>
                      </div>

                      {/* 录音主计时器 */}
                      <div className="text-right">
                        <div className="text-2xl font-extrabold font-mono text-rose-700 tracking-tight">
                          {formatTime(recordSeconds)}
                          <span className="text-xs font-normal text-rose-400 ml-1">/ 02:00</span>
                        </div>
                        <div className="text-[10px] font-semibold">
                          {recordSeconds < 50 ? (
                            <span className="text-amber-800">目标 00:50+ (还差 {50 - recordSeconds}s)</span>
                          ) : recordSeconds <= 75 ? (
                            <span className="text-emerald-700 font-bold">✓ 最佳 1 分钟黄金区间</span>
                          ) : (
                            <span className="text-slate-600">内容充实，已可点击完成</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 录音进度条 (带 50s 门槛与 60s 黄金刻度) */}
                    <div className="relative pt-1 pb-1">
                      <div className="w-full bg-rose-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            recordSeconds >= 50 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, (recordSeconds / 120) * 100)}%` }}
                        />
                      </div>
                      {/* 50秒门槛标注 */}
                      <div 
                        className="absolute top-0 flex flex-col items-center -translate-x-1/2 pointer-events-none" 
                        style={{ left: `${(50 / 120) * 100}%` }}
                      >
                        <div className="w-0.5 h-3 bg-amber-600" />
                        <span className="text-[9px] font-bold text-amber-800 bg-white/95 px-1 rounded shadow-3xs mt-0.5 whitespace-nowrap border border-amber-200">
                          50s推荐线
                        </span>
                      </div>
                    </div>
                  </div>
                ) : examStage === 'prep_countdown' ? (
                  /* 10秒答题准备倒计时 */
                  <div className={`p-4 rounded-xl border shadow-2xs flex items-center justify-between transition-all duration-300 ${
                    prepSeconds === 0 ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-blue-50/70 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-xs transition-all ${
                        prepSeconds === 0 ? 'bg-amber-500 scale-110 animate-bounce' : 'bg-blue-600 animate-pulse'
                      }`}>
                        {prepSeconds === 0 ? '🔔' : prepSeconds}
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${prepSeconds === 0 ? 'text-amber-900' : 'text-blue-900'}`}>
                          {prepSeconds === 0 ? '🔔 BEEP 响铃！请立即开始作答' : '准备答题倒计时 (10秒)'}
                        </div>
                        <div className={`text-[11px] ${prepSeconds === 0 ? 'text-amber-700' : 'text-blue-700/80'}`}>
                          {prepSeconds === 0 ? '开麦录音已启动，请大声流利作答...' : '倒计时归零后将播放 Beep 响铃并自动开始录音作答...'}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${
                      prepSeconds === 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100/70 text-blue-800 border-blue-200'
                    }`}>
                      00:0{prepSeconds}
                    </div>
                  </div>
                ) : (
                  /* 原题音频播放器控制条 (空闲/听音频/已评分状态下显示) */
                  <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={togglePlayDiscussion}
                          disabled={mode === 'mock' && examStage === 'audio_playing'}
                          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs transition-all ${
                            isAudioPlaying
                              ? mode === 'mock'
                                ? 'bg-amber-500 text-slate-950 font-bold opacity-80 cursor-not-allowed'
                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          title={mode === 'mock' ? '模考音频播放中（不可暂停）' : isAudioPlaying ? '暂停讨论音频' : '播放原题讨论录音'}
                        >
                          {isAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>

                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                            原题音频
                            <span className="text-[11px] font-mono text-slate-500 font-normal">
                              {formatTime(audioCurrentTime)} / {formatTime(audioDuration || 160)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {mode === 'mock'
                              ? '全真模考进行中：播完自动倒计时10秒并开始录音'
                              : isAudioPlaying
                              ? '播完将自动响铃并启动录音作答'
                              : '点击播放原题，播完自动10秒倒计时'}
                          </div>
                        </div>
                      </div>

                      {/* 快捷展开白板提示 */}
                      {!showScratchpad && (
                        <button
                          onClick={() => setShowScratchpad(true)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 transition-all shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>点开速记板</span>
                        </button>
                      )}
                    </div>

                    {/* 进度条拖动 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 160}
                        value={audioCurrentTime}
                        onChange={handleAudioSeek}
                        disabled={mode === 'mock'}
                        className={`w-full h-1.5 rounded-lg appearance-none ${
                          mode === 'mock'
                            ? 'bg-slate-200 cursor-not-allowed opacity-60'
                            : 'bg-slate-200 cursor-pointer accent-blue-600'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* 准备就绪 / 状态提示条与重置按钮 (置于录音按钮之前) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    {examStage === 'idle' && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                        准备就绪 · 点击上方播放原题音频开始听力 (1.5~3分钟)
                      </div>
                    )}

                    {examStage === 'audio_playing' && (
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 animate-pulse">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        {mode === 'mock'
                          ? '原题讨论音频播放中 (不可暂停/快进) · 播完自动进入10秒准备...'
                          : '正在收听原题录音中 (播放完毕自动倒计时10秒)...'}
                      </div>
                    )}

                    {examStage === 'prep_countdown' && (
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping inline-block" />
                        10秒准备时间 (听到 Beep 响铃后开始作答)...
                      </div>
                    )}

                    {examStage === 'recording' && (
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                        麦克风收音中 · 满 50 秒后可随时点击「{mode === 'mock' ? (mockCurrentIndex === 0 ? 'Next' : 'Submit') : '完成并评分'}」
                      </div>
                    )}

                    {examStage === 'scored' && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        作答完毕，已生成评分报告
                      </div>
                    )}
                  </div>

                  {/* 状态重置 (仅在普通模式显示，防止模考误触) */}
                  {mode !== 'mock' && (
                    <button
                      onClick={resetAll}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                      title="重置本题状态"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 口语录音主操作区 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    {examStage !== 'recording' ? (
                      <button
                        onClick={startRecording}
                        disabled={examStage === 'audio_playing' && mode === 'mock'}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          examStage === 'audio_playing' && mode === 'mock'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95 cursor-pointer'
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                        <span>开始口语作答</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecordingAndScore}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer animate-pulse ${
                          mode === 'mock'
                            ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                        }`}
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>
                          {mode === 'mock'
                            ? mockCurrentIndex === 0
                              ? 'Next (进入第 2 题) ➔'
                              : 'Submit (交卷查看成绩) ✓'
                            : '完成并评分'}
                        </span>
                      </button>
                    )}

                    {mode !== 'mock' && (
                      <button
                        onClick={() => setShowTranscript(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                        title="打开独立宽屏讨论原文与双语精听复盘页面"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>查看讨论原文与译文</span>
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 font-medium flex flex-wrap items-center gap-2">
                    <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      ⏱️ 建议作答: 1分钟左右为佳 (切勿低于50秒)
                    </span>
                    <span className="text-slate-500">流利多记者可多说 · 约 110~140 词</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 用户开启“显示答题模版”后的精炼微型控制坞 + 高分口语答题模版 (置于左侧黄金视区) */
              <div className="space-y-4 animate-fadeIn">
                {/* 1. 微型播放与录音控制坞 (Mini Dock) */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* 左侧：原音频微型播放器 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlayDiscussion}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-xs transition-all ${
                          isAudioPlaying
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title={isAudioPlaying ? '暂停原题音频' : '播放原题讨论音频'}
                      >
                        {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>

                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-blue-600" />
                          原题音频
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {formatTime(audioCurrentTime)} / {formatTime(audioDuration || 160)}
                        </span>
                      </div>
                    </div>

                    {/* 中间/右侧：录音按钮与计时指示 */}
                    <div className="flex items-center gap-2">
                      {examStage !== 'recording' ? (
                        <button
                          onClick={startRecording}
                          disabled={examStage === 'audio_playing' && mode === 'mock'}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>开始口语作答</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-mono text-xs font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                            <span>{formatTime(recordSeconds)} / 02:00</span>
                            {recordSeconds >= 50 && (
                              <span className="text-[10px] text-emerald-700 font-bold ml-1">✓达标</span>
                            )}
                          </div>
                          <button
                            onClick={stopRecordingAndScore}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer animate-pulse"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>完成并评分</span>
                          </button>
                        </div>
                      )}

                      {/* 查看讨论原文 */}
                      <button
                        onClick={() => setShowTranscript(true)}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        title="查看讨论原文与双语精听译文"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                      </button>

                      {/* 状态重置 */}
                      <button
                        onClick={resetAll}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                        title="重置作答状态"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 录音进度条 */}
                  {examStage === 'recording' && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>录音收音中...</span>
                        <span>
                          {recordSeconds < 50 ? (
                            <span className="text-amber-800 font-bold">目标 ≥50s (还差 {50 - recordSeconds}s)</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">✓ 达标！已进入 1 分钟黄金答题区间</span>
                          )}
                        </span>
                      </div>
                      <div className="relative w-full bg-rose-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            recordSeconds >= 50 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, (recordSeconds / 120) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 10秒准备倒计时 */}
                  {examStage === 'prep_countdown' && (
                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      prepSeconds === 0 ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-400' : 'bg-blue-50/80 border-blue-200 text-blue-900 animate-pulse'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full inline-block ${prepSeconds === 0 ? 'bg-amber-500 animate-ping' : 'bg-blue-600 animate-ping'}`} />
                        <span>{prepSeconds === 0 ? '🔔 BEEP 响铃！请立即开始作答...' : '10 秒准备倒计时中，听到 Beep 响铃后自动开录...'}</span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${prepSeconds === 0 ? 'text-amber-700' : 'text-blue-700'}`}>00:0{prepSeconds}</span>
                    </div>
                  )}
                </div>

                {/* 2. 高分口语答题模版 (占据左侧核心视区，实时联动右侧笔记) */}
                <SpeakingTemplatePanel
                  notes={currentNotes}
                  quickNotesRef={currentQuestion.quickNotes}
                  onOpenTips={() => setShowTipsModal(true)}
                  onClose={() => setShowTemplate(false)}
                  isExampleFilled={isExampleFilled}
                  onToggleExample={handleToggleExample}
                />
              </div>
            )}

            {/* 作答评分紧凑通知卡片：避免在左侧狭窄栏挤压排版，点击一键唤起全屏宽敞评分报告 */}
            {scoreReport && (
              <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-3 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${scoreReport.totalScore === 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'} flex items-center justify-center font-bold text-lg shadow-2xs`}>
                      {scoreReport.totalScore === 0 ? '⚠️' : '🎯'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {scoreReport.totalScore === 0 ? '未检测到有效作答：' : '作答已完成！评分：'}
                        <span className={`${scoreReport.totalScore === 0 ? 'text-rose-600' : 'text-emerald-600'} font-extrabold text-base`}>
                          {scoreReport.totalScore}
                        </span>
                        <span className="text-slate-400 text-xs font-normal">/ 90 分</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {scoreReport.totalScore === 0
                          ? '内容分 0 分 · 依据考规发音与流利度均判为 0 分'
                          : `内容: ${scoreReport.contentScore}/6 · 发音: ${scoreReport.pronunciationScore}/90 · 流利度: ${scoreReport.fluencyScore}/90`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsScoreModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>查看完整评分报告</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={resetAll}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors"
                      title="重新作答"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：考场速记白板 (Scratchpad) */}
          {showScratchpad && (
            <div className={`${showTemplate ? 'xl:col-span-6' : 'xl:col-span-7'} lg:col-span-6 space-y-4 animate-fadeIn`}>
              <div className="sticky top-20">
                <Scratchpad
                  questionNum={mode === 'mock' ? mockQuestions[mockCurrentIndex].num : currentQuestion.num}
                  questionTitle={mode === 'mock' ? mockQuestions[mockCurrentIndex].title : currentQuestion.title}
                  quickNotesRef={mode === 'mock' ? mockQuestions[mockCurrentIndex].quickNotes : currentQuestion.quickNotes}
                  showTemplate={showTemplate}
                  onToggleTemplate={() => setShowTemplate(!showTemplate)}
                  onOpenTips={() => setShowTipsModal(true)}
                  notes={currentNotes}
                  onNotesChange={handleNotesChange}
                  onClose={() => setShowScratchpad(false)}
                  isExampleFilled={isExampleFilled}
                  onToggleExample={handleToggleExample}
                  isMockMode={mode === 'mock'}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    )}

      {/* 底部版权 */}
      <footer className="mt-auto py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>PTE SGD Master · 白底机考界面 · 9月预测 34 题真题原声题库 · 纯前端离线可用</p>
      </footer>

      {/* 题目抽屉 */}
      <QuestionListDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        questions={SGD_QUESTIONS}
        currentQuestionId={currentQuestion.id}
        onSelectQuestion={(q) => {
          setCurrentQuestion(q);
          resetAll();
        }}
        completedIds={completedQuestionIds}
        recordingsMap={offlineRecordingsMap}
        stats={offlineStats}
        onClearAllRecordings={handleClearAllRecordings}
      />

      {/* 微信赞助弹窗 */}
      <SponsorModal
        isOpen={isSponsorOpen}
        onClose={() => setIsSponsorOpen(false)}
        isMilestone={isSponsorMilestone}
      />

      {/* 独立全屏宽敞评分报告页面/弹窗 */}
      {scoreReport && (
        <ScorePanel
          isOpen={isScoreModalOpen}
          onClose={handleCloseScoreModal}
          report={scoreReport}
          questionNum={currentQuestion.num}
          questionTitle={currentQuestion.title}
          recordedAudioUrl={userRecordedAudioUrl}
          onRetry={resetAll}
          onNextQuestion={handleNextQuestion}
        />
      )}

      {/* 全真模考双题综合评分报告与精细复盘弹窗 */}
      {mockQ1Result && mockQ2Result && (
        <MockScoreReportModal
          isOpen={isMockScoreOpen}
          onClose={() => setIsMockScoreOpen(false)}
          q1Result={mockQ1Result}
          q2Result={mockQ2Result}
          onRetakeMock={handleRetakeMock}
          onBackToPractice={handleBackToPractice}
        />
      )}

      {/* 独立全宽讨论原文与双语精听复盘页面/弹窗 */}
      <TranscriptPanel
        question={currentQuestion}
        isOpen={showTranscript}
        onClose={() => setShowTranscript(false)}
      />

      {/* 考场高分做题技巧与避坑指南弹窗 */}
      <ExamTipsModal
        isOpen={showTipsModal}
        onClose={() => setShowTipsModal(false)}
      />
    </div>
  );
}
export default App;
