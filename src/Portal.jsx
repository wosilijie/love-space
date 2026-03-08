import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Folder, Plus, X, ExternalLink, MessageSquare, Send, Sparkles, Move, Heart } from 'lucide-react';

const STICKER_PALETTE = [
  'bg-white', 'bg-yellow-50', 'bg-blue-50', 'bg-emerald-50', 'bg-pink-50', 'bg-indigo-50'
];

const NavigationSticker = ({ label, icon: Icon, onClick, rotation, style }) => (
  <button
    onClick={onClick}
    style={{ transform: `rotate(${rotation}deg)`, ...style }}
    className={`absolute p-5 rounded-2xl shadow-lg border border-slate-100 hover:scale-110 active:scale-95 transition-all group flex flex-col items-center gap-2 bg-white`}
  >
    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
      <Icon size={24} />
    </div>
    <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">{label}</span>
    {/* Sticker Texture */}
    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-slate-200/20 to-transparent pointer-events-none" />
  </button>
);

const BookmarkItem = ({ item, onDragStart, onDragOver, onDrop, onOpen, isSelecting }) => {
  const rotation = useRef(Math.random() * 8 - 4).current;
  const isFolder = !!item.children;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragOver={(e) => onDragOver(e, item)}
      onDrop={(e) => onDrop(e, item)}
      onClick={() => isFolder ? onOpen(item.id) : null}
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`relative p-4 rounded-xl shadow-md border bg-white cursor-pointer group hover:shadow-xl transition-all w-28 h-28 flex flex-col items-center justify-center gap-2 ${isSelecting ? 'ring-2 ring-indigo-500' : ''}`}
    >
      {isFolder ? (
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
          <Folder size={24} fill="currentColor" />
        </div>
      ) : (
        <>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
            <Globe size={24} />
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 opacity-0"
          />
        </>
      )}
      <span className="text-[10px] font-bold text-slate-600 text-center truncate w-full px-1">{item.name}</span>
    </div>
  );
};

const FolderModal = ({ folder, onClose, onRename, onRemoveItem }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(folder.name);

  const handleRename = () => {
    onRename(folder.id, tempName);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-all"><X size={24} /></button>
        
        <div className="mb-8 flex items-center gap-3 group/title">
          <Folder className="text-indigo-500" fill="currentColor"/>
          {isEditing ? (
            <input 
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="text-2xl font-black text-slate-800 outline-none border-b-2 border-indigo-500 bg-transparent"
            />
          ) : (
            <h3 
              onClick={() => setIsEditing(true)}
              className="font-black text-2xl text-slate-800 cursor-pointer hover:text-indigo-600 flex items-center gap-2"
            >
              {folder.name} <Plus size={14} className="opacity-0 group-hover/title:opacity-100 text-slate-300 rotate-45" />
            </h3>
          )}
        </div>

        <div className="grid grid-cols-4 gap-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {folder.children.map(child => (
            <div
              key={child.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('itemId', child.id);
                e.dataTransfer.setData('sourceFolderId', folder.id);
              }}
              className="p-6 bg-slate-50 rounded-2xl flex flex-col items-center gap-3 cursor-pointer hover:bg-indigo-50 transition-all border-2 border-transparent hover:border-indigo-100 group relative"
            >
              <Globe size={24} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{child.name}</span>
              <a href={child.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0" />
            </div>
          ))}
        </div>
        <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center italic">Tip: Drag items out of the window to remove them from folder</p>
      </div>
    </div>
  );
};

export default function Portal({ onTabChange }) {
  const [bookmarks, setBookmarks] = useState([
    { id: '1', name: 'Google', url: 'https://google.com' },
    { id: '2', name: 'GitHub', url: 'https://github.com' },
    { id: '3', name: 'Bilibili', url: 'https://bilibili.com' },
  ]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAi, setShowAi] = useState(false);
  const [messages, setMessages] = useState([
    { id: '1', role: 'ai', text: '你好！我是 DeepSeek AI。在这里你可以问我关于爱情、生活或者任何代码问题。' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Drag and drop logic for folders
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('itemId', item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('itemId');
    if (sourceId === targetItem.id) return;

    setBookmarks(prev => {
      const source = prev.find(i => i.id === sourceId);
      const target = prev.find(i => i.id === targetItem.id);
      
      if (!source || !target) return prev;

      // If target is already a folder, add to it
      if (target.children) {
        return prev.filter(i => i.id !== sourceId).map(i => 
          i.id === target.id ? { ...i, children: [...i.children, source] } : i
        );
      } else {
        // Create new folder
        const newFolder = {
          id: `folder_${Date.now()}`,
          name: '新文件夹',
          children: [target, source]
        };
        return prev.filter(i => i.id !== sourceId && i.id !== targetItem.id).concat(newFolder);
      }
    });
  };

  const handleDropRoot = (e) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('itemId');
    const sourceFolderId = e.dataTransfer.getData('sourceFolderId');
    
    if (!sourceFolderId) return; // Only care about items coming OUT of folders

    setBookmarks(prev => {
      const folder = prev.find(i => i.id === sourceFolderId);
      if (!folder || !folder.children) return prev;
      
      const item = folder.children.find(c => c.id === sourceId);
      if (!item) return prev;

      // Filter out item from folder
      const updatedFolder = {
        ...folder,
        children: folder.children.filter(c => c.id !== sourceId)
      };

      // If folder is now empty or has 1 item, dissolve it? 
      // User asked to "拆成单独链接", let's just move it out.
      
      let newBookmarks = prev.map(i => i.id === sourceFolderId ? updatedFolder : i);
      
      // If folder only has one item left, dissolve it
      if (updatedFolder.children.length === 1) {
        const lastItem = updatedFolder.children[0];
        newBookmarks = newBookmarks.filter(i => i.id !== sourceFolderId).concat(lastItem);
      } else if (updatedFolder.children.length === 0) {
        newBookmarks = newBookmarks.filter(i => i.id !== sourceFolderId);
      }

      return newBookmarks.concat(item);
    });
    setActiveFolderId(null);
  };

  const handleRenameFolder = (id, newName) => {
    setBookmarks(prev => prev.map(i => i.id === id ? { ...i, name: newName } : i));
  };

  const handleBingSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.open(`https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: inputMessage };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: `这是一条来自 DeepSeek 的模拟回复。我正在思考如何更好地回答：'${userMsg.text}'。在正式版本中，您可以接通 API 获取实时回复。` 
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div 
      className="min-h-screen bg-[#FFFDF9] relative p-10 overflow-hidden font-sans"
      onDragOver={handleDragOver}
      onDrop={handleDropRoot}
    >
      {/* Background Decors (Scrapbook feel) */}
      <div className="absolute top-10 right-20 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Bing Search Paper */}
      <div className="max-w-2xl mx-auto mt-20 relative z-20" style={{ transform: 'rotate(-1deg)' }}>
        <div className="bg-white p-8 shadow-2xl rounded-sm border-t-8 border-indigo-400 relative">
          <div className="absolute -top-12 left-10 flex gap-1">
             <div className="w-1.5 h-16 bg-slate-300/40 rounded-full" />
             <div className="w-1.5 h-16 bg-slate-300/40 rounded-full" />
          </div>
          <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Search size={14} /> Integrated Search
          </h2>
          <form onSubmit={handleBingSearch} className="relative flex items-center gap-4">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything with Bing..." 
              className="flex-1 bg-slate-50 border-none px-6 py-4 rounded-xl text-lg font-bold outline-none ring-2 ring-slate-100 focus:ring-indigo-200 transition-all placeholder:text-slate-300 text-slate-800"
            />
            <button className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black hover:bg-slate-800 transition-all active:scale-95">GO</button>
          </form>
        </div>
      </div>

      {/* Bookmarks Section */}
      <div className="max-w-5xl mx-auto mt-24">
        <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em] mb-8 text-center">My Bookmarks · Drag to Group</h3>
        <div className="flex flex-wrap justify-center gap-10">
          {bookmarks.map(item => (
            <BookmarkItem 
              key={item.id} 
              item={item} 
              onDragStart={handleDragStart} 
              onDragOver={handleDragOver} 
              onDrop={handleDrop} 
              onOpen={setActiveFolderId}
            />
          ))}
          <button className="w-28 h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 hover:border-indigo-400 hover:text-indigo-400 transition-all group">
            <Plus size={32} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Folder Modal */}
      {activeFolderId && (
        <FolderModal 
          folder={bookmarks.find(f => f.id === activeFolderId)} 
          onClose={() => setActiveFolderId(null)}
          onRename={handleRenameFolder}
        />
      )}

      {/* Floating DeepSeek AI Toggle Sticker */}
      <div 
        onClick={() => setShowAi(!showAi)}
        style={{ transform: 'rotate(5deg)' }}
        className="fixed bottom-10 right-10 z-[100] cursor-pointer group"
      >
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 hover:scale-110 active:scale-95 transition-all">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 ring-1 ring-white/20">
            <Sparkles size={24} />
          </div>
          <div className="pr-4">
             <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">DeepSeek AI</div>
             <div className="font-bold text-sm">Ask anything...</div>
          </div>
        </div>
      </div>

      {/* DeepSeek Panel */}
      {showAi && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.1)] z-[101] flex flex-col border-l border-slate-100 translate-x-0 animate-in slide-in-from-right duration-500">
           <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center font-black">DS</div>
                <div>
                  <h4 className="font-black text-slate-800">DeepSeek Chat</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Always Online</p>
                </div>
              </div>
              <button onClick={() => setShowAi(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><X size={20}/></button>
           </div>
           
           <div className="flex-1 p-8 overflow-y-auto space-y-6 flex flex-col">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${msg.role === 'ai' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    {msg.role === 'ai' ? 'DS' : 'ME'}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed font-bold shadow-sm ${msg.role === 'ai' ? 'bg-slate-50 text-slate-700 rounded-tl-none' : 'bg-indigo-500 text-white rounded-tr-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 text-xs font-black animate-pulse">DS</div>
                  <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none text-slate-400 font-bold italic text-xs">DeepSeek 正在思考...</div>
                </div>
              )}
           </div>

           <div className="p-8 border-t border-slate-50 bg-slate-50/50">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 pr-16 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold shadow-sm"
                />
                <button type="submit" disabled={!inputMessage.trim() || isTyping} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50">
                  <Send size={18} />
                </button>
              </form>
           </div>
        </div>
      )}

      {/* Floating Navigation Stickers */}
      <NavigationSticker 
        label="纪念册" 
        icon={Heart} 
        onClick={() => onTabChange('home')}
        rotation={-12}
        style={{ top: '15%', left: '8%' }}
      />
      <NavigationSticker 
        label="自习室" 
        icon={Globe} 
        onClick={() => onTabChange('study')}
        rotation={15}
        style={{ top: '65%', left: '12%' }}
      />
      <NavigationSticker 
        label="悄悄话" 
        icon={MessageSquare} 
        onClick={() => onTabChange('whisper')}
        rotation={-8}
        style={{ top: '40%', right: '10%' }}
      />
      <NavigationSticker 
        label="吃啥" 
        icon={Search} 
        onClick={() => onTabChange('food')}
        rotation={10}
        style={{ bottom: '15%', right: '25%' }}
      />

    </div>
  );
}
