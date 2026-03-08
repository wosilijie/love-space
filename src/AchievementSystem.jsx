import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';

import { 
  Trophy, 
  Plus, 
  Lock, 
  Unlock, 
  TrendingUp,
  Star,
  Trash2,
  Clock,
  Heart,
  Sparkles,
  ChevronRight
} from 'lucide-react';


// --- Data Definitions ---
const EVENT_CATEGORIES = [
  {
    id: 'A',
    name: 'Time & Memory',
    chineseName: '时间与记录',
    events: ['在一起的第 100 天', '在一起的第 365 天', '在一起的第 1314 天', '给某一天命名', '一起回看旧照片', '制作情侣纪念册', '写未来信', '录制语音存档', '录制视频存档', '一起做时间线回顾', '第一次见面（完整复盘）']
  },
  {
    id: 'B',
    name: 'Shared Experiences',
    chineseName: '共同体验',
    events: ['一起去博物馆', '一起去演唱会', '一起看展览', '一起旅行（短途）', '一起旅行（跨城市）', '一起看日出', '一起看日落', '一起淋雨不躲', '一起凌晨散步', '一起吃夜宵', '一起跨年']
  },
  {
    id: 'C',
    name: 'Creation & Art',
    chineseName: '创造与艺术',
    events: ['一起演奏乐器', '一起合奏一段旋律', '一起写一首诗', '一起写一段歌词', '一起完成一首曲', '一起画一幅画', '一起做手工', '一起剪辑一个视频', '一起做一份歌单', '创造一个情侣内部梗']
  },
  {
    id: 'D',
    name: 'Play & Fun',
    chineseName: '玩乐与陪伴',
    events: ['一起玩手机游戏', '一起玩主机游戏', '一起玩桌游', '一起玩双人小游戏', '一起玩新游戏', '一起玩游戏累计数量到50', '一起通关一个游戏', '一起失败但没吵架', '一起熬夜玩', '一起无所事事', '一起吃一顿超贵的料理', '一起吃路边摊', '一天只呆在床上溺歪']
  },
  {
    id: 'E',
    name: 'Intimacy & Communication',
    chineseName: '亲密与沟通',
    events: ['一天只用“我爱你”交流', '一天只能用眼神交流', '一次完整的道歉', '一次完整的倾听', '冲突后复盘', '在低谷时陪伴对方']
  },
  {
    id: 'F',
    name: 'Life & Future',
    chineseName: '生活与未来',
    events: ['一起布置生活空间', '一起住过同一个地方', '一起制定半年计划', '一起制定一年计划', '一起做重要决定', '一起存钱做某件事', '共同买一个属于我们的家', '一起讨论未来生活方式', '明确关系确认']
  }
];

const ACHIEVEMENT_LIST = [
  { id: 1, title: '第一次见面 · 官方定稿', triggerEvents: ['第一次见面（完整复盘）'] },
  { id: 2, title: '情侣纪念册启用', triggerEvents: ['制作情侣纪念册'] },
  { id: 3, title: '时间胶囊', triggerEvents: ['写未来信'] },
  { id: 4, title: '在一起的第 1314 天', triggerEvents: ['在一起的第 1314 天'] },
  { id: 5, title: '第一次回头看', triggerEvents: ['一起回看旧照片'] },
  { id: 6, title: '博物馆同行', triggerEvents: ['一起去博物馆'] },
  { id: 7, title: '演唱会现场', triggerEvents: ['一起去演唱会'] },
  { id: 8, title: '第一次一起旅行', triggerEvents: ['一起旅行（短途）', '一起旅行（跨城市）'], logic: 'OR' },
  { id: 9, title: '高低都一起吃', triggerEvents: ['一起吃一顿超贵的料理', '一起吃路边摊'], logic: 'AND' },
  { id: 10, title: '光影见证', triggerEvents: ['一起看日出', '一起看日落'], logic: 'OR' },
  { id: 11, title: '合奏完成', triggerEvents: ['一起演奏乐器', '一起合奏一段旋律'], logic: 'OR' },
  { id: 12, title: '诗的诞生', triggerEvents: ['一起写一首诗'] },
  { id: 13, title: '曲的完成', triggerEvents: ['一起完成一首曲'] },
  { id: 14, title: '并肩玩家', triggerEvents: ['一起玩游戏累计数量到50'] },
  { id: 15, title: '内部语言', triggerEvents: ['创造一个情侣内部梗'] },
  { id: 16, title: '只用我爱你的一天', triggerEvents: ['一天只用“我爱你”交流'] },
  { id: 17, title: '眼神交流的一天', triggerEvents: ['一天只能用眼神交流'] },
  { id: 18, title: '床上躺平日', triggerEvents: ['一天只呆在床上溺歪'] },
  { id: 19, title: '小家的诞生', triggerEvents: ['共同买一个属于我们的家'] },
  { id: 20, title: '看清仍选择', triggerEvents: ['在低谷时陪伴对方', '明确关系确认'], logic: 'AND' }
];

const PHASE_NAMES = [
  "初见 · 悸动萌发",
  "探索 · 并肩同行",
  "深耕 · 共振回响",
  "沉淀 · 归属印记",
  "永恒 · 宿命纽带"
];

export default function AchievementSystem({ user, db, appId }) {
  
  const [activeTab, setActiveTab] = useState('events'); 
  const [loggedEvents, setLoggedEvents] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  

  useEffect(() => {
    if (!user) return;
    const eventsQuery = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLoggedEvents(data);
    }, (err) => console.error("Firestore Error:", err));
    return () => unsubscribe();
  }, [user]);

  const achievementsStatus = useMemo(() => {
    const triggeredEventNames = new Set(loggedEvents.map(l => l.eventName));
    return ACHIEVEMENT_LIST.map(ach => {
      let isUnlocked = false;
      if (ach.logic === 'AND') {
        isUnlocked = ach.triggerEvents.every(te => triggeredEventNames.has(te));
      } else if (ach.logic === 'OR') {
        isUnlocked = ach.triggerEvents.some(te => triggeredEventNames.has(te));
      } else {
        isUnlocked = triggeredEventNames.has(ach.triggerEvents[0]);
      }
      return { ...ach, isUnlocked };
    });
  }, [loggedEvents]);

  const unlockedCount = achievementsStatus.filter(a => a.isUnlocked).length;
  const currentPhaseIndex = Math.min(Math.floor(unlockedCount / 5), PHASE_NAMES.length - 1);
  const nextMilestone = Math.min((currentPhaseIndex + 1) * 5, 20);

  const handleLogEvent = async (eventName) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), {
        eventName,
        uid: user.uid,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (docId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', docId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-800 px-6 pt-12 md:px-12 md:pt-16 font-sans transition-all selection:bg-pink-100 relative">
      <header className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="flex items-center gap-8 group">
          <div className="w-16 h-16 bg-gradient-to-tr from-pink-500 via-rose-500 to-rose-400 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-rose-200 transition-transform group-hover:rotate-6">
            <Heart size={36} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mb-1">情侣成就系统</h1>
            <p className="text-slate-400 font-bold text-base tracking-widest italic opacity-80 flex items-center gap-2 uppercase">
              <span className="w-2 h-2 bg-pink-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,114,182,0.6)]" />
              {loggedEvents.length} Moments Recorded
            </p>
          </div>
        </div>

        <div className="bg-white px-8 py-5 rounded-[2.2rem] shadow-xl shadow-slate-100/50 border border-slate-100/80 flex items-center gap-6 group hover:border-amber-100 transition-colors">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
            <Trophy size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">{unlockedCount}</div>
            <div className="text-[11px] font-black text-slate-400 uppercase mt-1 tracking-[0.2em]">Achievements</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto relative">
        {/* 页签导航 */}
        <div className="flex gap-4 mb-16 bg-slate-200/40 p-2 rounded-[1.8rem] w-fit mx-auto md:mx-0 backdrop-blur-sm border border-slate-200/20 shadow-inner">
          {[
            { id: 'events', label: '事项池', icon: <Plus size={22}/> },
            { id: 'achievements', label: '成就墙', icon: <Trophy size={22}/> },
            { id: 'history', label: '记录薄', icon: <Clock size={22}/> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-[18px] font-black transition-all duration-500 ${
                activeTab === tab.id 
                ? 'bg-white shadow-xl text-slate-900 scale-105 ring-1 ring-slate-100' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative z-10">
          {activeTab === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-6">
              {EVENT_CATEGORIES.map(cat => (
                <div key={cat.id} className="bg-white rounded-[2.8rem] border border-slate-100/80 p-10 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                  <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-5">
                    <h3 className="font-black text-2xl text-slate-800 tracking-tight">{cat.chineseName}</h3>
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.25em]">{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-3.5">
                    {cat.events.map(evName => (
                      <button
                        key={evName}
                        onClick={() => handleLogEvent(evName)}
                        disabled={isSubmitting}
                        className="px-6 py-3.5 bg-slate-50/80 hover:bg-rose-500 hover:text-white text-slate-600 rounded-2xl text-[16px] font-bold transition-all active:scale-95 disabled:opacity-50 border border-slate-100/50 hover:border-rose-400 shadow-sm hover:shadow-lg"
                      >
                        {evName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-6">
              {achievementsStatus.map(ach => (
                <div 
                  key={ach.id} 
                  className={`p-8 rounded-[2.8rem] border transition-all duration-700 flex flex-col items-center text-center group min-h-[220px] justify-center relative overflow-hidden ${
                    ach.isUnlocked 
                    ? 'bg-white border-amber-100 shadow-2xl shadow-amber-50/50 scale-100' 
                    : 'bg-white border-slate-50 opacity-40 grayscale pointer-events-none scale-95'
                  }`}
                >
                  <div className={`w-14 h-14 mb-6 rounded-[1.4rem] flex items-center justify-center transition-all shadow-inner ${
                    ach.isUnlocked ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-300'
                  }`}>
                    {ach.isUnlocked ? <Unlock size={30} strokeWidth={2.5} /> : <Lock size={30} strokeWidth={2.5} />}
                  </div>
                  <h4 className="text-[19px] font-black text-slate-800 leading-tight mb-3 tracking-tight">
                    {ach.title}
                  </h4>
                  {ach.isUnlocked && (
                    <>
                      <Star size={18} className="text-amber-400 animate-pulse" fill="currentColor" />
                      <div className="absolute top-3 right-5 text-[10px] font-black text-amber-200 uppercase tracking-widest italic">Success</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[3.5rem] border border-slate-100/80 shadow-2xl shadow-slate-200/40 overflow-hidden animate-in fade-in slide-in-from-bottom-6">
              <div className="divide-y divide-slate-100/50 max-h-[750px] overflow-y-auto custom-scrollbar pb-32">
                {loggedEvents.length === 0 ? (
                  <div className="p-32 text-center opacity-20 font-black text-2xl italic tracking-widest uppercase">No Records Found</div>
                ) : (
                  [...loggedEvents].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map((log) => (
                    <div key={log.id} className="p-10 px-14 flex items-center justify-between group hover:bg-slate-50/80 transition-all duration-300">
                      <div className="flex items-center gap-8">
                        <div className="p-4 bg-pink-50 rounded-2xl text-pink-400 group-hover:scale-110 transition-transform shadow-inner">
                          <Sparkles size={24} fill="currentColor" />
                        </div>
                        <div>
                          <div className="font-black text-[22px] text-slate-800 tracking-tight mb-1.5">{log.eventName}</div>
                          <div className="text-[13px] text-slate-400 font-bold uppercase tracking-[0.15em] flex items-center gap-2.5">
                            <Clock size={14} strokeWidth={3} />
                            {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('zh-CN', { hour12: false }) : 'Recording...'}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteEvent(log.id)} className="p-5 text-slate-300 hover:text-white hover:bg-rose-500 rounded-2xl transition-all opacity-0 group-hover:opacity-100 shadow-xl shadow-rose-100">
                        <Trash2 size={24} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 核心改动：全局占位层，强制将内容顶离屏幕底部 */}
        <div className="h-64 md:h-72 w-full pointer-events-none" aria-hidden="true" />
      </main>

      {/* 悬浮进度条 - 样式优化 */}
      <footer className="fixed bottom-32 left-0 right-0 pointer-events-none z-[999] flex items-center justify-center">
        <div className="max-w-3xl w-full px-10 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-3xl rounded-full px-10 py-7 shadow-[0_35px_80px_-20px_rgba(0,0,0,0.5)] flex items-center gap-10 border border-white/10 ring-1 ring-white/5 transition-transform hover:scale-[1.01]">
            
            <div className="flex items-center gap-5 shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-pink-400 border border-white/10 shadow-inner">
                <TrendingUp size={28} strokeWidth={3} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.35em] mb-2 leading-none text-nowrap">Phase</span>
                <span className="text-[20px] font-black text-white tracking-tight leading-none italic text-nowrap">{PHASE_NAMES[currentPhaseIndex]}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-300 rounded-full transition-all duration-1200 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_25px_rgba(244,114,182,0.6)]"
                  style={{ width: `${(unlockedCount % 5) * 20 || (unlockedCount > 0 && unlockedCount % 5 === 0 ? 100 : 0)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0 border-l border-white/10 pl-10 hidden sm:flex">
               <div className="flex flex-col items-end">
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.35em] mb-2 leading-none text-nowrap">Milestone</span>
                 <span className="text-4xl font-black text-pink-400 leading-none italic tracking-tighter tabular-nums">
                   {unlockedCount} <span className="text-white/20 text-[16px] px-1 font-normal not-italic tracking-normal">/</span> {nextMilestone}
                 </span>
               </div>
               <ChevronRight size={24} className="text-white/20" />
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-6 { from { transform: translateY(3rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .animate-in { animation-duration: 0.8s; animation-fill-mode: both; transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-bottom-6 { animation-name: slide-in-from-bottom-6; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; border: 3px solid white; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        
        body { 
          -webkit-tap-highlight-color: transparent; 
          scroll-behavior: smooth; 
          background-color: #FDFCFB;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        
        h1, h2, h3, h4, button, .italic {
          letter-spacing: -0.025em;
        }
      `}</style>
    </div>
  );
}