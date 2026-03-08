import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Upload, ChevronLeft, ChevronRight, Menu, X, Download, Search, Globe, Loader2, BookMarked, Trash2, FolderOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import localforage from 'localforage';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// --- IndexedDB store via localforage ---
const bookshelfStore = localforage.createInstance({ name: 'love-space', storeName: 'bookshelf' });

// ─── FileViewer Component (Supports PDF & Images) ──────────────────────────────
const FileViewer = ({ book, onClose }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [toc, setToc] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState(null);
  const touchStartX = useRef(null);

  const isImage = book.type === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(book.title);

  // Load Content
  useEffect(() => {
    if (!book) return;
    setLoading(true);
    setCurrentPage(1);
    setImageUrl(null);
    setPdfDoc(null);

    const arrayBuffer = book.data instanceof ArrayBuffer ? book.data : book.data.buffer || book.data;

    if (isImage) {
      const blob = new Blob([arrayBuffer]);
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setLoading(false);
      return () => URL.revokeObjectURL(url);
    } else {
      // PDF
      pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(async (doc) => {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        try {
          const outline = await doc.getOutline();
          if (outline) {
            const items = outline.slice(0, 60).map(item => ({ title: item.title, dest: item.dest }));
            setToc(items);
          }
        } catch (_) {}
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [book, isImage]);

  // Render current page (PDF only)
  const renderPage = useCallback(async (pageNum) => {
    if (isImage || !pdfDoc || !canvasRef.current || !containerRef.current) return;
    const page = await pdfDoc.getPage(pageNum);
    const containerWidth = containerRef.current.clientWidth - 32;
    const viewport = page.getViewport({ scale: 1 });
    const scale = containerWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
  }, [pdfDoc, isImage]);

  useEffect(() => { if (!isImage) renderPage(currentPage); }, [renderPage, currentPage, isImage]);

  // Keyboard control
  useEffect(() => {
    if (isImage) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  // Mobile tap
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (isImage || touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) < 40) return;
    if (diff < 0) goNext(); else goPrev();
    touchStartX.current = null;
  };

  const handleCanvasClick = (e) => {
    if (isImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) goPrev();
    else if (x > rect.width * 0.65) goNext();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur z-50 flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <button onClick={() => !isImage && setDrawerOpen(true)} className={`p-2 transition-all ${isImage ? 'opacity-0 pointer-events-none' : 'text-white/70 hover:text-white'}`}><Menu size={22} /></button>
        <div className="text-center">
          <p className="text-white font-bold text-sm truncate max-w-xs">{book.title}</p>
          {!isImage && <p className="text-white/40 text-xs">{currentPage} / {totalPages}</p>}
        </div>
        <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-all"><X size={22} /></button>
      </div>

      {/* Content area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto flex justify-center px-4 py-4 bg-slate-800">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/40">
            <Loader2 size={40} className="animate-spin" />
          </div>
        ) : isImage ? (
          <img src={imageUrl} alt={book.title} className="max-w-full h-auto rounded-md shadow-2xl object-contain self-start" />
        ) : (
          <canvas ref={canvasRef} onClick={handleCanvasClick} className="rounded-md shadow-2xl cursor-pointer max-w-full" />
        )}
      </div>

      {/* Page controls (PC) - Hidden for Image */}
      {!isImage && (
        <div className="flex items-center justify-center gap-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={goPrev} disabled={currentPage <= 1} className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-bold disabled:opacity-30 hover:bg-white/20 transition-all">
            <ChevronLeft size={16} /> 上一页
          </button>
          <input
            type="number" min={1} max={totalPages} value={currentPage}
            onChange={e => setCurrentPage(Math.max(1, Math.min(totalPages, Number(e.target.value))))}
            className="w-16 text-center bg-white/10 border border-white/20 rounded-lg py-1.5 text-white text-sm outline-none focus:border-white/50"
          />
          <button onClick={goNext} disabled={currentPage >= totalPages} className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-bold disabled:opacity-30 hover:bg-white/20 transition-all">
            下一页 <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* TOC Drawer */}
      {!isImage && drawerOpen && (
        <div className="absolute inset-0 z-10 flex">
          <div className="w-72 bg-slate-900 border-r border-white/10 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/10">
              <h3 className="text-white font-black">目录</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-white/60 hover:text-white"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {toc.length === 0 ? (
                <p className="text-white/30 text-sm italic p-6">本文档没有目录</p>
              ) : toc.map((item, idx) => (
                <button key={idx} onClick={async () => {
                  if (pdfDoc && item.dest) {
                    try {
                      const dest = typeof item.dest === 'string' ? await pdfDoc.getDestination(item.dest) : item.dest;
                      const ref = await pdfDoc.getPageIndex(dest[0]);
                      setCurrentPage(ref + 1);
                    } catch (_) {}
                  }
                  setDrawerOpen(false);
                }} className="w-full text-left px-6 py-3 text-white/70 hover:bg-white/10 hover:text-white text-sm transition-all border-b border-white/5 truncate">
                  {item.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}
    </div>
  );
};


// --- Web Scraper Helpers ---
const isProd = import.meta.env.PROD;
// Use a public CORS proxy for production (gh-pages)
const CORS_PROXY = 'https://corsproxy.io/?';

const SCRAPE_TARGETS = [
  { label: '全国大学生数学竞赛 - 初赛', path: '/csst/', defaultGroup: '全国大学生数学竞赛初赛' },
  { label: '全国大学生数学竞赛 - 决赛', path: '/jsst/', defaultGroup: '全国大学生数学竞赛决赛' },
];

async function fetchDoc(url) {
  // In production, wrap the Target URL with a CORS proxy
  const targetUrl = isProd ? CORS_PROXY + encodeURIComponent(url) : url.replace('https://www.cmathc.org.cn', '/api');
  const res = await fetch(targetUrl);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function classifyExamGroup(text, url, defaultGroup) {
  const t = (text + url).toLowerCase();
  if (t.includes('初赛') || t.includes('chusai')) return '全国大学生数学竞赛初赛';
  if (t.includes('决赛') || t.includes('juesai')) return '全国大学生数学竞赛决赛';
  return defaultGroup;
}

// Scrape both PDFs and Images
async function scrapeExamFiles(target, onProgress) {
  const { path: pathPrefix, defaultGroup } = target;
  const siteBase = 'https://www.cmathc.org.cn';

  onProgress('获取目录页...');
  const indexDoc = await fetchDoc(siteBase + pathPrefix);
  const articleLinks = Array.from(indexDoc.querySelectorAll('a[href]'))
    .map(a => ({ href: a.getAttribute('href'), text: (a.textContent || '').trim() }))
    .filter(({ href }) => {
      if (!href) return false;
      const h = href.toLowerCase();
      return (h.includes(pathPrefix) || (h.match(/\d+\.html$/) && !h.includes('/'))) &&
             h.endsWith('.html') && !h.includes('sitemap');
    })
    .map(({ href, text }) => ({
      url: href.startsWith('http') ? href : (href.startsWith('/') ? siteBase + href : siteBase + pathPrefix + href),
      title: text,
    }));

  onProgress('发现 ' + articleLinks.length + ' 个文章页，寻取文件...');

  const results = [];
  const seenUrls = new Set();

  for (const article of articleLinks) {
    try {
      onProgress('探测: ' + article.title.slice(0, 30));
      const articleDoc = await fetchDoc(article.url);

      // Find both PDFs and common Exam Images
      const links = Array.from(articleDoc.querySelectorAll('a[href], img[src]'));
      
      for (const el of links) {
        let rawUrl = el.tagName === 'A' ? el.getAttribute('href') : el.getAttribute('src');
        if (!rawUrl) continue;

        const isPdf = rawUrl.toLowerCase().endsWith('.pdf');
        const isImg = /\.(jpg|jpeg|png|webp)$/i.test(rawUrl);
        if (!isPdf && !isImg) continue;

        const originalUrl = rawUrl.startsWith('http') ? rawUrl :
          (rawUrl.startsWith('/') ? siteBase + rawUrl : siteBase + pathPrefix + rawUrl);

        if (seenUrls.has(originalUrl)) continue;
        seenUrls.add(originalUrl);

        const type = isPdf ? 'pdf' : 'image';
        const linkText = (el.textContent || '').trim();
        const filename = decodeURIComponent(originalUrl.split('/').pop().replace(/\.(pdf|jpg|jpeg|png|webp)$/i, ''));
        const title = filename.length > 10 ? filename : (linkText.length > 5 ? linkText : (article.title || filename));
        const group = classifyExamGroup(title + ' ' + filename, originalUrl, defaultGroup);

        results.push({ href: originalUrl, title, group, type });
      }
    } catch (_) {}
  }
  return results;
}

async function downloadFile(url) {
  const targetUrl = isProd ? CORS_PROXY + encodeURIComponent(url) : url.replace('https://www.cmathc.org.cn/static', '/api/static');
  const res = await fetch(targetUrl);
  if (!res.ok) return null;
  return res.arrayBuffer();
}

async function scrapeCustomUrl(rawUrl, group) {
  const targetUrl = isProd ? CORS_PROXY + encodeURIComponent(rawUrl) : rawUrl;
  const res = await fetch(targetUrl);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const base = new URL(rawUrl);
  const links = Array.from(doc.querySelectorAll('a[href]'));
  const results = [];
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    const isPdf = href.toLowerCase().endsWith('.pdf');
    const isImg = /\.(jpg|jpeg|png|webp)$/i.test(href);
    if (!isPdf && !isImg) continue;

    let fullUrl;
    try { fullUrl = new URL(href, base).href; } catch { continue; }
    const text = (a.textContent || '').trim() || fullUrl.split('/').pop();
    results.push({ href: fullUrl, title: text, group, type: isPdf ? 'pdf' : 'image' });
  }
  return results;
}



// ─── Main Library Component ───────────────────────────────────────────────────
const Library = () => {
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [groups, setGroups] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [customUrl, setCustomUrl] = useState('');
  const [customGroup, setCustomGroup] = useState('');
  const [customScraping, setCustomScraping] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const fileInputRef = useRef(null);

  // Load bookshelf from IndexedDB
  const loadBooks = useCallback(async () => {
    const keys = await bookshelfStore.keys();
    const loaded = await Promise.all(keys.map(k => bookshelfStore.getItem(k)));
    setBooks(loaded.filter(Boolean));
  }, []);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  // Group books
  useEffect(() => {
    const grouped = {};
    books.forEach(b => {
      const g = b.group || '我的书架';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(b);
    });
    setGroups(grouped);
    setExpandedGroups(prev => {
      const next = { ...prev };
      Object.keys(grouped).forEach(g => { if (!(g in next)) next[g] = true; });
      return next;
    });
  }, [books]);

  // Upload handler (Supports PDF & Images)
  const handleUpload = async (e) => {
    setUploadError('');
    const files = Array.from(e.target.files);
    for (const file of files) {
      const isPdf = file.name.match(/\.(pdf)$/i);
      const isImg = file.name.match(/\.(jpg|jpeg|png|webp)$/i);
      if (!isPdf && !isImg) { setUploadError('不支持的文件内容 (请上传 PDF 或 图片)'); continue; }
      
      const data = await file.arrayBuffer();
      const id = `book_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const type = isPdf ? 'pdf' : 'image';
      const bookMeta = { id, title: file.name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, ''), group: '我的书架', size: file.size, addedAt: Date.now(), data, type };
      await bookshelfStore.setItem(id, bookMeta);
    }
    await loadBooks();
    fileInputRef.current.value = '';
  };

  // Delete book
  const deleteBook = async (id) => {
    await bookshelfStore.removeItem(id);
    await loadBooks();
  };

  // Preset scraper handler (cmathc exam PDFs - two-level crawl)
  const handleScrape = async () => {
    setScraping(true);
    setScrapeMsg('正在分析页面结构...');
    let added = 0;
    for (const target of SCRAPE_TARGETS) {
      try {
        const files = await scrapeExamFiles(target, (msg) => setScrapeMsg(msg));
        setScrapeMsg('共找到 ' + files.length + ' 个文件，开始下载...');
        for (const file of files) {
          try {
            setScrapeMsg('下载: ' + file.title.slice(0, 40));
            const data = await downloadFile(file.href);
            if (!data) continue;
            const id = 'scraped_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            await bookshelfStore.setItem(id, {
              id, title: file.title, group: file.group,
              size: data.byteLength, addedAt: Date.now(), data, sourceUrl: file.href,
              type: file.type
            });
            added++;
          } catch (_) {}
        }
      } catch (err) {
        setScrapeMsg(target.label + ' 失败: ' + err.message);
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    await loadBooks();
    setScraping(false);
    setScrapeMsg('完成！新增 ' + added + ' 个试卷');
    setTimeout(() => setScrapeMsg(''), 6000);
  };


  // Custom URL scraper handler
  const handleCustomScrape = async () => {
    if (!customUrl.trim()) return;
    setCustomScraping(true);
    setCustomMsg('正在获取页面...');
    try {
      const group = customGroup.trim() || '自定义采集';
      const links = await scrapeCustomUrl(customUrl.trim(), group);
      setCustomMsg('发现 ' + links.length + ' 个文件，下载中...');
      let added = 0;
      for (const link of links) {
        try {
          setCustomMsg('下载: ' + link.title.slice(0, 40));
          const data = await downloadFile(link.href);
          if (!data) continue;
          const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2);
          await bookshelfStore.setItem(id, {
            id, title: link.title, group: link.group,
            size: data.byteLength, addedAt: Date.now(), data, sourceUrl: link.href,
            type: link.type
          });
          added++;
        } catch (_) {}
      }
      await loadBooks();
      setCustomMsg('完成！新增 ' + added + ' 个文件');
    } catch (err) {
      setCustomMsg('失败: ' + err.message);
    }
    setCustomScraping(false);
    setTimeout(() => setCustomMsg(''), 5000);
  };

  const formatSize = (bytes) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

  return (
    <>
      {activeBook && <FileViewer book={activeBook} onClose={() => setActiveBook(null)} />}

      <div className="pt-16 pb-32 px-6 max-w-6xl mx-auto font-sans antialiased text-slate-800 tracking-tight">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 tracking-tight mb-4">在线书库</h1>
          <p className="text-slate-500 text-sm font-bold">上传并在线阅读，或一键采集学术期刊</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Bookshelf */}
          <div className="lg:col-span-8 space-y-6">
            {Object.keys(groups).length === 0 ? (
              <div className="bg-white rounded-[3.5rem] p-16 text-center shadow-sm border border-slate-100">
                <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">书架还是空的</p>
                <p className="text-slate-300 text-sm mt-1">上传 PDF 文件或使用右侧爬虫采集期刊</p>
              </div>
            ) : Object.entries(groups).map(([groupName, groupBooks]) => (
              <div key={groupName} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-all"
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen size={18} className="text-emerald-500" />
                    <span className="font-black text-slate-700">{groupName}</span>
                    <span className="text-xs bg-emerald-50 text-emerald-500 font-bold px-2 py-0.5 rounded-full">{groupBooks.length}</span>
                  </div>
                  {expandedGroups[groupName] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {expandedGroups[groupName] && (
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {groupBooks.map(book => (
                      <div key={book.id} className="flex items-center gap-4 px-8 py-5 hover:bg-slate-50 transition-all group">
                        <div className="w-10 h-12 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                          <BookMarked size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 truncate text-sm">{book.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatSize(book.size)} · {new Date(book.addedAt).toLocaleDateString()}</p>
                          {book.sourceUrl && (
                            <a href={book.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-teal-500 flex items-center gap-1 mt-0.5 hover:underline">
                              <ExternalLink size={10} /> 来源链接
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setActiveBook(book)} className="px-4 py-2 text-xs font-black text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all">阅读</button>
                          <button onClick={() => deleteBook(book.id)} className="p-2 text-slate-300 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: Upload + Scraper */}
          <div className="lg:col-span-4 space-y-6">
            {/* Upload */}
            <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-700 flex items-center gap-2 mb-6"><Upload size={16} className="text-emerald-500" /> 上传 PDF / 图片</h3>
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" multiple onChange={handleUpload} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-emerald-200 rounded-[2rem] cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                <Upload size={24} className="text-emerald-300 mb-2" />
                <span className="text-sm font-bold text-emerald-400">点击选择 PDF 文件</span>
                <span className="text-xs text-slate-400 mt-1">支持多文件同时上传</span>
              </label>
              {uploadError && <p className="text-red-400 text-xs font-bold mt-3">{uploadError}</p>}
            </div>

            {/* Preset Scraper */}
            <div className="bg-slate-800 rounded-[3rem] p-8 text-white shadow-xl">
              <h3 className="font-black flex items-center gap-2 mb-2"><Globe size={16} className="text-teal-400" /> 学术期刊试题采集</h3>
              <p className="text-white/40 text-xs mb-5">一键爬取初赛/决赛试题 PDF，按年份分组入库</p>

              <div className="space-y-3 mb-5">
                {SCRAPE_TARGETS.map((t, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-white/10">
                    <p className="text-xs font-bold mb-1">{t.label}</p>
                    <p className="text-white/40 text-[10px]">{t.group} / 初赛试题</p>
                    <p className="text-white/40 text-[10px]">{t.group} / 决赛试题</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleScrape}
                disabled={scraping}
                className="w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scraping ? <><Loader2 size={16} className="animate-spin" /> 采集中...</> : <><Search size={16} /> 一键采集试题</>}
              </button>

              {scrapeMsg && (
                <p className="text-teal-300 text-xs font-bold mt-4 text-center break-all">{scrapeMsg}</p>
              )}
            </div>

            {/* Custom URL Scraper */}
            <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-700 flex items-center gap-2 mb-2"><Globe size={16} className="text-emerald-500" /> 自定义网址采集</h3>
              <p className="text-slate-400 text-xs mb-5">输入任意网址，自动提取页面中的 PDF 链接下载</p>
              <div className="space-y-3">
                <input
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/papers/"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400 transition-all"
                />
                <input
                  value={customGroup}
                  onChange={e => setCustomGroup(e.target.value)}
                  placeholder="书架分组名（如：高中数学竞赛）"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400 transition-all"
                />
                <button
                  onClick={handleCustomScrape}
                  disabled={customScraping || !customUrl.trim()}
                  className="w-full py-3 rounded-2xl font-black text-sm bg-emerald-500 text-white transition-all hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {customScraping ? <><Loader2 size={14} className="animate-spin" /> 采集中...</> : <><Search size={14} /> 开始采集</>}
                </button>
                {customMsg && <p className="text-emerald-600 text-xs font-bold text-center break-all mt-2">{customMsg}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Library;
