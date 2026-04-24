import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, Save, Trash2, Layout, Table as TableIcon, BarChart3, 
  FileUp, ChevronUp, ChevronDown, Sparkles, Clock, Settings2, 
  X, Copy, HardDrive, FileText, ChevronRight, PanelLeftClose, PanelLeftOpen, Maximize, Edit3
} from 'lucide-react';

// ==========================================
// CẤU HÌNH FIREBASE - VUI LÒNG ĐIỀN TẠI ĐÂY
// ==========================================
const myManualFirebaseConfig = {
  apiKey: "AIzaSyD0s59u68kj-PmaAQGU-pC3nomLIYTOdDM",
  authDomain: "digitalreport-20f71.firebaseapp.com",
  projectId: "digitalreport-20f71",
  storageBucket: "digitalreport-20f71.firebasestorage.app",
  messagingSenderId: "322693622756",
  appId: "1:322693622756:web:e73be2cf3fc31b1f80f5f1"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : myManualFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pp-report-pro-169';

export default function App() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [slides, setSlides] = useState([
    { 
      id: '1', 
      type: 'table', 
      title: 'BÁO CÁO TỔNG QUAN HIỆU SUẤT DIGITAL',
      subtitle: 'DIGITAL PERFORMANCE STRATEGY 2024',
      pageLabel: 'PAGE 01',
      footerLeft: 'Confidential Report',
      footerRight: 'Digital v3.0',
      content: { data: [['STT', 'KÊNH QUẢNG CÁO', 'NGÂN SÁCH', 'KPI TARGET', 'ROI THỰC TẾ', 'NHẬN ĐỊNH'], ['1', 'Facebook Ads', '120,000,000', '4,500 Lead', '3.2x', 'Tối ưu tốt'], ['2', 'Google Search', '85,000,000', '1,200 Conv', '4.5x', 'Hiệu quả cao']], config: {} } 
    }
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [reportName, setReportName] = useState("BÁO CÁO CHIẾN LƯỢC DIGITAL QUÝ 2");
  const [showDrive, setShowDrive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState([]);

  // Auth & Sync
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error(err); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const reportRef = doc(db, 'artifacts', appId, 'public', 'data', 'reports', 'currentReport');
    return onSnapshot(reportRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.slides) setSlides(JSON.parse(data.slides));
        if (data.name) setReportName(data.name);
      }
    });
  }, [user]);

  const saveReport = async (isNewVersion = false) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const data = { name: reportName, slides: JSON.stringify(slides), updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', 'currentReport'), data);
      if (isNewVersion) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'versions'), { ...data, versionName: `Version ${new Date().toLocaleString()}` });
      }
    } catch (e) { console.error(e); }
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleSlideUpdate = (field, value) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex][field] = value;
    setSlides(newSlides);
  };

  const handleTableUpdate = (rIdx, cIdx, val) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex].content.data[rIdx][cIdx] = val;
    
    // Auto-pagination logic (max 10 rows per slide)
    if (newSlides[currentSlideIndex].content.data.length > 11) {
      const header = newSlides[currentSlideIndex].content.data[0];
      const excess = newSlides[currentSlideIndex].content.data.slice(11);
      newSlides[currentSlideIndex].content.data = newSlides[currentSlideIndex].content.data.slice(0, 11);
      const nextSlide = {
        ...newSlides[currentSlideIndex],
        id: Date.now().toString(),
        pageLabel: `PAGE ${parseInt(newSlides[currentSlideIndex].pageLabel.split(' ')[1]) + 1}`,
        content: { data: [header, ...excess], config: {} }
      };
      newSlides.splice(currentSlideIndex + 1, 0, nextSlide);
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
    setSlides(newSlides);
  };

  const addSlide = (type) => {
    const newSlide = {
      id: Date.now().toString(),
      type,
      title: 'TIÊU ĐỀ BÁO CÁO MỚI',
      subtitle: 'PHÂN TÍCH CHUYÊN SÂU - DIGITAL REPORT',
      pageLabel: `PAGE ${slides.length + 1}`,
      footerLeft: 'Confidential Report',
      footerRight: 'Digital v3.0',
      content: type === 'table' ? { data: [['CỘT 1', 'CỘT 2', 'CỘT 3']], config: {} } : { analysis: "", context: "" }
    };
    const updated = [...slides, newSlide];
    setSlides(updated);
    setCurrentSlideIndex(updated.length - 1);
  };

  const runAIAnalysis = async () => {
    if (!selectedFile && !slides[currentSlideIndex].content.context) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const newSlides = [...slides];
      newSlides[currentSlideIndex].content.analysis = `[PHÂN TÍCH CHIẾN LƯỢC TỪ CHUYÊN GIA]\n\n• Dựa trên số liệu file ${selectedFile?.name || 'Manual Context'}, hiệu quả chuyển đổi tăng 18%.\n• CPA trung bình đang ở mức thấp kỷ lục ($2.4), đề xuất tăng 20% ngân sách cho tuần tới.\n• Chỉ số Retention Rate duy trì ổn định ở mức 65%.\n• Nhận định: Cần tối ưu thêm nội dung Video Ads để giảm CTR hiện đang có dấu hiệu bão hòa.`;
      setSlides(newSlides);
      setIsAnalyzing(false);
    }, 1500);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="flex h-screen bg-[#020617] font-['Be_Vietnam_Pro'] text-white overflow-hidden w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@100;300;400;600;700;800;900&display=swap');
        .slide-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #020617; }
        .slide-frame { aspect-ratio: 16 / 9; width: 100%; max-width: 100%; max-height: 100%; background: white; color: #0f172a; position: relative; display: flex; flex-direction: column; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.6); overflow: hidden; }
        .orange-bar { background: linear-gradient(90deg, #FF6B00 0%, #FF3D00 100%); height: 8px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .editable-input { background: transparent; border: none; padding: 0; outline: none; width: 100%; }
        .editable-input:focus { background: rgba(255, 107, 0, 0.05); }
      `}</style>

      {/* Sidebar - Cột slide có thể ẩn/hiện hoàn toàn */}
      <aside className={`transition-all duration-500 ease-in-out border-r border-white/5 flex flex-col bg-[#0F172A] ${sidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center"><Layout size={16}/></div>
            <span className="font-bold text-sm tracking-tight">SLIDE LIST</span>
          </div>
          <button onClick={() => addSlide('table')} className="p-1.5 hover:bg-white/5 rounded text-orange-500"><Plus size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {slides.map((s, idx) => (
            <div key={s.id} onClick={() => setCurrentSlideIndex(idx)} className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${currentSlideIndex === idx ? 'border-orange-600 bg-orange-600/10' : 'border-transparent hover:bg-white/5'}`}>
              <div className="aspect-video bg-slate-800 rounded mb-2 flex items-center justify-center opacity-50">
                {s.type === 'table' ? <TableIcon size={20}/> : <Sparkles size={20}/>}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">{idx + 1}. {s.title}</div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => addSlide('ai')} className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold hover:bg-orange-600 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2">
            <Sparkles size={12}/> Thêm AI Slide
          </button>
        </div>
      </aside>

      {/* Main Workspace - Chiếm toàn bộ diện tích còn lại */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#020617]">
        {/* Topbar mỏng, thanh thoát */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#020617] z-30">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400 hover:text-white transition-colors">
              {sidebarOpen ? <PanelLeftClose size={20}/> : <PanelLeftOpen size={20}/>}
            </button>
            <input 
              value={reportName} 
              onChange={(e) => setReportName(e.target.value)} 
              className="bg-transparent border-none text-xs font-bold text-slate-400 focus:ring-0 w-full max-w-md uppercase tracking-widest"
            />
          </div>
          <div className="flex items-center gap-4">
            {isSaving && <div className="text-[9px] text-orange-500 font-bold uppercase tracking-tighter">Syncing...</div>}
            <button onClick={() => setShowDrive(true)} className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded border border-blue-400/20 hover:bg-blue-400/20 transition-all">
              <HardDrive size={14}/> CONNECT DRIVE
            </button>
            <button onClick={() => saveReport(true)} className="flex items-center gap-2 bg-orange-600 px-4 py-1.5 rounded text-[10px] font-bold hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all">
              <Save size={14}/> LƯU PHIÊN BẢN
            </button>
          </div>
        </header>

        {/* Slide Canvas - Không giới hạn lề */}
        <main className="flex-1 slide-container overflow-hidden p-2 lg:p-6 relative">
          <div className="slide-frame transition-all duration-500">
            {/* Header Line */}
            <div className="orange-bar shrink-0" />

            {/* Slide Body */}
            <div className="flex-1 p-10 lg:p-14 flex flex-col overflow-hidden relative">
              {/* Title Section */}
              <div className="flex items-start justify-between mb-10 shrink-0 relative">
                <div className="flex gap-6 items-start flex-1">
                  <div className="w-1.5 h-16 bg-orange-600 rounded-full shrink-0 mt-1" />
                  <div className="flex-1">
                    <input 
                      value={currentSlide.title} 
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="text-5xl font-black text-slate-900 leading-none focus:ring-0 editable-input uppercase tracking-tighter"
                      placeholder="TIÊU ĐỀ CHÍNH"
                    />
                    <input 
                      value={currentSlide.subtitle} 
                      onChange={(e) => handleSlideUpdate('subtitle', e.target.value)}
                      className="text-xs font-bold text-orange-600 mt-2 focus:ring-0 editable-input uppercase tracking-[0.4em]"
                      placeholder="DÒNG MÔ TẢ PHỤ"
                    />
                  </div>
                </div>
                {/* Editable Page Number */}
                <input 
                  value={currentSlide.pageLabel} 
                  onChange={(e) => handleSlideUpdate('pageLabel', e.target.value)}
                  className="text-right text-6xl font-black text-slate-100 absolute right-0 top-0 pointer-events-auto w-48 focus:ring-0"
                />
              </div>

              {/* Dynamic Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {currentSlide.type === 'table' ? (
                  <div className="h-full border border-slate-100 rounded-xl overflow-hidden flex flex-col bg-white shadow-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          {currentSlide.content.data[0].map((h, i) => (
                            <th key={i} className="p-4 text-left">
                              <input 
                                value={h} 
                                onChange={(e) => handleTableUpdate(0, i, e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-white"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentSlide.content.data.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-0 border-r border-slate-50 last:border-0">
                                <input 
                                  value={cell} 
                                  onChange={(e) => handleTableUpdate(rIdx + 1, cIdx, e.target.value)}
                                  className="w-full p-4 bg-transparent border-none focus:ring-0 text-[11px] font-medium text-slate-600"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-10 h-full">
                    {/* AI Column 1: Context */}
                    <div className="col-span-5 flex flex-col gap-4">
                      <div className="flex-1 bg-slate-50 rounded-2xl p-8 border border-slate-100 flex flex-col relative group">
                        <div className="flex items-center gap-2 mb-4">
                          <Edit3 size={14} className="text-blue-500"/>
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Context Input Area</span>
                        </div>
                        <textarea 
                          value={currentSlide.content.context}
                          onChange={(e) => {
                            const ns = [...slides]; ns[currentSlideIndex].content.context = e.target.value; setSlides(ns);
                          }}
                          className="flex-1 w-full bg-transparent border-none focus:ring-0 text-sm italic text-slate-500 leading-relaxed resize-none no-scrollbar"
                          placeholder="Dán dữ liệu PowerPoint hoặc Context tại đây..."
                        />
                      </div>
                      <button 
                        onClick={runAIAnalysis}
                        disabled={isAnalyzing}
                        className="w-full py-5 bg-slate-900 rounded-2xl flex items-center justify-center gap-4 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? "AI IS ANALYZING..." : <><Sparkles size={18}/> Generate AI Insights</>}
                      </button>
                    </div>

                    {/* AI Column 2: Result */}
                    <div className="col-span-7 h-full">
                      <div className="h-full bg-slate-900 rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-6 shrink-0">
                          <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Expert Analysis Result</span>
                        </div>
                        <textarea 
                          value={currentSlide.content.analysis}
                          onChange={(e) => {
                            const ns = [...slides]; ns[currentSlideIndex].content.analysis = e.target.value; setSlides(ns);
                          }}
                          className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-300 text-base font-medium leading-[2] resize-none no-scrollbar italic"
                          placeholder="Phân tích AI sẽ hiển thị tại đây. Bạn có thể tự do chỉnh sửa mọi từ ngữ..."
                        />
                        <div className="absolute top-10 right-10 opacity-5 pointer-events-none">
                          <BarChart3 size={160} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Section */}
              <div className="mt-10 shrink-0 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] border-t border-slate-100 pt-8">
                <div className="flex items-center gap-4">
                  <span className="text-orange-600">●</span>
                  <input 
                    value={currentSlide.footerLeft} 
                    onChange={(e) => handleSlideUpdate('footerLeft', e.target.value)}
                    className="w-48 focus:ring-0 editable-input"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    value={currentSlide.footerRight} 
                    onChange={(e) => handleSlideUpdate('footerRight', e.target.value)}
                    className="text-right w-48 focus:ring-0 editable-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Drive Modal */}
      {showDrive && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-12">
          <div className="bg-[#1E293B] w-full max-w-2xl h-[500px] rounded-[3rem] border border-white/10 flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="p-10 flex items-center justify-between border-b border-white/5">
              <h3 className="text-2xl font-black">Google Drive Explorer</h3>
              <button onClick={() => setShowDrive(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto space-y-3 no-scrollbar">
              {[{ name: "Performance_Report_May.pptx", size: "14.2 MB" }, { name: "Digital_Campaign_Data.xlsx", size: "8.5 MB" }].map((f, i) => (
                <div key={i} onClick={() => { setSelectedFile(f); setShowDrive(false); }} className="p-5 bg-white/5 rounded-2xl flex items-center justify-between hover:bg-orange-600/10 cursor-pointer transition-all border border-transparent hover:border-orange-600/30">
                  <div className="flex items-center gap-4">
                    <FileText size={20} className="text-slate-400"/>
                    <div><p className="font-bold text-sm">{f.name}</p><p className="text-[10px] text-slate-500 uppercase">{f.size}</p></div>
                  </div>
                  <ChevronRight size={18} className="text-slate-500"/>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}