import React, { useState, useEffect, useMemo } from 'react';
import Library from './Library';
import Portal from './Portal';
import FloatingPlayer from './FloatingPlayer';
import AchievementSystem from './AchievementSystem';
import WhatToEat from './WhatToEat';
import { Trophy, LayoutDashboard, Home } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  query,
  updateDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  Heart, 
  Mail, 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  Trash2,
  Calendar,
  Bell,
  Timer,
  RotateCcw,
  BarChart3,
  TrendingUp,
  X,
  ExternalLink,
  Link2,
  Bookmark,
  MessageSquareHeart,
  Tv,
  MonitorPlay,
  Globe,
  PieChart,
  Repeat,
  Utensils
} from 'lucide-react';

// --- Firebase Configuration ---
let configStr = '{}';
try {
  configStr = typeof __firebase_config !== 'undefined' ? (typeof __firebase_config === 'string' ? __firebase_config : JSON.stringify(__firebase_config)) : '{}';
} catch(e) {}
const pConf = JSON.parse(configStr);
const firebaseConfig = pConf.apiKey ? pConf : { apiKey: 'AIzaSyDummyKeyForLocalPreviewDoNotUse123', authDomain: 'demo.firebaseapp.com', projectId: 'demo-project', appId: '1:123456789:web:abcdef'};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'love-study-ultra-v7';

// --- 农历转换辅助 ---
const getLunarBirthdayInCregorian = (lunarMonth, lunarDay) => {
  const now = new Date();
  const year = now.getFullYear();
  const lunarNewYearMap = { 2025: "2025-01-29", 2026: "2026-02-17", 2027: "2027-02-06" };
  const calculateDate = (y) => {
    if (!lunarNewYearMap[y]) return new Date(y, 1, 1);
    const start = new Date(lunarNewYearMap[y]);
    start.setDate(start.getDate() + (lunarDay - 1));
    return start;
  };
  let targetDate = calculateDate(year);
  if (targetDate < now) targetDate = calculateDate(year + 1);
  return targetDate;
};

const App = () => {
  const [activeTab, setActiveTab] = useState('portal'); // Changed default to portal
  const [user, setUser] = useState(null);
  
  // 纪念册状态
  const [daysTogether, setDaysTogether] = useState(0);
  const [daysKnown, setDaysKnown] = useState(0);
  const [birthdays, setBirthdays] = useState({ me: 0, her: 0 });

  // 悄悄话状态
  const [letters, setLetters] = useState([]);
  const [newLetter, setNewLetter] = useState('');
  const [isLetterOpen, setIsLetterOpen] = useState(false);

  // 自习室状态
  const [studyMins, setStudyMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [timer, setTimer] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // work, break
  const [partnerStatus, setPartnerStatus] = useState({ mood: '😊', isStudying: false });
  const [myMood, setMyMood] = useState('😊');
  const [showReminder, setShowReminder] = useState(null);
  const [isFirstVisitToday, setIsFirstVisitToday] = useState(true);

  // 任务与笔记
  const [localTasks, setLocalTasks] = useState([]);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [privateNotes, setPrivateNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [focusHistory, setFocusHistory] = useState([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // 链接
  const defaultLinks = [
    { title: '北理研究生院', url: 'https://grd.bit.edu.cn/' },
    { title: '研招网(北理)', url: 'https://yz.chsi.com.cn/sch/schoolInfo--schId-367884.dhtml' },
    { title: '27考研资源', url: 'https://note.youdao.com/ynoteshare/index.html?id=1ebd483561435eaa31ef99d4b7643df3&type=note&_time=1650091169262' }
  ];
  const [customLinks, setCustomLinks] = useState([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });

  // 放映厅
  const videoSources = [
    { name: 'Bilibili', url: 'https://www.bilibili.com', color: 'bg-pink-500' },
    { name: '阿里云盘', url: 'https://www.alipan.com', color: 'bg-blue-600' },
    { name: '百度网盘', url: 'https://pan.baidu.com', color: 'bg-blue-500' },
    { name: '夸克网盘', url: 'https://pan.quark.cn', color: 'bg-emerald-500' }
  ];
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoSources[0].url);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auth 认证
  useEffect(() => {
    if (firebaseConfig.apiKey === 'AIzaSyDummyKeyForLocalPreviewDoNotUse123') { setUser({ uid: 'mock' }); return; }
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 数据同步
  useEffect(() => {
    if (!user) return;
    if (firebaseConfig.apiKey === 'AIzaSyDummyKeyForLocalPreviewDoNotUse123') return;
    
    const unsubLetters = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'letters'), (s) => {
      setLetters(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
    
    const unsubStatus = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'status'), (s) => {
      const d = s.docs.find(doc => doc.id !== user.uid);
      if (d) setPartnerStatus(d.data());
    });
    
    const unsubNotes = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'private_notes'), (s) => {
      setPrivateNotes(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
    
    const unsubStats = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'focus_sessions'), (s) => {
      setFocusHistory(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubLinks = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'custom_links'), (s) => {
      setCustomLinks(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTasks = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), (s) => {
      const tasks = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const todayStr = new Date().toDateString();
      const lastResetDate = localStorage.getItem('last_task_reset_date');
      
      // 跨天重置逻辑
      if (lastResetDate !== todayStr) {
        tasks.forEach(async (t) => {
          if (t.completed) {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', t.id), { completed: false });
          }
        });
        localStorage.setItem('last_task_reset_date', todayStr);
      }
      setLocalTasks(tasks.sort((a, b) => a.time.localeCompare(b.time)));
    });
    
    return () => { unsubLetters(); unsubStatus(); unsubNotes(); unsubStats(); unsubLinks(); unsubTasks(); };
  }, [user]);

  // 首次进入自习室弹窗逻辑
  useEffect(() => {
    if (activeTab === 'study' && isFirstVisitToday) {
      setShowTaskInput(true);
      setIsFirstVisitToday(false);
    }
  }, [activeTab]);

  // 纪念日
  useEffect(() => {
    const startDate = new Date('2025-10-02');
    const knownDate = new Date('2018-12-19');
    const updateStats = () => {
      const now = new Date();
      setDaysTogether(Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));
      setDaysKnown(Math.floor((now - knownDate) / (1000 * 60 * 60 * 24)));
      const myBday = getLunarBirthdayInCregorian(1, 10);
      const herBday = getLunarBirthdayInCregorian(1, 22);
      const calc = (t) => Math.ceil((t - now) / (1000 * 60 * 60 * 24));
      setBirthdays({ me: calc(myBday), her: calc(herBday) });
    };
    updateStats();
  }, []);

  // 计时器核心逻辑（含自动切换）
  useEffect(() => {
    let interval = null;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && isActive) {
      const isWorkEnding = mode === 'work';
      if (isWorkEnding && user) {
        addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'focus_sessions'), {
          duration: studyMins,
          timestamp: serverTimestamp(),
          date: new Date().toDateString(),
          createdAt: Date.now()
        });
      }
      
      // 自动切换逻辑
      if (isWorkEnding) {
        setMode('break');
        setTimer(breakMins * 60);
        setShowReminder({ title: "专注完成！", msg: "自动进入 5 分钟休息时间~" });
      } else {
        setMode('work');
        setTimer(studyMins * 60);
        setShowReminder({ title: "休息结束！", msg: "准备好开始新的专注了吗？" });
        setIsActive(false); // 休息结束通常停一下，等待确认手动点开始
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timer, mode, studyMins, breakMins, user]);

  // 同步状态到 Firebase
  useEffect(() => {
    if (!user) return;
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'status', user.uid), {
      mood: myMood, isStudying: isActive, mode, lastSeen: serverTimestamp()
    }, { merge: true });
  }, [myMood, isActive, mode, user]);

  // 统计
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayTotal = focusHistory.filter(s => s.date === todayStr).reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
    
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() || 7) - 1));
    monday.setHours(0, 0, 0, 0);

    const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const dailyStats = weekDays.map((name, index) => {
      const d = new Date(monday); d.setDate(monday.getDate() + index);
      const duration = focusHistory.filter(s => s.date === d.toDateString()).reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
      return { name, minutes: duration };
    });

    return { today: todayTotal, week: dailyStats.reduce((a,c)=>a+c.minutes,0), dailyStats };
  }, [focusHistory]);

  const handleToggleMode = () => {
    const newMode = mode === 'work' ? 'break' : 'work';
    setIsActive(false);
    setMode(newMode);
    setTimer(newMode === 'work' ? studyMins * 60 : breakMins * 60);
  };

  const handleToggleTask = async (task) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), { completed: !task.completed });
  };

  const handleSendLetter = async () => {
    if (!newLetter.trim() || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'letters'), { content: newLetter, senderId: user.uid, timestamp: serverTimestamp() });
    setNewLetter(''); setIsLetterOpen(false);
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 ${activeTab === 'study' ? 'bg-[#F8FAFC]' : activeTab === 'media' ? 'bg-slate-900' : 'bg-[#FFF0F3]'}`}>
      
      {/* 全局悬浮计时 */}
      {activeTab !== 'study' && isActive && (
        <div className="fixed top-6 right-6 z-[60] bg-white/90 backdrop-blur shadow-xl px-5 py-2.5 rounded-full border border-slate-100 flex items-center gap-3 animate-pulse">
           <div className={`w-2.5 h-2.5 rounded-full ${mode === 'work' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
           <span className="text-sm font-black text-slate-700 tabular-nums">{formatTime(timer)}</span>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2.5rem] px-4 py-3 flex gap-2 z-50">
        {[
          { id: 'home', icon: Heart, label: '纪念册', color: 'bg-rose-500', text: 'text-rose-400' },
          { id: 'whisper', icon: Mail, label: '悄悄话', color: 'bg-pink-400', text: 'text-pink-300' },
          { id: 'study', icon: BookOpen, label: '自习室', color: 'bg-indigo-600', text: 'text-indigo-400' },
          { id: 'media', icon: MonitorPlay, label: '放映厅', color: 'bg-slate-800', text: 'text-slate-500' },
          { id: 'achievements', icon: Trophy, label: '成就墙', color: 'bg-amber-500', text: 'text-amber-400' },
          { id: 'food', icon: Utensils, label: '今天吃啥', color: 'bg-orange-500', text: 'text-orange-400' },
          { id: 'library', icon: BookOpen, label: '在线书库', color: 'bg-emerald-600', text: 'text-emerald-500' },
          { id: 'portal', icon: LayoutDashboard, label: '导航页', color: 'bg-indigo-600', text: 'text-indigo-400' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg scale-105` : `hover:bg-white/50 ${tab.text}`}`}>
            <tab.icon size={20} fill={activeTab === tab.id ? "currentColor" : "none"} />
            <span className="font-black text-sm hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* --- Home Tab --- */}
      {activeTab === 'home' && (
        <div className="animate-in fade-in zoom-in-95 duration-700 pt-20 pb-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 transform -rotate-3 border-4 border-rose-50">
              <Heart className="text-rose-500 animate-bounce" size={48} fill="#f43f5e" />
            </div>
            <h1 className="text-5xl font-black text-rose-600 tracking-tight font-serif italic mb-16">我们的心动时刻</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-2 border-rose-50 transition-transform hover:scale-[1.02]">
                <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">相识于微时</p>
                <div className="text-7xl font-black text-slate-800 tracking-tighter">{daysKnown}<span className="text-xl ml-3 text-rose-200 font-serif uppercase">Days</span></div>
              </div>
              <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-2 border-orange-50 transition-transform hover:scale-[1.02]">
                <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">相守在此时</p>
                <div className="text-7xl font-black text-slate-800 tracking-tighter">{daysTogether}<span className="text-xl ml-3 text-orange-200 font-serif uppercase">Days</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/60 backdrop-blur p-8 rounded-[2.5rem] border border-white flex items-center justify-between">
                <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">我的生日 (正月初十)</p><p className="text-xl font-bold text-slate-700 italic">倒计时</p></div>
                <div className="text-4xl font-black text-rose-500">{birthdays.me}<span className="text-xs ml-1 opacity-40">天</span></div>
              </div>
              <div className="bg-white/60 backdrop-blur p-8 rounded-[2.5rem] border border-white flex items-center justify-between">
                <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">她的生日 (正月二十二)</p><p className="text-xl font-bold text-slate-700 italic">倒计时</p></div>
                <div className="text-4xl font-black text-orange-500">{birthdays.her}<span className="text-xs ml-1 opacity-40">天</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Whisper Tab --- */}
      {activeTab === 'whisper' && (
        <div className="animate-in slide-in-from-bottom-8 duration-700 pt-20 pb-32 px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-black text-pink-600 mb-2 flex items-center gap-3 justify-center"><MessageSquareHeart size={32} /> 心灵的树洞</h2>
               <p className="text-pink-300 text-sm font-medium">纸短情长，所有的思念都在这里回响</p>
            </div>
            <button onClick={() => setIsLetterOpen(true)} className="w-full h-40 bg-white border-2 border-dashed border-pink-200 rounded-[3rem] flex flex-col items-center justify-center gap-2 hover:border-pink-400 transition-all mb-12 shadow-sm">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-500"><Plus size={24} /></div>
              <span className="text-pink-400 font-black text-xs uppercase tracking-widest">书写此刻心情</span>
            </button>
            <div className="space-y-8">
              {letters.map((letter) => (
                <div key={letter.id} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-white relative transition-all hover:-rotate-1 group">
                   {user && letter.senderId === user.uid && (
                     <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'letters', letter.id))} className="absolute top-6 right-6 p-2 text-slate-200 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                   )}
                   <div className="flex justify-between items-center mb-6 text-[9px] font-black uppercase tracking-widest">
                      <span className={letter.senderId === user?.uid ? 'text-blue-500' : 'text-pink-500'}>{letter.senderId === user?.uid ? 'From Me' : 'From Her'}</span>
                      <span className="text-pink-200">{letter.timestamp?.toDate().toLocaleDateString()}</span>
                   </div>
                   <p className="text-slate-600 leading-relaxed font-serif text-xl italic text-center">"{letter.content}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Study Tab (升级后的第六版内核) --- */}
      {activeTab === 'study' && (
        <div className="animate-in slide-in-from-left-12 duration-700 pt-16 pb-32 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              {/* 番茄钟卡片 */}
              <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-slate-100 relative">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${mode === 'work' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {mode === 'work' ? '专注模式' : '休憩时刻'}
                        </span>
                        <button onClick={handleToggleMode} className="p-1.5 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-all"><Repeat size={14}/></button>
                      </div>
                      <div className="flex gap-2 p-1.5 bg-slate-50 rounded-full w-fit">
                        {['😊', '📖', '🍵', '💪'].map(m => (
                          <button key={m} onClick={() => setMyMood(m)} className={`text-lg p-2 rounded-full transition-all ${myMood === m ? 'bg-white shadow-sm' : 'opacity-40 hover:opacity-100'}`}>{m}</button>
                        ))}
                      </div>
                   </div>
                   <div className="text-right inline-flex items-center gap-3 bg-slate-800 text-white px-5 py-3 rounded-2xl">
                      <span className="text-2xl">{partnerStatus.mood}</span>
                      <div className="text-left"><p className="text-[8px] font-bold opacity-40 uppercase">她的专注</p><p className="text-xs font-bold">{partnerStatus.isStudying ? (partnerStatus.mode === 'work' ? '正在奋斗' : '小憩一下') : '休息中'}</p></div>
                   </div>
                </div>
                <div className="text-center my-10"><h2 className="text-[8rem] md:text-[10rem] font-black text-slate-800 tabular-nums leading-none tracking-tighter">{formatTime(timer)}</h2></div>
                <div className="flex justify-center gap-4 mb-10">
                  <button onClick={() => setIsActive(!isActive)} className={`px-16 py-5 rounded-[2.5rem] font-black transition-all ${isActive ? 'bg-rose-50 text-rose-500' : 'bg-slate-800 text-white shadow-xl'}`}>{isActive ? '暂停' : '开始专注'}</button>
                  <button onClick={() => { setIsActive(false); setTimer(mode === 'work' ? studyMins * 60 : breakMins * 60); }} className="p-5 rounded-[2.5rem] bg-slate-50 text-slate-400"><RotateCcw size={28} /></button>
                </div>
                <div className="flex justify-center gap-12 border-t border-slate-50 pt-8">
                  <div className="text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-3">专注 (min)</p><div className="flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-2 font-black text-slate-700"><button onClick={() => setStudyMins(Math.max(1, studyMins - 5))}>－</button><span className="w-8">{studyMins}</span><button onClick={() => setStudyMins(studyMins + 5)}>＋</button></div></div>
                  <div className="text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-3">休息 (min)</p><div className="flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-2 font-black text-slate-700"><button onClick={() => setBreakMins(Math.max(1, breakMins - 1))}>－</button><span className="w-8">{breakMins}</span><button onClick={() => setBreakMins(breakMins + 1)}>＋</button></div></div>
                </div>
              </div>

              {/* 任务清单 */}
              <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black flex items-center gap-3"><Timer className="text-indigo-500" /> 高效任务清单</h3><button onClick={() => setShowTaskInput(true)} className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-black rounded-xl hover:bg-slate-100">管理日程</button></div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {localTasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-300 font-bold italic">今日还没有规划任务哦...</div>
                  ) : localTasks.map(task => (
                    <div key={task.id} onClick={() => handleToggleTask(task)} className={`flex items-center gap-6 p-6 rounded-[2.5rem] cursor-pointer transition-all border-2 ${task.completed ? 'bg-slate-50 opacity-60 border-transparent' : 'bg-white border-slate-50 hover:border-slate-100 shadow-sm'}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100'}`}>{task.completed && <CheckCircle2 size={16}/>}</div>
                      <div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.time}</p><p className={`text-lg font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.text}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              {/* 今日统计 */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm group">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={12} className="text-indigo-500"/> 今日专注时长</h4>
                    <button onClick={() => setIsStatsOpen(true)} className="p-2 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-1"><BarChart3 size={16} /><span className="text-[10px] font-black">报表</span></button>
                 </div>
                 <div className="mb-4"><div className="text-5xl font-black text-slate-800 tracking-tighter">{stats.today}<span className="text-sm ml-2 text-indigo-400 italic">mins</span></div></div>
                 <div className="flex items-center justify-between text-[10px] font-black text-slate-300 uppercase"><span>本周累计: {stats.week}m</span><PieChart size={14} /></div>
              </div>

              {/* 快捷资源 */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Bookmark size={12} className="text-amber-500" fill="currentColor"/> 快捷资源</h4><button onClick={() => setShowLinkInput(true)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-indigo-500"><Plus size={14}/></button></div>
                <div className="space-y-3">
                  {[...defaultLinks, ...customLinks].map((link, idx) => (<a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-indigo-50 transition-all"><span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 truncate mr-2">{link.title}</span><ExternalLink size={12} className="text-slate-300 group-hover:text-indigo-400 shrink-0"/></a>))}
                </div>
              </div>

              {/* 私人笔记 (带滚动优化) */}
              <div className="bg-slate-800 rounded-[3rem] p-8 text-white shadow-xl min-h-[380px] flex flex-col">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Sparkles size={18} className="text-yellow-400"/> 私人笔记</h3>
                 <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar mb-6 max-h-[220px]">
                    {privateNotes.length === 0 ? (
                      <div className="text-white/20 text-xs italic py-4">暂无随手笔记...</div>
                    ) : privateNotes.map(note => (
                      <div key={note.id} className="bg-white/10 p-5 rounded-2xl border border-white/5 group relative">
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'private_notes', note.id))} className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-rose-400 transition-all"><Trash2 size={12} /></button>
                        <p className="text-sm italic opacity-90 leading-relaxed font-serif">"{note.text}"</p>
                      </div>
                    ))}
                 </div>
                 <div className="space-y-3 mt-auto pt-4 border-t border-white/10">
                    <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="记下今日收获..." className="w-full bg-white/10 border-none rounded-[1.5rem] px-5 py-3 text-xs focus:ring-1 focus:ring-white/30 resize-none h-20 outline-none" />
                    <button onClick={async () => {
                        if (!newNote.trim() || !user) return;
                        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'private_notes'), { text: newNote, timestamp: serverTimestamp(), createdAt: Date.now() });
                        setNewNote('');
                      }} className="w-full bg-white text-slate-800 py-4 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors">保存笔记</button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- Food Tab --- */}
      {activeTab === 'food' && (
        <div className="animate-in slide-in-from-right-12 duration-700">
          <WhatToEat />
        </div>
      )}
      {activeTab === 'library' && (<Library />)}
      {activeTab === 'portal' && <Portal onTabChange={setActiveTab} />}

      <FloatingPlayer activeTab={activeTab} />

      {/* --- Achievements Tab --- */}
      {activeTab === 'achievements' && (
        <AchievementSystem user={user} db={db} appId={appId} />
      )}

      {/* --- Media Tab (Reverted to Internal Iframe) --- */}
      {activeTab === 'media' && (
        <div className="animate-in fade-in duration-700 h-screen w-full flex flex-col pt-4">
           <div className="px-6 py-4 flex flex-wrap gap-4 items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur">
              <div className="flex items-center gap-3 mr-4"><MonitorPlay className="text-indigo-400" size={24} /><span className="text-white font-black text-lg tracking-tight">放映厅</span></div>
              <div className="flex gap-2">{videoSources.map(source => (<button key={source.name} onClick={() => setCurrentVideoUrl(source.url)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${currentVideoUrl === source.url ? `${source.color} text-white shadow-lg` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{source.name}</button>))}</div>
              <div className="flex-1 max-w-md ml-auto relative group flex items-center gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={14} />
                  <input type="text" value={currentVideoUrl} onChange={(e) => setCurrentVideoUrl(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-slate-300 pl-10 pr-4 py-2 rounded-full text-xs focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" placeholder="输入自定义视频链接..." />
                </div>
                <button onClick={() => window.open(currentVideoUrl, '_blank')} className="p-2.5 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 hover:text-white transition-all shadow-lg" title="外部浏览器打开">
                  <ExternalLink size={16} />
                </button>
              </div>
           </div>
           <div className="flex-1 bg-black relative">
             <iframe src={currentVideoUrl} className="w-full h-full border-none" allowFullScreen title="video-player" sandbox="allow-forms allow-scripts allow-same-origin allow-popups" />
             {/* Fallback Overlay for potential block */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-black/40">
                <p className="text-white/50 text-xs font-bold">如果加载异常，请点击右上角图标外部打开</p>
             </div>
           </div>
        </div>
      )}

      {/* --- Modals --- */}
      
      {/* 任务清单管理 (含首次进入逻辑) */}
      {showTaskInput && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black text-2xl mb-4 flex items-center gap-3">制定今日计划 <Sparkles className="text-amber-400"/></h3>
            <p className="text-slate-400 text-xs font-bold mb-8">设定今天的奋斗目标，第二天会自动重置哦~</p>
            <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {localTasks.map(t => (
                <div key={t.id} className="flex justify-between items-center bg-slate-50 px-6 py-4 rounded-2xl group">
                  <span className="text-sm font-bold text-slate-700">{t.time} - {t.text}</span>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', t.id))} className="text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="time" id="t_time" className="bg-slate-100 rounded-xl p-3 text-xs w-28 border-none outline-none" defaultValue="09:00" />
                <input id="t_text" placeholder="接下来要做什么？" className="flex-1 bg-slate-100 rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-indigo-100 outline-none" onKeyDown={async (e) => { 
                  if (e.key === 'Enter' && e.target.value.trim() && user) { 
                    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), { 
                      text: e.target.value, 
                      time: document.getElementById('t_time').value, 
                      completed: false,
                      timestamp: serverTimestamp()
                    }); 
                    e.target.value = ''; 
                  } 
                }} />
              </div>
            </div>
            <button onClick={() => setShowTaskInput(false)} className="w-full bg-slate-800 text-white py-5 rounded-[2.5rem] font-black hover:bg-slate-900 transition-colors">开启新的一天</button>
          </div>
        </div>
      )}

      {/* 统计弹窗 */}
      {isStatsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl relative">
             <button onClick={() => setIsStatsOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-800 transition-all"><X size={20}/></button>
             <div className="mb-10 text-left"><h3 className="font-black text-2xl text-slate-800">学习统计报表</h3><p className="text-slate-400 text-xs font-bold italic">每一分钟都在见证你的进步</p></div>
             <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-8 space-y-4">
                {stats.dailyStats.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-400 w-8">{day.name}</span>
                    <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-slate-100">
                      <div className="h-full bg-indigo-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min((day.minutes / (Math.max(...stats.dailyStats.map(d=>d.minutes)) || 60)) * 100, 100)}%` }}></div>
                    </div>
                    <span className="text-xs font-black text-slate-700 w-10 text-right">{day.minutes}m</span>
                  </div>
                ))}
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-8 rounded-[2.5rem] text-center"><p className="text-[10px] font-black text-indigo-300 uppercase mb-2">本周总计</p><p className="text-4xl font-black text-indigo-600">{stats.week}<span className="text-xs ml-1 italic opacity-50">m</span></p></div>
                <div className="bg-emerald-50 p-8 rounded-[2.5rem] text-center"><p className="text-[10px] font-black text-emerald-300 uppercase mb-2">今日活跃</p><p className="text-4xl font-black text-emerald-600">{stats.today}<span className="text-xs ml-1 italic opacity-50">m</span></p></div>
             </div>
          </div>
        </div>
      )}

      {/* 写信弹窗 */}
      {isLetterOpen && (
        <div className="fixed inset-0 bg-pink-900/20 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl relative">
            <button onClick={() => setIsLetterOpen(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-all"><X size={24} /></button>
            <h3 className="font-black text-2xl mb-6 font-serif text-pink-600 italic">书写此刻心情...</h3>
            <textarea autoFocus value={newLetter} onChange={e => setNewLetter(e.target.value)} className="w-full h-48 bg-pink-50/30 rounded-[2rem] p-8 text-slate-600 focus:ring-2 focus:ring-pink-100 resize-none mb-6 font-serif italic text-lg outline-none" placeholder="想对Ta说..." />
            <button onClick={handleSendLetter} disabled={!newLetter.trim()} className="w-full bg-pink-400 text-white py-5 rounded-[2.5rem] font-black shadow-lg shadow-pink-100 hover:bg-pink-500 disabled:opacity-50">发送至树洞</button>
          </div>
        </div>
      )}

      {/* 提示条 */}
      {showReminder && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white px-8 py-6 rounded-[2.5rem] shadow-2xl z-[200] flex items-center gap-6 border-2 border-indigo-500 animate-in slide-in-from-top-12">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 animate-bounce"><Bell size={24} /></div>
          <div><div className="font-black text-slate-800 text-lg">{showReminder.title}</div><p className="text-xs text-slate-400 font-bold">{showReminder.msg}</p></div>
          <button onClick={() => setShowReminder(null)} className="p-2 text-slate-300 hover:text-slate-800"><X size={20} /></button>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default App;