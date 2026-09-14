// PTE SGD 实战评分算法与语音录制引擎

export interface WordScoringResult {
  word: string;
  level: 'good' | 'average' | 'poor'; // 绿（优）、黄（良）、红（差）
  confidence: number;
}

export interface SGDScoreReport {
  totalScore: number;       // 0-90 综合预测分
  contentScore: number;     // 0-6 内容分
  pronunciationScore: number; // 0-90 发音分
  fluencyScore: number;     // 0-90 流利度分
  wordCount: number;        // 总说出单词数
  durationSeconds: number;  // 实际作答时长
  wpm: number;              // Words per minute 语速
  hitKeyPoints: {
    topic: boolean;
    s1: boolean;
    s2: boolean;
    s3: boolean;
    conclusion: boolean;
  };
  speakerDetails: {
    s1Count: number; // 0, 1, 2 (命中论点数)
    s2Count: number; // 0, 1, 2
    s3Count: number; // 0, 1, 2
    topicHit: boolean;
    conclusionHit: boolean;
    pauseCount: number; // 明显停顿/卡顿次数
    diagnostics: string[]; // 具体的诊断扣分明细
  };
  coloredWords: WordScoringResult[];
  rawTranscript: string;
}

// 全局共享单例 AudioContext，预热解锁防止倒计时期间被浏览器自动休眠/静音
let sharedAudioCtx: AudioContext | null = null;

function getUnlockedAudioContext(): AudioContext | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// 首次交互预热
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getUnlockedAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

// 考场标准 950Hz Beep 提示音（响亮清晰、考场穿透力强，与 project4 考场鸣音一致）
export function playExamBeep(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // 安全超时，确保无论任何异常 450ms 内必放行进入录音
    const safetyTimer = setTimeout(finish, 450);

    try {
      const audioCtx = getUnlockedAudioContext();
      if (!audioCtx) {
        clearTimeout(safetyTimer);
        finish();
        return;
      }

      const emitBeep = () => {
        try {
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          // 950Hz 标准 PTE 考场提示音频
          osc.type = 'sine';
          osc.frequency.setValueAtTime(950, now);

          // 饱满清晰的 ADSR 包络：
          // 15ms 快速平滑爬升防爆音，维持 220ms 饱满响亮鸣音，最后 65ms 平滑自然收尾
          // 彻底解决之前直接指数衰减过快导致“微弱不明显”的问题
          const peakGain = 0.35;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
          gain.gain.setValueAtTime(peakGain, now + 0.22);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now);
          osc.stop(now + 0.30);
          osc.onended = () => {
            clearTimeout(safetyTimer);
            finish();
          };
        } catch {
          clearTimeout(safetyTimer);
          finish();
        }
      };

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(emitBeep).catch(() => {
          clearTimeout(safetyTimer);
          finish();
        });
      } else {
        emitBeep();
      }
    } catch {
      clearTimeout(safetyTimer);
      finish();
    }
  });
}

// 录音器封装
export class SGDRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : ''
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  stop(): Promise<{ blob: Blob; url: string }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve({ blob: new Blob(), url: '' });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        this.stream?.getTracks().forEach((track) => track.stop());
        resolve({ blob: audioBlob, url: audioUrl });
      };

      this.mediaRecorder.stop();
    });
  }
}

// 常见停用词集合（过滤语法虚词，提取核心观点实体）
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'been', 'be', 'to', 'of', 'and', 'or',
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'it', 'its', 'him', 'his', 'her', 'she',
  'he', 'they', 'them', 'their', 'we', 'our', 'us', 'i', 'me', 'my', 'you', 'your',
  'that', 'this', 'these', 'those', 'have', 'has', 'had', 'do', 'does', 'did', 'say',
  'said', 'says', 'mention', 'mentioned', 'also', 'speaker', 'one', 'two', 'three',
  'first', 'second', 'third', 'talk', 'talking', 'discuss', 'discussion', 'point',
  'opinion', 'view', 'agreed', 'claimed', 'concluded', 'emphasized', 'believed', 'from'
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

function matchViewpoint(cleanTranscript: string, noteText: string): boolean {
  if (!noteText) return false;
  const kws = extractKeywords(noteText);
  if (kws.length === 0) return true;
  let matches = 0;
  for (const kw of kws) {
    const stem = kw.length > 5 ? kw.slice(0, 5) : kw;
    if (cleanTranscript.includes(kw) || cleanTranscript.includes(stem)) {
      matches++;
    }
  }
  return matches >= Math.min(2, Math.ceil(kws.length * 0.35)) || (kws.length === 1 && matches >= 1);
}

// 浏览器语音识别封装 (Web Speech API)，支持静音与卡顿停顿检测
export function createSGDRecognizer(
  onResult: (transcript: string, wordsWithConfidence: { word: string; confidence: number }[], pauseCount: number) => void,
  onError: (error: string) => void
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRec) {
    return {
      start: () => onError('当前浏览器不支持语音识别，推荐使用 Chrome 浏览器'),
      stop: () => {},
      getPauseCount: () => 0
    };
  }

  const recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';
  const collectedWords: { word: string; confidence: number }[] = [];
  let lastSpeechTimestamp = Date.now();
  let pauseCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let interim = '';
    const now = Date.now();

    // 检查两次发音之间是否存在超过 2.5 秒的明显卡顿/长停顿 (Hesitation)
    if (finalTranscript.trim().length > 0 && (now - lastSpeechTimestamp >= 2500)) {
      pauseCount++;
    }
    lastSpeechTimestamp = now;

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const res = event.results[i];
      const text = res[0].transcript;
      const conf = res[0].confidence || 0.85;

      if (res.isFinal) {
        finalTranscript += ' ' + text;
        const words = text.trim().split(/\s+/);
        words.forEach((w: string) => {
          if (w) collectedWords.push({ word: w, confidence: conf });
        });
      } else {
        interim += text;
      }
    }

    const full = (finalTranscript + ' ' + interim).trim();
    onResult(full, collectedWords, pauseCount);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    if (event.error !== 'no-speech') {
      onError(event.error);
    }
  };

  return {
    start: () => {
      finalTranscript = '';
      collectedWords.length = 0;
      lastSpeechTimestamp = Date.now();
      pauseCount = 0;
      try {
        recognition.start();
      } catch {}
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {}
    },
    getPauseCount: () => pauseCount
  };
}

// PTE 实战标准评分打分引擎 (对标机改打分模型)
export function calculateSGDScore(
  transcript: string,
  wordsWithConf: { word: string; confidence: number }[],
  durationSeconds: number,
  topicPhrase?: string,
  s1Notes?: string[],
  s2Notes?: string[],
  s3Notes?: string[],
  pauseCount: number = 0
): SGDScoreReport {
  const cleanText = (transcript || '').toLowerCase();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const diagnostics: string[] = [];

  // 1. 无有效录音/未检测到语音的情况 (严格遵循规则：内容分0，则发音与流利度均为0)
  if (wordCount === 0 || words.length < 4) {
    return {
      totalScore: 0,
      contentScore: 0,
      pronunciationScore: 0,
      fluencyScore: 0,
      wordCount: 0,
      durationSeconds: Math.max(0, durationSeconds || 0),
      wpm: 0,
      hitKeyPoints: {
        topic: false,
        s1: false,
        s2: false,
        s3: false,
        conclusion: false
      },
      speakerDetails: {
        s1Count: 0,
        s2Count: 0,
        s3Count: 0,
        topicHit: false,
        conclusionHit: false,
        pauseCount: 0,
        diagnostics: ['未检测到有效语音作答，判定为 0 分']
      },
      coloredWords: [],
      rawTranscript: transcript || ''
    };
  }

  // 2. WPM 计算 (建议最佳 120-155 WPM)
  const safeDuration = Math.max(10, durationSeconds || 10);
  const wpm = Math.round((wordCount / safeDuration) * 60);

  // 安全处理可能为空的参考考点
  const safeTopic = (topicPhrase || '').toLowerCase();
  const safeS1 = Array.isArray(s1Notes) ? s1Notes : [];
  const safeS2 = Array.isArray(s2Notes) ? s2Notes : [];
  const safeS3 = Array.isArray(s3Notes) ? s3Notes : [];

  // 3. 内容评分 (Content: 0-6 分)
  // 【核心革新】：必须与真实观点词群比对，剥离模板欺骗，严格落实每位讲者 2 个独立论点

  // (1) 主题判定：必须命中主题实体词（不仅是 "discussion involves" 模板词）
  const topicKws = extractKeywords(safeTopic);
  const hasTopicEntity = topicKws.length > 0 && topicKws.some(kw => {
    const stem = kw.length > 5 ? kw.slice(0, 5) : kw;
    return cleanText.includes(kw) || cleanText.includes(stem);
  });
  const hasIntroTemplate = cleanText.includes('discussion involves') || cleanText.includes('talking about') || cleanText.includes('discuss');

  let topicScore = 0;
  let hitTopic = false;
  if (hasTopicEntity) {
    topicScore = 1.0;
    hitTopic = true;
  } else if (hasIntroTemplate) {
    topicScore = 0.3; // 仅背了套话但没说出讨论主题具体名字，扣减 70% 主题分
    hitTopic = false;
    diagnostics.push('开篇仅包含模板套话，未命中题目核心主题名称（主题分仅得 0.3/1.0）');
  } else {
    diagnostics.push('开篇缺少有效讨论主题阐述');
  }

  // (2) Speaker 1 两个观点独立命中检测
  const hitS1_1 = safeS1[0] ? matchViewpoint(cleanText, safeS1[0]) : false;
  const hitS1_2 = safeS1[1] ? matchViewpoint(cleanText, safeS1[1]) : false;
  const s1Count = (hitS1_1 ? 1 : 0) + (hitS1_2 ? 1 : 0);
  let s1Score = 0;
  if (s1Count === 2) {
    s1Score = 1.4;
  } else if (s1Count === 1) {
    s1Score = 0.7; // 仅讲了 1 句话，直接扣减 50% 分数
    diagnostics.push('Speaker 1 仅命中 1 个论点（未讲满 2 句话，扣 50%）');
  } else {
    diagnostics.push('Speaker 1 未命中有效论点（仅念模板套话不给分）');
  }

  // (3) Speaker 2 两个观点独立命中检测
  const hitS2_1 = safeS2[0] ? matchViewpoint(cleanText, safeS2[0]) : false;
  const hitS2_2 = safeS2[1] ? matchViewpoint(cleanText, safeS2[1]) : false;
  const s2Count = (hitS2_1 ? 1 : 0) + (hitS2_2 ? 1 : 0);
  let s2Score = 0;
  if (s2Count === 2) {
    s2Score = 1.4;
  } else if (s2Count === 1) {
    s2Score = 0.7;
    diagnostics.push('Speaker 2 仅命中 1 个论点（未讲满 2 句话，扣 50%）');
  } else {
    diagnostics.push('Speaker 2 未命中有效论点');
  }

  // (4) Speaker 3 两个观点独立命中检测
  const hitS3_1 = safeS3[0] ? matchViewpoint(cleanText, safeS3[0]) : false;
  const hitS3_2 = safeS3[1] ? matchViewpoint(cleanText, safeS3[1]) : false;
  const s3Count = (hitS3_1 ? 1 : 0) + (hitS3_2 ? 1 : 0);
  let s3Score = 0;
  if (s3Count === 2) {
    s3Score = 1.4;
  } else if (s3Count === 1) {
    s3Score = 0.7;
    diagnostics.push('Speaker 3 仅命中 1 个论点（未讲满 2 句话，扣 50%）');
  } else {
    diagnostics.push('Speaker 3 未命中有效论点');
  }

  // (5) 结尾总结
  const hitConclusion = cleanText.includes('in conclusion') || cleanText.includes('in summary') || cleanText.includes('to conclude') || cleanText.includes('overall') || cleanText.includes('all in all');
  const conclusionScore = hitConclusion ? 0.8 : 0.0;
  if (!hitConclusion) {
    diagnostics.push('缺少明确结尾总结信号词（如 in conclusion / overall）');
  }

  // 汇总各维度论点得分 (满分为 1.0 + 1.4*3 + 0.8 = 6.0)
  let rawContent = topicScore + s1Score + s2Score + s3Score + conclusionScore;

  // 词数与饱满度硬约束
  if (wordCount < 15) {
    rawContent = 0;
  } else if (wordCount < 40) {
    rawContent = Math.min(2, rawContent);
    diagnostics.push('总输出词数过少 (<40词)，内容分封顶 2 分');
  } else if (wordCount < 70) {
    rawContent = Math.max(0, rawContent - 0.7);
    diagnostics.push('总输出词数偏低 (<70词)，内容分执行长度惩罚');
  }

  const contentScore = Math.min(6, Math.max(0, Math.round(rawContent)));

  // 【核心规则】：如果内容分为 0，发音与流利度直接归零，总分归零
  if (contentScore === 0) {
    return {
      totalScore: 0,
      contentScore: 0,
      pronunciationScore: 0,
      fluencyScore: 0,
      wordCount,
      durationSeconds,
      wpm,
      hitKeyPoints: {
        topic: hitTopic,
        s1: s1Count > 0,
        s2: s2Count > 0,
        s3: s3Count > 0,
        conclusion: hitConclusion
      },
      speakerDetails: {
        s1Count,
        s2Count,
        s3Count,
        topicHit: hitTopic,
        conclusionHit: hitConclusion,
        pauseCount,
        diagnostics: diagnostics.length > 0 ? diagnostics : ['内容未达及格标准，总分归零']
      },
      coloredWords: words.map(w => ({ word: w, level: 'poor', confidence: 0.3 })),
      rawTranscript: transcript
    };
  }

  // 4. 流利度评分 (Fluency: 0-90) —— 彻底去虚高，引入卡顿与停顿严惩
  // 按照标准：120-155 WPM 为黄金区间，但必须无停顿才能拿 85+
  let fluencyBase = 75;
  if (wpm >= 125 && wpm <= 155) {
    fluencyBase = 88;
  } else if (wpm >= 110 && wpm < 125) {
    fluencyBase = 80;
  } else if (wpm > 155 && wpm <= 175) {
    fluencyBase = 82;
  } else if (wpm >= 95 && wpm < 110) {
    fluencyBase = 70;
  } else if (wpm >= 80 && wpm < 95) {
    fluencyBase = 60;
  } else if (wpm < 80) {
    fluencyBase = Math.max(20, Math.round(wpm * 0.7));
  } else {
    // 语速过快 (>175 WPM) 惩罚
    fluencyBase = Math.max(45, Math.round(180 - wpm * 0.5));
  }

  // 停顿与卡壳 (Hesitation) 阶梯惩罚与上限封顶
  let pauseDeduction = 0;
  if (pauseCount === 1) {
    pauseDeduction = 10;
    fluencyBase = Math.min(fluencyBase, 78);
    diagnostics.push('检测到 1 次明显卡壳停顿（>2.5s），流利度封顶 78 分');
  } else if (pauseCount === 2) {
    pauseDeduction = 18;
    fluencyBase = Math.min(fluencyBase, 68);
    diagnostics.push('检测到 2 次明显卡顿停顿，流利度上限封顶 68 分');
  } else if (pauseCount >= 3) {
    pauseDeduction = 28;
    fluencyBase = Math.min(fluencyBase, 55);
    diagnostics.push(`检测到 ${pauseCount} 次严重停顿卡壳，流利度跌入 55 分及格档以下`);
  }

  // 语流密度检测（录音时间很长但词数偏少，反映中途停顿占比高）
  if (durationSeconds >= 45 && wordCount < durationSeconds * 1.5) {
    pauseDeduction += 8;
    fluencyBase = Math.min(fluencyBase, 72);
    diagnostics.push('整体语速词密度偏低，停顿时间占比过高，已扣除流利度分');
  }

  const fluencyScore = Math.max(10, Math.min(90, fluencyBase - pauseDeduction));

  // 5. 发音评分 (Pronunciation: 0-90)
  // 基于语音识别置信度加权
  let pronScore = 72;
  if (wordsWithConf.length > 0) {
    const avgConf = wordsWithConf.reduce((acc, w) => acc + (w.confidence || 0.8), 0) / wordsWithConf.length;
    pronScore = Math.round(avgConf * 84) + 6;
  }
  pronScore = Math.min(90, Math.max(35, pronScore));

  // 6. 综合总分 Total (0-90)
  // 标准公式：内容 40% + 发音 30% + 流利度 30%
  const contentNormalized = (contentScore / 6) * 90;
  const totalScore = Math.min(90, Math.max(0, Math.round(contentNormalized * 0.4 + pronScore * 0.3 + fluencyScore * 0.3)));

  // 7. 生成彩色词阶标注 (绿/黄/红)
  const coloredWords: WordScoringResult[] = words.map((w, i) => {
    const confItem = wordsWithConf[i];
    const conf = confItem ? confItem.confidence : (0.75 + ((w.length * 7) % 25) / 100);

    let level: 'good' | 'average' | 'poor' = 'good';
    if (conf >= 0.82) {
      level = 'good';
    } else if (conf >= 0.65) {
      level = 'average';
    } else {
      level = 'poor';
    }

    return {
      word: w,
      level,
      confidence: conf
    };
  });

  return {
    totalScore,
    contentScore,
    pronunciationScore: pronScore,
    fluencyScore,
    wordCount,
    durationSeconds,
    wpm,
    hitKeyPoints: {
      topic: hitTopic,
      s1: s1Count >= 2,
      s2: s2Count >= 2,
      s3: s3Count >= 2,
      conclusion: hitConclusion
    },
    speakerDetails: {
      s1Count,
      s2Count,
      s3Count,
      topicHit: hitTopic,
      conclusionHit: hitConclusion,
      pauseCount,
      diagnostics
    },
    coloredWords,
    rawTranscript: transcript
  };
}
