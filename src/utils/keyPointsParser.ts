// PTE SGD Key Points 结构化解析器
import { SGDQuestion } from '../data/questionsData';

export interface KeyPointItem {
  en: string;
  zh?: string;
}

export interface KeyPointSection {
  title: string;
  items: KeyPointItem[];
}

export interface ParsedSpeakerPoints {
  speakerName: string;
  role: 's1' | 's2' | 's3' | 'other';
  gender?: string;
  sections: KeyPointSection[];
}

export interface ParsedKeyPoints {
  topicEn: string;
  topicZh: string;
  speakers: ParsedSpeakerPoints[];
}

export function parseKeyPoints(question: SGDQuestion): ParsedKeyPoints {
  const raw = question.keyPoints?.trim() || '';

  // 如果无有效解析，基于 quickNotes 生成结构化骨架
  if (!raw || raw === '暂无解析提取') {
    return {
      topicEn: question.topic || question.quickNotes?.topic || question.title,
      topicZh: '采分核心主题',
      speakers: [
        {
          speakerName: 'Speaker 1 (发言者1)',
          role: 's1',
          gender: '发言者',
          sections: [
            {
              title: '核心观点与论据 (Key Statements)',
              items: (question.quickNotes?.s1 || ['阐述核心问题与起始立场', '提出首要关注点']).map((pt) => ({
                en: pt,
                zh: '首位发言者的关键采分陈述'
              }))
            }
          ]
        },
        {
          speakerName: 'Speaker 2 (发言者2)',
          role: 's2',
          gender: '发言者',
          sections: [
            {
              title: '回应与关键建议 (Response & Advice)',
              items: (question.quickNotes?.s2 || ['提出应对方案与步骤', '补充实用建议']).map((pt) => ({
                en: pt,
                zh: '第二位发言者的补充与建议采分点'
              }))
            }
          ]
        },
        {
          speakerName: 'Speaker 3 (发言者3)',
          role: 's3',
          gender: '发言者',
          sections: [
            {
              title: '补充视角与总结 (Perspective & Summary)',
              items: (question.quickNotes?.s3 || ['提供补充资源或不同视角', '给出最终行动建议']).map((pt) => ({
                en: pt,
                zh: '第三位发言者的关键论点'
              }))
            }
          ]
        }
      ]
    };
  }

  // 截断尾部多余附带的范文或原文标识（如 "答案："、"The discussion involves..."、"原文:" 等）
  let cleaned = raw;
  const cutMarkers = [
    /\n\s*答案\s*[:：]/i,
    /\n\s*The discussion involves/i,
    /\n\s*原文\s*[:：]/i
  ];
  for (const marker of cutMarkers) {
    const idx = cleaned.search(marker);
    if (idx !== -1) {
      cleaned = cleaned.slice(0, idx).trim();
    }
  }

  // 移除开头的 *Key points: 或 *解析
  cleaned = cleaned.replace(/^\*?(Key points|解析)\s*[:：]?/i, '').trim();

  // 提取 Topic 与 主题
  let topicEn = question.topic || '';
  let topicZh = '';

  const topicMatch = cleaned.match(/Topic\s*[:：]\s*(.+)/i);
  if (topicMatch) {
    topicEn = topicMatch[1].trim();
  }

  const zhMatch = cleaned.match(/主题\s*[:：]\s*(.+)/i);
  if (zhMatch) {
    topicZh = zhMatch[1].trim();
  }

  // 按 Speaker 拆分
  // 匹配形如 "Speaker One (Male)", "Speaker 1 (female)", "Speaker Two (Female)", "Speaker 3..."
  const speakerRegex = /(Speaker\s+(?:One|Two|Three|1|2|3)\s*(?:[（(][^）)]+[）)])?)/gi;
  const parts = cleaned.split(speakerRegex);

  const speakers: ParsedSpeakerPoints[] = [];

  // parts[0] 是 Speaker 之前的内容（Topic等）
  // 后续按照 [Speaker Header, Content, Speaker Header, Content...]
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.trim();
    const content = parts[i + 1]?.trim() || '';

    if (!header) continue;

    let role: 's1' | 's2' | 's3' | 'other' = 'other';
    if (/Speaker\s*(One|1)/i.test(header)) role = 's1';
    else if (/Speaker\s*(Two|2)/i.test(header)) role = 's2';
    else if (/Speaker\s*(Three|3)/i.test(header)) role = 's3';

    let gender = '';
    const genderMatch = header.match(/[（(]([^）)]+)[）)]/);
    if (genderMatch) {
      gender = genderMatch[1].trim();
    }

    // 解析 content 中的小节 (-Struggle, -Reasons, -Plan 等)
    const sections = parseSections(content);

    speakers.push({
      speakerName: header,
      role,
      gender,
      sections
    });
  }

  // 如果未能按正则匹配到 Speaker，提供兜底处理
  if (speakers.length === 0) {
    speakers.push({
      speakerName: '讨论核心考点要点',
      role: 's1',
      sections: [
        {
          title: '采分要点',
          items: cleaned.split('\n').filter(Boolean).map(line => ({ en: line }))
        }
      ]
    });
  }

  return {
    topicEn: topicEn || question.topic || question.title,
    topicZh: topicZh || '核心讨论议题',
    speakers
  };
}

// 解析某位 Speaker 的具体小节与点位
function parseSections(speakerContent: string): KeyPointSection[] {
  const lines = speakerContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== '-' && l !== '*');

  const sections: KeyPointSection[] = [];
  let currentSection: KeyPointSection = {
    title: '关键表达与采分点',
    items: []
  };

  let pendingEn = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 判断是否为小节标题，例如 "-Struggle（困境）" 或 "-Plan（计划）" 或 "-Suggestions:"
    if (/^[-—]\s*[^0-9]/.test(line) && !line.includes('.')) {
      // 保存前一个小节
      if (pendingEn) {
        currentSection.items.push({ en: pendingEn });
        pendingEn = '';
      }
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      const rawTitle = line.replace(/^[-—]\s*/, '').replace(/[:：]$/, '').trim();
      currentSection = {
        title: rawTitle || '关键表达',
        items: []
      };
      continue;
    }

    // 判断是否是编号英文，例如 "1. He is struggling with the college essay."
    const isNumbered = /^[0-9]+[.\s、]/.test(line);
    // 判断是否主要包含中文字符
    const isChinese = /[\u4e00-\u9fa5]/.test(line);

    if (isNumbered) {
      // 如果之前有尚未配对中文的 pendingEn，先压入
      if (pendingEn) {
        currentSection.items.push({ en: pendingEn });
        pendingEn = '';
      }
      const enText = line.replace(/^[0-9]+[.\s、]\s*/, '').trim();
      pendingEn = enText;
    } else if (isChinese) {
      // 这是中文翻译行
      if (pendingEn) {
        currentSection.items.push({
          en: pendingEn,
          zh: line
        });
        pendingEn = '';
      } else {
        // 单独出现的中文行（例如小结或解释）
        currentSection.items.push({
          en: '',
          zh: line
        });
      }
    } else {
      // 纯英文字句但没编号，例如 "-Not going in blind during course with the list."
      if (pendingEn) {
        currentSection.items.push({ en: pendingEn });
        pendingEn = '';
      }
      const cleanEn = line.replace(/^[-—*]\s*/, '').trim();
      pendingEn = cleanEn;
    }
  }

  if (pendingEn) {
    currentSection.items.push({ en: pendingEn });
  }

  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0
    ? sections
    : [
        {
          title: '要点速记',
          items: [{ en: speakerContent }]
        }
      ];
}
