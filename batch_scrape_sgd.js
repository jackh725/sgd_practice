const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const QUESTIONS = [
  { num: 2, title: "Writing an Essay" },
  { num: 36, title: "Difficult Course" },
  { num: 37, title: "New Lecturer" },
  { num: 38, title: "AI Proofreading" },
  { num: 39, title: "Presentation Skills" },
  { num: 41, title: "Phone in Class" },
  { num: 42, title: "Different Ways to University" },
  { num: 43, title: "Field Trip" },
  { num: 46, title: "Campus Accommodation" },
  { num: 47, title: "Essay Writing" },
  { num: 48, title: "Future Job" },
  { num: 50, title: "Anniversary Party" },
  { num: 52, title: "Choice of Subjects" },
  { num: 54, title: "Online Course" },
  { num: 55, title: "Sports" },
  { num: 56, title: "Meeting" },
  { num: 58, title: "Group Project" },
  { num: 68, title: "Social Media" },
  { num: 82, title: "Management of Assignment" },
  { num: 95, title: "Free Online Courses" },
  { num: 98, title: "Time Management" },
  { num: 99, title: "Joining or Starting a Club" },
  { num: 102, title: "Group Discussion" },
  { num: 105, title: "University Bookshop" },
  { num: 107, title: "New Timetable" },
  { num: 113, title: "Conference Presentation" },
  { num: 115, title: "New University Experience" },
  { num: 117, title: "Complaint in Library" },
  { num: 120, title: "A Trip to Iceland" },
  { num: 121, title: "Types of Class" },
  { num: 122, title: "Eco-friendly University" },
  { num: 124, title: "New University Academic Calendar" },
  { num: 127, title: "Graffiti Art" },
  { num: 128, title: "Robot" }
];

const BASE_DIR = "/Users/jackhao/Documents/AI influencer/project8";
const AUDIOS_DIR = path.join(BASE_DIR, "audios");
const TRANSCRIPTS_DIR = path.join(BASE_DIR, "transcripts");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function runAppleScript(script) {
  const res = spawnSync("osascript", ["-e", script], { maxBuffer: 100 * 1024 * 1024 });
  return res.stdout.toString().trim();
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_").replace(/_+/g, "_");
}

function execInChrome(jsCode) {
  const script = `
tell application "Google Chrome"
  repeat with w in every window
    repeat with t in every tab of w
      if URL of t contains "summarize_group_discussions" then
        tell t
          return execute javascript ${JSON.stringify(jsCode)}
        end tell
      end if
    end repeat
  end repeat
  return "tab_not_found"
end tell
  `;
  return runAppleScript(script);
}

function navigateChrome(url) {
  const script = `
tell application "Google Chrome"
  repeat with w in every window
    repeat with t in every tab of w
      if URL of t contains "summarize_group_discussions" then
        tell t
          set URL to "${url}"
          return "navigated"
        end tell
      end if
    end repeat
  end repeat
  return "tab_not_found"
end tell
  `;
  return runAppleScript(script);
}

async function scrapeQuestion(q, index, total) {
  const padNum = String(q.num).padStart(3, "0");
  const cleanTitle = sanitizeFilename(q.title);
  const audioFilename = `SGD_${padNum}_${cleanTitle}.mp3`;
  const mdFilename = `SGD_${padNum}_${cleanTitle}.md`;
  const audioPath = path.join(AUDIOS_DIR, audioFilename);
  const mdPath = path.join(TRANSCRIPTS_DIR, mdFilename);

  console.log(`\n[${index + 1}/${total}] >>> 处理题目 #${q.num}: ${q.title} ...`);

  // Navigate to question
  const targetUrl = `https://www.ptexj.com/practice/summarize_group_discussions/${q.num}`;
  navigateChrome(targetUrl);

  // Wait for page to load
  await sleep(2500);

  // Poll until audio or answer button is ready (max 10s)
  let ready = false;
  for (let i = 0; i < 5; i++) {
    const status = execInChrome(`
      (function() {
        var aud = Array.from(document.querySelectorAll("audio")).find(function(a) {
          return (a.src || "").startsWith("blob:");
        });
        var btns = Array.from(document.querySelectorAll("*")).filter(function(e) {
          return e.children.length === 0 && (e.innerText || "").trim() === "答案";
        });
        return JSON.stringify({ hasAud: !!aud, hasDa: btns.length > 0 });
      })()
    `);
    try {
      const parsed = JSON.parse(status);
      if (parsed.hasAud || parsed.hasDa) {
        ready = true;
        break;
      }
    } catch(e) {}
    await sleep(1000);
  }

  // Click "答案" button to reveal answer & transcript
  execInChrome(`
    (function() {
      var btns = Array.from(document.querySelectorAll("*")).filter(function(e) {
        return e.children.length === 0 && (e.innerText || "").trim() === "答案";
      });
      if (btns.length > 0) btns[0].click();
      return "clicked";
    })()
  `);
  await sleep(600);

  // Extract answer and transcript text
  const textJson = execInChrome(`
    (function() {
      var t = document.body.innerText;
      var start = t.indexOf("答案参考");
      var textSection = "";
      if (start !== -1) {
        var end = t.indexOf("练习讨论");
        textSection = t.slice(start, end !== -1 ? end : start + 5000);
      }
      var fullTitle = t.split("\\n").find(function(l) { return l.startsWith("#${q.num}"); });
      return JSON.stringify({
        title: fullTitle || "#${q.num} ${q.title}",
        textSection: textSection
      });
    })()
  `);

  let textData = { title: `#${q.num} ${q.title}`, textSection: "" };
  try {
    textData = JSON.parse(textJson);
  } catch(e) {}

  // Trigger audio blob extraction
  execInChrome(`
    (function() {
      window.__audio_b64 = null;
      var aud = Array.from(document.querySelectorAll("audio")).find(function(a) {
        return (a.src || "").startsWith("blob:");
      });
      if (!aud) {
        window.__audio_b64 = "no_audio";
        return;
      }
      fetch(aud.src)
        .then(function(res) { return res.blob(); })
        .then(function(blob) {
          var reader = new FileReader();
          reader.onloadend = function() {
            window.__audio_b64 = reader.result;
          };
          reader.readAsDataURL(blob);
        })
        .catch(function(err) {
          window.__audio_b64 = "error: " + err.message;
        });
    })()
  `);

  // Wait for audio base64
  let audioB64 = null;
  for (let i = 0; i < 5; i++) {
    await sleep(800);
    const checkB64 = execInChrome(`
      (function() {
        return window.__audio_b64 || "";
      })()
    `);
    if (checkB64 && checkB64.startsWith("data:")) {
      audioB64 = checkB64;
      break;
    }
  }

  // Save Audio MP3
  let audioSaved = false;
  let audioSize = 0;
  if (audioB64 && audioB64.startsWith("data:")) {
    const commaIdx = audioB64.indexOf(",");
    const buf = Buffer.from(audioB64.slice(commaIdx + 1), "base64");
    fs.writeFileSync(audioPath, buf);
    audioSaved = true;
    audioSize = buf.length;
    console.log(`   [音频] 已保存: ${audioFilename} (${(audioSize / 1024).toFixed(1)} KB)`);
  } else {
    console.warn(`   [警告] 未能获取到 #${q.num} 的音频 Blob`);
  }

  // Parse Text sections (解析, 答案, 原文)
  const fullSec = textData.textSection || "";
  let jx = "";
  let da = "";
  let yw = "";

  const jxIdx = fullSec.indexOf("解析:");
  const daIdx = fullSec.indexOf("参考答案：") !== -1 ? fullSec.indexOf("参考答案：") : fullSec.indexOf("*答案：");
  const ywIdx = fullSec.indexOf("原⽂:") !== -1 ? fullSec.indexOf("原⽂:") : fullSec.indexOf("原文:");

  if (jxIdx !== -1) {
    const end = daIdx !== -1 ? daIdx : (ywIdx !== -1 ? ywIdx : fullSec.length);
    jx = fullSec.slice(jxIdx + 3, end).trim();
  }
  if (daIdx !== -1) {
    const start = fullSec.indexOf("：", daIdx) !== -1 ? fullSec.indexOf("：", daIdx) + 1 : daIdx + 4;
    const end = ywIdx !== -1 ? ywIdx : fullSec.length;
    da = fullSec.slice(start, end).trim();
  }
  if (ywIdx !== -1) {
    const start = fullSec.indexOf(":", ywIdx) !== -1 ? fullSec.indexOf(":", ywIdx) + 1 : ywIdx + 3;
    const end = fullSec.indexOf("资料领取") !== -1 ? fullSec.indexOf("资料领取") : fullSec.length;
    yw = fullSec.slice(start, end).trim();
  }

  // Save Markdown Document
  const mdContent = `# PTE SGD #${q.num}: ${q.title}

## 基本信息
- **题号**：#${q.num}
- **标题**：${q.title}
- **题型**：Summarize Group Discussion (SGD)
- **来源**：PTE 猩际（9月预测题）
- **官方链接**：https://www.ptexj.com/practice/summarize_group_discussions/${q.num}
- **音频文件**：[../audios/${audioFilename}](../audios/${audioFilename}) (${(audioSize / 1024).toFixed(1)} KB)

---

## 音频原文 (Transcript)

\`\`\`text
${yw || "暂无原文提取"}
\`\`\`

---

## 核心采分点与解析 (Key Points)

${jx || "暂无解析提取"}

---

## 参考答案 (Model Answer)

> ${da.split("\n\n").join("\n>\n> ") || "暂无参考答案提取"}

---
*抓取时间: ${new Date().toISOString().slice(0, 10)}*
`;

  fs.writeFileSync(mdPath, mdContent);
  console.log(`   [文档] 已保存: ${mdFilename}`);

  return {
    num: q.num,
    title: q.title,
    audioSaved,
    audioPath,
    mdPath,
    hasTranscript: yw.length > 0,
    hasAnswer: da.length > 0
  };
}

async function main() {
  console.log(`==============================================`);
  console.log(`开始批量爬取 PTE SGD 9月预测全套 34 题`);
  console.log(`目标输出目录: ${BASE_DIR}`);
  console.log(`==============================================`);

  const results = [];
  for (let i = 0; i < QUESTIONS.length; i++) {
    const res = await scrapeQuestion(QUESTIONS[i], i, QUESTIONS.length);
    results.push(res);
  }

  // Write index.json
  const indexPath = path.join(BASE_DIR, "sgd_questions_index.json");
  fs.writeFileSync(indexPath, JSON.stringify({
    total: QUESTIONS.length,
    scrapedAt: new Date().toISOString(),
    questions: results
  }, null, 2));

  console.log(`\n==============================================`);
  console.log(`爬取完成！已生成索引文件: ${indexPath}`);
  console.log(`成功音频数: ${results.filter(r => r.audioSaved).length}/${QUESTIONS.length}`);
  console.log(`==============================================`);
}

main().catch(console.error);
