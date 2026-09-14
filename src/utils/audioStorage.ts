// PTE SGD 本地 IndexedDB 音频与历史答题离线存储引擎
// 纯本地浏览器数据库存储：0 服务器成本、0 隐私泄露风险、支持长期持久化回听

import { SGDScoreReport } from './scoringEngine';

export interface StoredRecording {
  questionId: number;           // 题目唯一 ID (如 1, 2...)
  questionNum: number;          // 题号 (1~34)
  audioBlob: Blob;              // WebM/Opus 录音二进制数据
  durationSeconds: number;      // 录音作答时长 (秒)
  timestamp: number;            // 录制时间戳
  scoreReport: SGDScoreReport;  // 完整评分报告
  recognizedText: string;       // 语音转写文本
}

const DB_NAME = 'pte_sgd_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_recordings';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'questionId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 保存一条作答录音和评分数据到本地 IndexedDB
 */
export async function saveOfflineRecording(recording: StoredRecording): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(recording);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save offline recording:', err);
  }
}

/**
 * 读取某道题的历史本地录音与评分报告
 */
export async function getOfflineRecording(questionId: number): Promise<StoredRecording | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(questionId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Failed to get offline recording for question ${questionId}:`, err);
    return null;
  }
}

/**
 * 获取所有已保存的本地历史录音列表（用于题库清单中展示标记）
 */
export async function getAllOfflineRecordings(): Promise<StoredRecording[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get all offline recordings:', err);
    return [];
  }
}

/**
 * 删除某道题的历史录音
 */
export async function deleteOfflineRecording(questionId: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(questionId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to delete offline recording for question ${questionId}:`, err);
  }
}

/**
 * 清空所有本地录音
 */
export async function clearAllOfflineRecordings(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear all offline recordings:', err);
  }
}

/**
 * 获取当前已用本地存储统计（题目数与总字节估算）
 */
export async function getOfflineStorageStats(): Promise<{ count: number; totalMB: string }> {
  try {
    const list = await getAllOfflineRecordings();
    let totalBytes = 0;
    for (const item of list) {
      if (item.audioBlob) {
        totalBytes += item.audioBlob.size;
      }
    }
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    return { count: list.length, totalMB: mb };
  } catch {
    return { count: 0, totalMB: '0.00' };
  }
}
