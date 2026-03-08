import React, { useState, useMemo, useRef } from 'react';
import { ChefHat, Flame, Salad, Utensils, UtensilsCrossed, ExternalLink, RefreshCw, ChevronDown, Check, Dices } from 'lucide-react';
import recipesData from './data/recipes.json';
import { meat, vegetable, tools, takeoutOptions } from './data/categories';

const COLORS = {
  primary: 'from-orange-400 to-red-400',
  text: 'text-orange-900',
  accent: 'bg-orange-500',
  light: 'bg-orange-50',
  border: 'border-orange-200'
};

const Wheel = ({ options, onSpinEnd }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState(null);

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSelected(null);
    
    // Calculate new rotation
    const spins = Math.floor(Math.random() * 5) + 5; // 5 to 10 full spins
    const degrees = Math.floor(Math.random() * 360);
    const finalRotation = rotation + (spins * 360) + degrees;
    
    setRotation(finalRotation);

    // Calculate selected item based on final rotation
    setTimeout(() => {
      setIsSpinning(false);
      const actualDeg = finalRotation % 360;
      const sliceAngle = 360 / options.length;
      const offsetData = (360 - actualDeg) % 360;
      const selectedIndex = Math.floor(offsetData / sliceAngle);
      
      const result = options[selectedIndex];
      setSelected(result);
      if (onSpinEnd) onSpinEnd(result);
    }, 4000); // 4 seconds animation
  };

  const sliceAngle = 360 / options.length;
  const gradientStops = options.map((_, i) => {
    const color = i % 2 === 0 ? '#f97316' : '#ffedd5'; // orange-500: '#f97316', orange-100: '#ffedd5'
    return `${color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`;
  }).join(', ');

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative w-72 h-72 xl:w-80 xl:h-80 mb-8 mx-auto">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-10 w-6 h-8 bg-red-600 shadow-md" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
        
        {/* Wheel container */}
        <div 
          className="w-full h-full rounded-full border-[6px] border-orange-200 overflow-hidden shadow-xl transition-transform duration-[4000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] relative"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(${gradientStops})`
          }}
        >
          {options.map((opt, i) => {
            const centerAngle = (i * sliceAngle) + (sliceAngle / 2);
            return (
              <div 
                key={i} 
                className="absolute top-0 left-1/2 w-10 h-1/2 origin-bottom -translate-x-1/2 flex justify-center pt-6 text-[14px] xl:text-[16px] font-black tracking-tighter"
                style={{ transform: `rotate(${centerAngle}deg)` }}
              >
                <div className="text-center text-orange-950 drop-shadow-md">
                  {opt.split('').map((char, j) => <span key={j} className="block mb-1.5 leading-none">{char}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <button 
        onClick={spin}
        disabled={isSpinning}
        className={`px-10 py-3.5 rounded-full text-white font-black text-lg shadow-xl outline-none transition-all ${isSpinning ? 'bg-slate-300' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:scale-105 active:scale-95'}`}
      >
        {isSpinning ? '正在祈力...' : '抽个外卖'}
      </button>

      {selected && !isSpinning && (
        <div className="mt-8 px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 text-red-600 font-black text-lg rounded-3xl border-2 border-red-200 animate-in zoom-in slide-in-from-bottom-5 duration-300 shadow-sm">
          🎉 就吃这个：{selected}！
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center space-x-3 mb-4">
    <div className={`p-2 rounded-xl bg-gradient-to-br ${COLORS.primary} text-white shadow-sm`}>
      <Icon size={20} />
    </div>
    <div>
      <h2 className={`font-bold text-lg ${COLORS.text}`}>{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const WhatToEat = () => {
  const [step, setStep] = useState(1);
  const [selectedMeats, setSelectedMeats] = useState([]);
  const [selectedVegs, setSelectedVegs] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  
  // Handlers
  const toggleSelection = (item, list, setList, multi = true) => {
    if (!multi) {
      setList([item.name]);
      return;
    }
    if (list.includes(item.name)) {
      setList(list.filter(i => i !== item.name));
    } else {
      setList([...list, item.name]);
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else setStep(4); // Results
  };

  // Results computation
  const results = useMemo(() => {
    if (step < 4) return [];
    
    return recipesData.filter(recipe => {
      // Must contain at least one selected meat (if any meats were selected)
      const hasMeat = selectedMeats.length === 0 || selectedMeats.some(m => recipe.stuff.includes(m));
      // Must contain at least one selected veg (if any vegs were selected)
      const hasVeg = selectedVegs.length === 0 || selectedVegs.some(v => recipe.stuff.includes(v) || (v === '番茄' && recipe.stuff.includes('西红柿')));
      // Must use the selected tool
      const hasTool = !selectedTool || recipe.tools.includes(selectedTool);
      
      return hasMeat && hasVeg && hasTool;
    }).sort((a,b) => b.calories - a.calories); // Sort by calories descending or just random
  }, [step, selectedMeats, selectedVegs, selectedTool]);

  return (
    <div className="pt-16 pb-32 px-6 max-w-6xl mx-auto font-sans antialiased text-slate-800 tracking-tight">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 tracking-tight mb-4">
          今天吃啥？
        </h1>
        <p className="text-slate-500 text-sm font-bold">
          不知道吃什么？来这里做个决定吧！
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cooking Section */}
        <div className="lg:col-span-7 bg-white rounded-[3.5rem] p-12 shadow-sm border border-slate-100">
          <SectionHeader icon={ChefHat} title="自己动手，丰衣足食" subtitle="选择你有的食材，看看能做啥" />
          
          {step < 4 ? (
            <div className="space-y-6 mt-6">
              {/* Progress Steps */}
              <div className="flex justify-between items-center px-4 mb-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${step >= i ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {step > i ? <Check size={16} /> : i}
                    </div>
                    <span className="text-[10px] mt-1 text-slate-400 font-medium">
                      {i === 1 ? '肉类' : i === 2 ? '蔬菜' : '厨具'}
                    </span>
                  </div>
                ))}
                
                <div className="absolute left-1/2 -translate-x-1/2 w-48 h-[2px] bg-slate-100 -z-10 top-8"></div>
                <div className="absolute left-[30%] w-24 h-[2px] bg-orange-500 transition-all duration-300 -z-10 top-8" style={{ width: `${(step - 1) * 35}%` }}></div>
              </div>

              {/* Step 1: Meat */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1 flex items-center">
                    <Flame className="w-4 h-4 mr-1 text-red-400" /> 选择你想吃的肉类 (多选)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {meat.map(m => (
                      <button 
                        key={m.name}
                        onClick={() => toggleSelection(m, selectedMeats, setSelectedMeats)}
                        className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                          selectedMeats.includes(m.name) 
                            ? 'bg-orange-100 text-orange-700 border-orange-200 border shadow-sm ring-2 ring-orange-500/20' 
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m.emoji} {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Veg */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1 flex items-center">
                    <Salad className="w-4 h-4 mr-1 text-green-500" /> 搭配点什么蔬菜？(多选)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {vegetable.map(v => (
                      <button 
                        key={v.name}
                        onClick={() => toggleSelection(v, selectedVegs, setSelectedVegs)}
                        className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                          selectedVegs.includes(v.name) 
                            ? 'bg-orange-100 text-orange-700 border-orange-200 border shadow-sm ring-2 ring-orange-500/20' 
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {v.emoji} {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Tool */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1 flex items-center">
                    <UtensilsCrossed className="w-4 h-4 mr-1 text-slate-500" /> 手头有什么厨具？(单选)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tools.map(t => (
                      <button 
                        key={t.name}
                        onClick={() => setSelectedTool(t.name === selectedTool ? '' : t.name)}
                        className={`px-4 py-3 w-full text-left rounded-2xl text-sm font-medium transition-all ${
                          selectedTool === t.name 
                            ? 'bg-orange-100 text-orange-700 border-orange-200 border shadow-sm ring-2 ring-orange-500/20' 
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-between">
                {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                    退回
                  </button>
                )}
                <button 
                  onClick={handleNext}
                  className="ml-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {step === 3 ? '查看菜谱' : '下一步'}
                </button>
              </div>
            </div>
          ) : (
            // Results View
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">
                  匹配到 {results.length} 道菜
                </h3>
                <button 
                  onClick={() => { setStep(1); setSelectedMeats([]); setSelectedVegs([]); setSelectedTool(''); }}
                  className="flex items-center text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <RefreshCw size={12} className="mr-1" /> 重选
                </button>
              </div>

              {results.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pb-2">
                  {results.slice(0, 20).map((recipe, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-100 to-transparent opacity-50 rounded-bl-[100px] -z-10"></div>
                      
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-extrabold text-slate-800 leading-tight pr-12">{recipe.name}</h4>
                        <div className="absolute top-4 right-4 flex flex-col items-end">
                          <span className="inline-block bg-white text-[10px] font-bold text-orange-600 px-2 py-1 rounded-lg border border-orange-100 shadow-sm whitespace-nowrap">
                            🔥 ~{recipe.calories} kcal
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {recipe.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] bg-slate-200/50 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">{tag}</span>
                        ))}
                        <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-medium border border-red-100/50">{recipe.difficulty}</span>
                      </div>
                      
                      <p className="text-xs text-slate-500 mb-3 truncate leading-relaxed">
                        <span className="font-semibold text-slate-600 mr-1">食材:</span>
                        {recipe.stuff.join('、')}
                      </p>
                      
                      {recipe.bv && (
                        <a 
                          href={`https://www.bilibili.com/video/${recipe.bv}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.813 4.653h.854c1.51 0 2.733 1.223 2.733 2.733v9.827c0 1.51-1.224 2.733-2.733 2.733H5.333c-1.51 0-2.733-1.224-2.733-2.733V7.387c0-1.51 1.224-2.733 2.733-2.733h.853l-1.84-2.208a.666.666 0 111.026-.853l2.36 2.84h8.534l2.36-2.84a.667.667 0 111.026.853l-1.84 2.208zM5.333 6h13.334c.764 0 1.386.622 1.386 1.387v9.826c0 .765-.622 1.387-1.386 1.387H5.333c-.764 0-1.386-.622-1.386-1.387V7.387C3.947 6.622 4.569 6 5.333 6zM8 10.667a.667.667 0 011.333 0v1.333a.667.667 0 01-1.333 0v-1.333zm6.667 0a.667.667 0 011.333 0v1.333a.667.667 0 01-1.333 0v-1.333z"/>
                          </svg>
                          去 B站 观看做法
                        </a>
                      )}
                    </div>
                  ))}
                  {results.length > 20 && (
                    <div className="text-center pt-2">
                       <span className="text-xs text-slate-400 font-medium">仅显示前 20 个结果...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <span className="text-4xl mb-3 block">🧐</span>
                  <p className="text-slate-500 font-medium text-sm">抱歉，没有找到完全匹配的菜品。<br/>尝试减少条件限制吧！</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Takeout Roulette Section */}
        <div className="lg:col-span-5 bg-white rounded-[3.5rem] p-8 xl:p-10 shadow-sm border border-slate-100 relative overflow-hidden h-fit flex flex-col justify-center">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-red-100 to-transparent rounded-full opacity-50 pointer-events-none"></div>
          
          <SectionHeader icon={Dices} title="懒得做，就点外卖！" subtitle="命运的转盘，帮你决定今天的快活时刻" />
          
          <div className="mt-8 flex-1 w-full flex items-center justify-center">
            <Wheel options={takeoutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatToEat;
