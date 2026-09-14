import { useState } from 'react';
import { SGDQuestion } from '../data/questionsData';
import { Search, CheckCircle2, ChevronRight, X, Volume2, HardDrive } from 'lucide-react';

interface QuestionListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: SGDQuestion[];
  currentQuestionId: number;
  onSelectQuestion: (question: SGDQuestion) => void;
  completedIds: number[];
  recordingsMap?: Record<number, { score: number; duration: number }>;
  stats?: { count: number; totalMB: string };
  onClearAllRecordings?: () => void;
}

export const QuestionListDrawer: React.FC<QuestionListDrawerProps> = ({
  isOpen,
  onClose,
  questions,
  currentQuestionId,
  onSelectQuestion,
  completedIds,
  recordingsMap = {},
  stats = { count: 0, totalMB: '0.00' },
  onClearAllRecordings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'uncompleted'>('all');

  if (!isOpen) return null;

  const filtered = questions.filter((q) => {
    const matchesSearch =
      q.num.toString().includes(searchTerm) ||
      String(q.num).padStart(2, '0').includes(searchTerm) ||
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase());

    const isDone = completedIds.includes(q.id);
    if (filterType === 'completed') return matchesSearch && isDone;
    if (filterType === 'uncompleted') return matchesSearch && !isDone;
    return matchesSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl p-5 overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              预测题库 (34 题)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              已完成 {completedIds.length} / {questions.length} 题
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative my-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索题号、标题、主题关键词..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
          />
        </div>

        {/* 筛选选项卡 */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${filterType === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            全部 ({questions.length})
          </button>
          <button
            onClick={() => setFilterType('uncompleted')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${filterType === 'uncompleted'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            未练 ({questions.length - completedIds.length})
          </button>
          <button
            onClick={() => setFilterType('completed')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${filterType === 'completed'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            已练 ({completedIds.length})
          </button>
        </div>

        {/* 题目列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              无匹配题目
            </div>
          ) : (
            filtered.map((q) => {
              const isCurrent = q.id === currentQuestionId;
              const isCompleted = completedIds.includes(q.id);

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    onSelectQuestion(q);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isCurrent
                    ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono ${isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                      }`}>
                      {String(q.num).padStart(2, '0')}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold truncate ${isCurrent ? 'text-blue-700' : 'text-slate-900'
                          }`}>
                          {q.title}
                        </span>
                        {isCompleted && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {q.topic}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {recordingsMap[q.id] && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                        title="已保存本地作答录音，点击可查看评分并回听"
                      >
                        <Volume2 className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{recordingsMap[q.id].score}分</span>
                      </span>
                    )}

                    <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部本地存储统计与清理 */}
        <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>本地离线录音: {stats.count} 题 ({stats.totalMB} MB)</span>
          </div>

          {onClearAllRecordings && stats.count > 0 && (
            <button
              onClick={() => {
                if (confirm('确定要清空本地所有历史录音吗？清空后将无法回听过去的作答录音。')) {
                  onClearAllRecordings();
                }
              }}
              className="text-slate-400 hover:text-rose-600 text-[11px] transition-colors cursor-pointer"
            >
              清空录音
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
