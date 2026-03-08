import React, { useState, useEffect, useRef } from 'react';
import { Music, SkipBack, SkipForward, Play, Pause, X, GripHorizontal, Settings, Volume2, Disc, CassetteTape } from 'lucide-react';

const SKINS = ['mp3', 'tape', 'vinyl'];

export default function FloatingPlayer({ activeTab }) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [skin, setSkin] = useState('mp3');
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleTabs, setVisibleTabs] = useState(['album', 'whisper', 'study', 'media', 'achievements', 'food', 'library', 'portal']);
  const [showSettings, setShowSettings] = useState(false);
  const [isShowing, setIsShowing] = useState(true); // Added for closeable button
  const [service, setService] = useState('mock'); // 'mock', 'netease', 'qq'
  const [serviceId, setServiceId] = useState('149750618'); // Default NetEase id
  const [isHidden, setIsHidden] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('player_settings');
    if (saved) {
      const { pos, s, vt, srv, sid, ish } = JSON.parse(saved);
      if (pos) setPosition(pos);
      if (s) setSkin(s);
      if (vt) setVisibleTabs(vt);
      if (srv) setService(srv);
      if (sid) setServiceId(sid);
      if (ish !== undefined) setIsShowing(ish);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('player_settings', JSON.stringify({ 
      pos: position, 
      s: skin, 
      vt: visibleTabs,
      srv: service,
      sid: serviceId,
      ish: isShowing
    }));
  }, [position, skin, visibleTabs, service, serviceId, isShowing]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - offsetRef.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 200, e.clientY - offsetRef.current.y))
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      // Auto-hide check
      if (position.x < 10) {
        setPosition(prev => ({ ...prev, x: -260 }));
        setIsHidden(true);
      } else if (position.x > window.innerWidth - 40) {
        setPosition(prev => ({ ...prev, x: window.innerWidth - 20 }));
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!visibleTabs.includes(activeTab) || !isShowing) return null;

  return (
    <div 
      style={{ 
        left: 0, 
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)${isHidden ? (position.x < 0 ? ' translateX(10px)' : ' translateX(-10px)') : ''}`,
        willChange: 'transform'
      }}
      onMouseEnter={() => {
        if (isHidden) {
          if (position.x < 0) setPosition(prev => ({ ...prev, x: 10 }));
          else setPosition(prev => ({ ...prev, x: window.innerWidth - 290 }));
          setIsHidden(false);
        }
      }}
      className={`fixed z-[1000] select-none group transition-all duration-300 ${isDragging ? 'shadow-2xl scale-105' : 'shadow-xl'}`}
    >
      {/* Draggable Header */}
      <div 
        onMouseDown={handleMouseDown}
        className="h-6 bg-slate-900/80 backdrop-blur rounded-t-xl cursor-move flex items-center justify-between px-3 text-white/20 hover:text-white/50 transition-colors"
      >
        <div className="w-4" /> {/* spacer */}
        <GripHorizontal size={14} />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsShowing(false);
          }}
          className="hover:text-rose-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Body */}
      <div className="relative w-[280px] h-[160px] bg-white rounded-b-xl overflow-hidden flex shadow-inner">
        
        {/* Toggle Skins Button */}
        <button 
          onClick={() => setSkin(SKINS[(SKINS.indexOf(skin) + 1) % SKINS.length])}
          className="absolute top-2 right-2 p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 z-10"
        >
          {skin === 'mp3' && <Music size={14} />}
          {skin === 'tape' && <CassetteTape size={14} />}
          {skin === 'vinyl' && <Disc size={14} />}
        </button>

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2 right-10 p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 z-10"
        >
          <Settings size={14} />
        </button>

        {/* --- Skins UI --- */}
        {skin === 'mp3' && (
          <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-br from-slate-50 to-slate-200">
             <div className="flex gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center text-white/10 italic font-black text-[10px]">COVER</div>
                <div className="flex-1 pt-1">
                   <p className="font-black text-xs text-slate-800 truncate">Song Name</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Artist Name</p>
                </div>
             </div>
             <div className="space-y-3">
                <div className="h-1 bg-slate-300 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 w-[40%]" />
                </div>
                <div className="flex justify-center items-center gap-6 text-slate-600">
                   <SkipBack size={18} fill="currentColor" />
                   <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white">
                      {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                   </button>
                   <SkipForward size={18} fill="currentColor" />
                </div>
             </div>
          </div>
        )}

        {skin === 'tape' && (
          <div className="flex-1 p-4 bg-[#FFB347] flex flex-col justify-end relative overflow-hidden group/tape transition-all">
             {/* Tape Holes */}
             <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-8">
                <div className={`w-12 h-12 border-4 border-black/10 rounded-full ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                <div className={`w-12 h-12 border-4 border-black/10 rounded-full ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
             </div>
             <div className="bg-white/90 p-3 rounded-lg flex items-center justify-between border-b-4 border-black/10">
                <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-black text-black truncate uppercase">Retro Mixtape Vol.1</p>
                </div>
                <button onClick={() => setIsPlaying(!isPlaying)} className="text-black">
                   {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
             </div>
          </div>
        )}

        {skin === 'vinyl' && (
          <div className="flex-1 flex bg-slate-900 border-l-8 border-indigo-600">
             <div className="w-32 flex items-center justify-center relative">
                <div className={`w-28 h-28 bg-slate-800 rounded-full border-4 border-white/5 flex items-center justify-center relative ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }}>
                   <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-slate-900" />
                   {/* Grooves */}
                   <div className="absolute inset-2 border border-white/5 rounded-full" />
                   <div className="absolute inset-6 border border-white/5 rounded-full" />
                </div>
             </div>
             <div className="flex-1 p-5 flex flex-col justify-center gap-1">
                <p className="text-white font-black text-xs">SPINNING RECORD</p>
                <p className="text-white/40 text-[10px] font-bold">STYLUS ACTIVE</p>
                <div className="mt-4 flex gap-4 text-white/60">
                   <button onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? <Pause size={16}/> : <Play size={16}/>}</button>
                   <Volume2 size={16} />
                </div>
             </div>
          </div>
        )}

        {/* Real Music Service Widget Overlay */}
        {service !== 'mock' && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col pt-8">
            <iframe 
               src={service === 'netease' 
                 ? `https://music.163.com/outchain/player?type=0&id=${serviceId}&auto=0&height=430`
                 : `https://i.y.qq.com/n2/m/outchain/player/index.html?type=album&id=${serviceId}`
               }
               className="w-full h-full border-none"
               title="music-service"
            />
          </div>
        )}

        {/* Settings Overlay */}
        {showSettings && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur z-20 p-5 text-white animate-in fade-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-2">
                <h4 className="font-black text-xs uppercase tracking-widest leading-none">Settings</h4>
                <button onClick={() => setShowSettings(false)} className="hover:text-amber-500 transition-colors"><X size={14}/></button>
             </div>

             <div className="space-y-4 max-h-[110px] overflow-y-auto pr-1 flex flex-col custom-scrollbar">
                {/* Service Selection */}
                <div className="space-y-1.5">
                   <p className="text-[10px] font-black uppercase text-white/40">Music Service</p>
                   <div className="flex gap-1">
                      {['mock', 'netease', 'qq'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => setService(s)}
                          className={`flex-1 py-1 px-1 rounded-md text-[9px] font-bold border transition-all ${service === s ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                   </div>
                   {service !== 'mock' && (
                     <div className="space-y-1 mt-1">
                        <input 
                          type="text"
                          value={serviceId}
                          onChange={e => setServiceId(e.target.value)}
                          placeholder="List/Album ID"
                          className="w-full bg-white/10 border border-white/10 rounded-md px-2 py-1 text-[9px] font-bold outline-none focus:border-indigo-500"
                        />
                        <a 
                          href={service === 'netease' ? "https://music.163.com" : "https://y.qq.com"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[8px] text-indigo-400 hover:underline block text-center"
                        >
                          去{service === 'netease' ? '网易云' : 'QQ音乐'}官网登录以同步
                        </a>
                     </div>
                   )}
                </div>

                {/* Tab Visibility */}
                <div className="space-y-1.5">
                   <p className="text-[10px] font-black uppercase text-white/40">Visibility</p>
                   <div className="flex flex-wrap gap-1.5">
                      {['album', 'whisper', 'study', 'media', 'achievements', 'food', 'library', 'portal'].map(tab => (
                        <label key={tab} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[8px] font-bold cursor-pointer transition-all ${visibleTabs.includes(tab) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                           <input 
                             type="checkbox" 
                             checked={visibleTabs.includes(tab)}
                             onChange={() => setVisibleTabs(prev => prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab])}
                             className="hidden"
                           />
                           {tab.slice(0, 3).toUpperCase()}
                        </label>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}
