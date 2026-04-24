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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pp-report-pro-v4';

export default function App() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [slides, setSlides] = useState([
    { 
      id: '1', 
      type: 'table', 
      title: 'BÁO CÁO TỔNG QUAN HIỆU SUẤT DIGITAL',
      subtitle: 'DIGITAL PERFORMANCE STRATEGY 2024',
      pageLabel: '01',
      footerLeft: 'Confidential Report - Digital Expert Group',
      footerRight: 'Internal Strategy v4.0',
      content: { data: [['STT', 'KÊNH QUẢNG CÁO', 'NGÂN SÁCH', 'KPI TARGET', 'ROI THỰC TẾ', 'NHẬN ĐỊNH'], ['1', 'Facebook Ads', '120,000,000', '4,500 Lead', '3.2x', 'Tối ưu tốt'], ['2', 'Google Search', '85,000,000', '1,200 Conv', '4.5x', 'Hiệu quả cao']], config: {} } 
    }
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [reportName, setReportName] = useState("BÁO CÁO CHIẾN LƯỢC DIGITAL QUÝ 2");
  const [showDrive, setShowDrive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        pageLabel: (parseInt(newSlides[currentSlideIndex].pageLabel) + 1).toString().padStart(2, '0'),
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
      subtitle: 'PHÂN TÍCH CHIẾN LƯỢC - MÔ TẢ PHỤ',
      pageLabel: (slides.length + 1).toString().padStart(2, '0'),
      footerLeft: 'Confidential Report',
      footerRight: 'Digital v4.0',
      content: type === 'table' ? { data: [['STT', 'MỤC LỤC', 'DỮ LIỆU', 'ĐƠN VỊ', 'ROI', 'GHI CHÚ']], config: {} } : { analysis: "", context: "" }
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
    <div className="flex h-screen bg-[#020617] font-['Be_Vietnam_Pro'] text-white overflow-hidden w-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@100;300;400;600;700;800;900&display=swap');
        .slide-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #0f172a; padding: 20px; }
        .slide-frame { aspect-ratio: 16 / 9; width: 100%; max-height: 100%; background: white; color: #0f172a; position: relative; display: flex; flex-direction: column; box-shadow: 0 40px 80px rgba(0,0,0,0.5); border-radius: 4px; overflow: hidden; }
        .orange-accent { background: #FF6B00; height: 100%; width: 6px; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .editable-input { background: transparent; border: none; padding: 0; outline: none; width: 100%; transition: all 0.2s; }
        .editable-input:hover { background: rgba(0,0,0,0.02); }
        .editable-input:focus { background: rgba(255, 107, 0, 0.05); }
        .table-header { border-bottom: 2px solid #0f172a; background: #f8fafc; }
      `}</style>

      {/* Sidebar - Danh sách Slide */}
      <aside className={`transition-all duration-500 ease-in-out border-r border-white/5 flex flex-col bg-[#020617] ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-600/20"><Layout size={16}/></div>
            <span className="font-bold text-sm tracking-tight">PHÂN CẢNH</span>
          </div>
          <button onClick={() => addSlide('table')} className="p-1.5 hover:bg-white/5 rounded-full text-orange-500"><Plus size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {slides.map((s, idx) => (
            <div key={s.id} onClick={() => setCurrentSlideIndex(idx)} className={`p-2 rounded-xl border-2 cursor-pointer transition-all ${currentSlideIndex === idx ? 'border-orange-600 bg-orange-600/10 shadow-lg shadow-orange-600/5' : 'border-transparent hover:bg-white/5'}`}>
              <div className="aspect-video bg-slate-800 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden group">
                {s.type === 'table' ? <TableIcon size={24} className="text-slate-500"/> : <Sparkles size={24} className="text-slate-500"/>}
                <div className="absolute inset-0 bg-orange-600/0 group-hover:bg-orange-600/10 transition-all"/>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate flex items-center gap-2">
                 <span className="text-orange-500">{idx + 1}.</span> {s.title}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/5 space-y-2">
           <button onClick={() => addSlide('ai')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
            <Sparkles size={14}/> THÊM PHÂN TÍCH AI
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
        {/* Header Toolbar */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#020617] z-30">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-lg">
              {sidebarOpen ? <PanelLeftClose size={20}/> : <PanelLeftOpen size={20}/>}
            </button>
            <input 
              value={reportName} 
              onChange={(e) => setReportName(e.target.value)} 
              className="bg-transparent border-none text-sm font-black text-slate-300 focus:ring-0 w-full max-w-xl uppercase tracking-[0.2em]"
            />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowDrive(true)} className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-4 py-2 rounded-xl border border-blue-400/20 hover:bg-blue-400/20 transition-all">
              <HardDrive size={14}/> GOOGLE DRIVE
            </button>
            <button onClick={() => saveReport(true)} className="flex items-center gap-2 bg-orange-600 px-6 py-2 rounded-xl text-[10px] font-black hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all tracking-widest">
              <Save size={14}/> LƯU PHIÊN BẢN
            </button>
          </div>
        </header>

        {/* Slide Canvas - Full Space */}
        <main className="flex-1 slide-container relative">
          <div className="slide-frame transition-all duration-700 ease-in-out">
            {/* Header Accent */}
            <div className="h-2 bg-[#FF6B00] w-full shrink-0" />

            <div className="flex-1 p-12 lg:p-20 flex flex-col overflow-hidden relative">
              {/* Title Block - Scientific Layout */}
              <div className="flex items-start justify-between mb-16 shrink-0">
                <div className="flex gap-8 items-start flex-1">
                  <div className="orange-accent shrink-0 h-20" />
                  <div className="flex-1">
                    <input 
                      value={currentSlide.title} 
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="text-6xl font-black text-slate-900 leading-[0.9] focus:ring-0 editable-input uppercase tracking-tighter"
                      placeholder="TIÊU ĐỀ CHÍNH"
                    />
                    <input 
                      value={currentSlide.subtitle} 
                      onChange={(e) => handleSlideUpdate('subtitle', e.target.value)}
                      className="text-sm font-bold text-orange-600 mt-4 focus:ring-0 editable-input uppercase tracking-[0.5em]"
                      placeholder="DÒNG MÔ TẢ CHIẾN LƯỢC"
                    />
                  </div>
                </div>
                
                {/* Page Number - Positioned Scientifically */}
                <div className="flex flex-col items-end">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">PAGE ID</div>
                    <div className="flex items-center gap-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">#</span>
                        <input 
                          value={currentSlide.pageLabel} 
                          onChange={(e) => handleSlideUpdate('pageLabel', e.target.value)}
                          className="text-right text-6xl font-black text-slate-900 pointer-events-auto w-24 focus:ring-0 p-0 leading-none tracking-tighter"
                        />
                    </div>
                </div>
              </div>

              {/* Dynamic Slide Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {currentSlide.type === 'table' ? (
                  <div className="h-full border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-white">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="table-header">
                          {currentSlide.content.data[0].map((h, i) => (
                            <th key={i} className="p-5 text-left border-r border-slate-200 last:border-0">
                              <input 
                                value={h} 
                                onChange={(e) => handleTableUpdate(0, i, e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-widest text-slate-800"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentSlide.content.data.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-0 border-r border-slate-100 last:border-0">
                                <input 
                                  value={cell} 
                                  onChange={(e) => handleTableUpdate(rIdx + 1, cIdx, e.target.value)}
                                  className="w-full p-5 bg-transparent border-none focus:ring-0 text-[13px] font-medium text-slate-600"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex-1 bg-white" />
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-12 h-full">
                    {/* Left: Input Context */}
                    <div className="col-span-5 flex flex-col gap-6">
                      <div className="flex-1 bg-slate-50 rounded-3xl p-10 border border-slate-200 flex flex-col relative group shadow-inner">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Dữ liệu nguồn PPT/Drive</span>
                        </div>
                        <textarea 
                          value={currentSlide.content.context}
                          onChange={(e) => {
                            const ns = [...slides]; ns[currentSlideIndex].content.context = e.target.value; setSlides(ns);
                          }}
                          className="flex-1 w-full bg-transparent border-none focus:ring-0 text-base italic text-slate-500 leading-relaxed resize-none no-scrollbar"
                          placeholder="Dán nội dung từ PowerPoint của bạn vào đây..."
                        />
                        <div className="mt-4 flex gap-2">
                           <button onClick={() => handleSlideUpdate('content', {...currentSlide.content, context: ""})} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase">Xóa dữ liệu</button>
                        </div>
                      </div>
                      <button 
                        onClick={runAIAnalysis}
                        disabled={isAnalyzing}
                        className="w-full py-6 bg-slate-900 rounded-[2rem] flex items-center justify-center gap-4 text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-orange-600 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                      >
                        {isAnalyzing ? "AI ĐANG PHÂN TÍCH..." : <><Sparkles size={20}/> TỔNG HỢP NHẬN ĐỊNH AI</>}
                      </button>
                    </div>

                    {/* Right: Expert Analysis Result */}
                    <div className="col-span-7 h-full">
                      <div className="h-full bg-slate-900 rounded-[3rem] p-12 flex flex-col relative overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-3 mb-8 shrink-0">
                          <div className="w-3 h-3 bg-orange-600 rounded-full animate-ping" />
                          <span className="text-[11px] font-black text-orange-500 uppercase tracking-widest">Nhận định chuyên gia (Editable)</span>
                        </div>
                        <textarea 
                          value={currentSlide.content.analysis}
                          onChange={(e) => {
                            const ns = [...slides]; ns[currentSlideIndex].content.analysis = e.target.value; setSlides(ns);
                          }}
                          className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-200 text-lg font-medium leading-[2.2] resize-none no-scrollbar italic"
                          placeholder="Phân tích chuyên gia AI sẽ xuất hiện tại đây..."
                        />
                        <div className="absolute -bottom-20 -right-20 opacity-[0.03] pointer-events-none rotate-12">
                          <BarChart3 size={350} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Section - Clean & Editable */}
              <div className="mt-16 shrink-0 flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] border-t border-slate-100 pt-10">
                <div className="flex items-center gap-6">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                  <input 
                    value={currentSlide.footerLeft} 
                    onChange={(e) => handleSlideUpdate('footerLeft', e.target.value)}
                    className="w-[400px] focus:ring-0 editable-input"
                    placeholder="THÔNG TIN BẢO MẬT"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <input 
                    value={currentSlide.footerRight} 
                    onChange={(e) => handleSlideUpdate('footerRight', e.target.value)}
                    className="text-right w-[400px] focus:ring-0 editable-input"
                    placeholder="PHIÊN BẢN BÁO CÁO"
                  />
                  <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Google Drive Explorer Modal */}
      {showDrive && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-12 animate-in fade-in duration-300">
          <div className="bg-[#1E293B] w-full max-w-4xl h-[700px] rounded-[4rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-12 flex items-center justify-between border-b border-white/5 bg-slate-900/50">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-blue-600/20 rounded-[2rem] flex items-center justify-center text-blue-400">
                    <HardDrive size={32}/>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black tracking-tight">Google Drive</h3>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Duyệt và chọn file báo cáo PPTX</p>
                 </div>
              </div>
              <button onClick={() => setShowDrive(false)} className="p-4 hover:bg-white/5 rounded-full transition-all border border-white/5"><X size={28}/></button>
            </div>
            <div className="flex-1 p-12 overflow-y-auto space-y-4 no-scrollbar bg-[#020617]/50">
              {[
                { name: "Digital_Marketing_Strategy_May.pptx", size: "14.2 MB", date: "Hôm nay" },
                { name: "Performance_Report_Q2_Final.xlsx", size: "8.5 MB", date: "Hôm qua" },
                { name: "Competitor_Analysis_v2.pptx", size: "11.0 MB", date: "3 ngày trước" }
              ].map((f, i) => (
                <div key={i} onClick={() => { setSelectedFile(f); setShowDrive(false); }} className="p-6 bg-white/5 rounded-[2.5rem] flex items-center justify-between hover:bg-orange-600 hover:scale-[1.02] cursor-pointer transition-all border border-white/5 group">
                  <div className="flex items-center gap-6">
                    <FileText size={28} className="text-slate-400 group-hover:text-white transition-colors"/>
                    <div>
                        <p className="font-bold text-lg group-hover:text-white transition-colors">{f.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest group-hover:text-white/60">{f.size} • {f.date}</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-slate-600 group-hover:text-white"/>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}