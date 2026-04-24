import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, Save, Trash2, Layout, Table as TableIcon, BarChart3, 
  FileUp, ChevronUp, ChevronDown, Sparkles, Clock, Settings2, 
  X, Copy, HardDrive, Search, FileText, CheckCircle2, ChevronRight,
  Menu, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

// ==========================================
// CẤU HÌNH FIREBASE CỦA BẠN TẠI ĐÂY
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pp-report-advanced';

export default function App() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [slides, setSlides] = useState([
    { 
      id: '1', 
      type: 'table', 
      title: 'BÁO CÁO HIỆU QUẢ DIGITAL CHI TIẾT', 
      content: { data: [['STT', 'Kênh', 'Ngân sách', 'KPIs', 'ROI', 'Ghi chú'], ['1', 'Facebook', '50M', '1000', '2.5', 'Ổn định'], ['2', 'Google', '30M', '500', '3.0', 'Tăng trưởng']], config: {} } 
    }
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [reportName, setReportName] = useState("Báo cáo Chiến lược Digital 2024");
  const [showDrive, setShowDrive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Firestore sync
  useEffect(() => {
    if (!user) return;

    const reportRef = doc(db, 'artifacts', appId, 'public', 'data', 'reports', 'currentReport');
    const unsubReport = onSnapshot(reportRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.slides) {
          try {
            const parsed = JSON.parse(data.slides);
            setSlides(parsed);
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
        if (data.name) setReportName(data.name);
      }
    }, (error) => {
      console.error("Firestore error:", error);
    });

    const historyRef = collection(db, 'artifacts', appId, 'public', 'data', 'versions');
    const unsubHistory = onSnapshot(historyRef, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(docs);
    });

    return () => {
      unsubReport();
      unsubHistory();
    };
  }, [user]);

  const saveReport = async (isNewVersion = false) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const data = { 
        name: reportName, 
        slides: JSON.stringify(slides), 
        updatedAt: new Date().toISOString(),
        author: user.uid
      };
      
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', 'currentReport'), data);
      
      if (isNewVersion) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'versions'), { 
          ...data, 
          versionName: `Bản lưu ${new Date().toLocaleString()}`,
          serverTime: serverTimestamp()
        });
      }
    } catch (e) { 
      console.error("Save error:", e); 
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const handleTableUpdate = (sIdx, rIdx, cIdx, val) => {
    const newSlides = [...slides];
    newSlides[sIdx].content.data[rIdx][cIdx] = val;

    if (newSlides[sIdx].content.data.length > 11) {
      const header = newSlides[sIdx].content.data[0];
      const excessData = newSlides[sIdx].content.data.slice(11);
      newSlides[sIdx].content.data = newSlides[sIdx].content.data.slice(0, 11);
      const nextSlide = {
        id: Date.now().toString(),
        type: 'table',
        title: newSlides[sIdx].title,
        content: { data: [header, ...excessData], config: {} }
      };
      newSlides.splice(sIdx + 1, 0, nextSlide);
      setCurrentSlideIndex(sIdx + 1);
    }
    setSlides(newSlides);
  };

  const addSlide = (type) => {
    const newSlide = {
      id: Date.now().toString(),
      type,
      title: type === 'table' ? 'TIÊU ĐỀ BÁO CÁO BẢNG' : 'PHÂN TÍCH CHIẾN LƯỢC TỪ AI',
      content: type === 'table' ? { data: [['STT', 'Kênh', 'Ngân sách', 'KPIs', 'ROI', 'Ghi chú']], config: {} } : { analysis: "", context: "" }
    };
    const updated = [...slides, newSlide];
    setSlides(updated);
    setCurrentSlideIndex(updated.length - 1);
  };

  const runAIAnalysis = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const newSlides = [...slides];
      newSlides[currentSlideIndex].content.analysis = `[PHÂN TÍCH CHUYÊN GIA CHO FILE: ${selectedFile.name}]\n\n1. Hiệu suất kênh Digital tăng 25% so với quý trước nhờ tối ưu hóa CPA.\n2. Tỷ lệ chuyển đổi đạt đỉnh vào khung giờ 20h-22h.\n3. Cần tập trung ngân sách vào Google Search Ads do ROI đạt 4.2.\n4. Đề xuất: Cắt giảm 15% ngân sách Facebook Ads cho nhóm khách hàng cũ.`;
      setSlides(newSlides);
      setIsAnalyzing(false);
    }, 2000);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="flex h-screen bg-[#020617] font-['Be_Vietnam_Pro'] text-white overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@100;300;400;600;800;900&display=swap');
        .slide-aspect { 
          aspect-ratio: 16 / 9;
          width: 100%;
          max-height: calc(100vh - 180px);
          object-fit: contain;
        }
        .orange-gradient { background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%); }
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .slide-shadow { box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5), 0 18px 36px -18px rgba(0,0,0,0.5); }
      `}</style>

      {/* Sidebar - Cột Slide bên trái có thể ẩn/hiện */}
      <aside className={`transition-all duration-500 ease-in-out flex flex-col glass border-r border-white/10 ${sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 orange-gradient rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Layout size={18} />
            </div>
            <span className="font-black text-lg tracking-tighter">AI.REPORT</span>
          </div>
          <button onClick={() => addSlide('table')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-orange-500 transition-all">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {slides.map((slide, idx) => (
            <div 
              key={slide.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`relative group cursor-pointer rounded-xl border-2 transition-all p-2 ${currentSlideIndex === idx ? 'border-orange-500 bg-orange-500/10' : 'border-transparent hover:bg-white/5'}`}
            >
              <div className="aspect-video w-full bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center border border-white/5">
                {slide.type === 'table' ? <TableIcon className="text-orange-500/40" size={24} /> : <Sparkles className="text-blue-500/40" size={24} />}
              </div>
              <div className="mt-2 flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{idx + 1}. {slide.title || slide.type}</span>
                <button onClick={(e) => { e.stopPropagation(); setSlides(slides.filter((_, i) => i !== idx)); }} className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-500 transition-opacity"><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 space-y-2 shrink-0">
          <button onClick={() => setShowDrive(true)} className="w-full flex items-center justify-center gap-2 bg-blue-600/10 text-blue-400 py-2.5 rounded-xl text-[10px] font-bold hover:bg-blue-600/20 transition-all border border-blue-500/10">
            <HardDrive size={14} /> DRIVE STORAGE
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#020617]">
        {/* Header Bar */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#0F172A]/40 backdrop-blur-md z-20">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
              title={sidebarOpen ? "Ẩn danh sách slide" : "Hiện danh sách slide"}
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <input 
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="bg-transparent border-none text-base font-bold focus:ring-0 text-slate-200 w-full max-w-md"
              placeholder="Tên báo cáo..."
            />
          </div>
          
          <div className="flex items-center gap-3">
            {isSaving && <div className="text-[9px] text-orange-500 animate-pulse font-bold tracking-widest mr-2">AUTO-SAVING</div>}
            <button onClick={() => setShowHistory(!showHistory)} className="p-2 text-slate-400 hover:text-white transition-all"><Clock size={18} /></button>
            <div className="h-4 w-px bg-white/10 mx-1"></div>
            <button onClick={() => saveReport(true)} className="flex items-center gap-2 px-5 py-2 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-orange-500 hover:text-white transition-all">
              <Save size={14} /> LƯU BẢN GHI
            </button>
          </div>
        </header>

        {/* Slide Canvas Area */}
        <main className="flex-1 flex items-center justify-center p-8 lg:p-12 overflow-hidden bg-[#020617]">
          <div className="w-full h-full flex items-center justify-center max-w-[1400px]">
            {currentSlide ? (
              <div className="slide-aspect bg-white text-slate-900 slide-shadow relative flex flex-col transition-all duration-300">
                {/* Decorative Top Line */}
                <div className="h-1.5 orange-gradient w-full shrink-0" />

                <div className="flex-1 p-8 lg:p-12 flex flex-col overflow-hidden">
                  {/* Slide Title Bar */}
                  <div className="flex items-start gap-5 mb-8 shrink-0">
                    <div className="w-1 h-12 orange-gradient rounded-full" />
                    <div className="flex-1 min-w-0">
                      <input 
                        value={currentSlide.title}
                        onChange={(e) => {
                          const ns = [...slides]; ns[currentSlideIndex].title = e.target.value; setSlides(ns);
                        }}
                        className="text-4xl font-[900] tracking-tighter text-slate-900 border-none p-0 focus:ring-0 uppercase w-full bg-transparent leading-none"
                        placeholder="TIÊU ĐỀ SLIDE"
                      />
                      <div className="text-[9px] font-black text-orange-500 mt-2 uppercase tracking-[0.3em]">Digital Performance Insight</div>
                    </div>
                    <div className="text-5xl font-black text-slate-50 opacity-10 absolute right-8 top-8 select-none pointer-events-none uppercase">PAGE {currentSlideIndex + 1}</div>
                  </div>

                  {/* Content Frame */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {currentSlide.type === 'table' ? (
                      <div className="h-full rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
                        <table className="w-full border-collapse table-fixed">
                          <thead>
                            <tr className="orange-gradient text-white">
                              {currentSlide.content.data[0].map((h, i) => (
                                <th key={i} className="p-3 text-left text-[10px] font-black uppercase tracking-widest border-r border-white/10 last:border-0 truncate">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="overflow-y-auto">
                            {currentSlide.content.data.slice(1).map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-0 border-r border-slate-50 last:border-0 h-10">
                                    <input 
                                      value={cell}
                                      onChange={(e) => handleTableUpdate(currentSlideIndex, rIdx + 1, cIdx, e.target.value)}
                                      className="w-full h-full px-3 bg-transparent border-none focus:ring-1 focus:ring-orange-500/20 text-[11px] text-slate-600 font-medium truncate"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Empty spacer for clean look if rows are few */}
                        <div className="flex-1 bg-white" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-8 h-full">
                        <div className="col-span-5 flex flex-col space-y-4">
                           <div className="flex-1 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                              <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <FileText size={12}/> Input context (Google Drive)
                              </h4>
                              <textarea 
                                value={currentSlide.content.context}
                                onChange={(e) => { const ns = [...slides]; ns[currentSlideIndex].content.context = e.target.value; setSlides(ns); }}
                                className="flex-1 w-full bg-transparent border-none focus:ring-0 text-[12px] italic text-slate-500 resize-none leading-relaxed no-scrollbar"
                                placeholder="Dán nội dung từ PPT vào đây để AI phân tích..."
                              />
                           </div>
                           <button 
                             onClick={runAIAnalysis} 
                             disabled={isAnalyzing} 
                             className="w-full py-4 orange-gradient rounded-xl flex items-center justify-center gap-3 text-white font-black text-[11px] uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                           >
                             {isAnalyzing ? "Processing..." : <><Sparkles size={14} /> AI Expert Analysis</>}
                           </button>
                        </div>
                        <div className="col-span-7 flex flex-col">
                           <div className="flex-1 p-8 bg-slate-900 rounded-[2rem] shadow-inner relative overflow-hidden flex flex-col">
                              <div className="flex items-center gap-2 mb-5 shrink-0">
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">AI Result Insight</span>
                              </div>
                              <textarea 
                                value={currentSlide.content.analysis}
                                onChange={(e) => { const ns = [...slides]; ns[currentSlideIndex].content.analysis = e.target.value; setSlides(ns); }}
                                className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-300 text-[14px] font-medium leading-relaxed resize-none no-scrollbar"
                                placeholder="Phân tích chuyên gia hiển thị tại đây..."
                              />
                           </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slide Footer */}
                  <div className="mt-8 shrink-0 flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-3">
                      <span className="text-orange-500 text-[14px]">●</span>
                      <span>{selectedFile?.name || "Independent Report"}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Confidential</span>
                      <span className="text-slate-900 font-black">Digital v2.5</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 font-medium italic text-lg animate-pulse">Chọn hoặc tạo Slide mới để bắt đầu thiết kế...</div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Control for Sidebar toggle if hidden and mouse at edge could go here, but button is better */}

      {/* Modal: Google Drive Explorer */}
      {showDrive && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#1E293B] w-full max-w-2xl max-h-[500px] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 flex items-center justify-between border-b border-white/5">
              <h3 className="text-xl font-black flex items-center gap-3"><HardDrive size={20} className="text-blue-400"/> Drive File Explorer</h3>
              <button onClick={() => setShowDrive(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {[{ name: "Digital_Marketing_Q1.pptx", size: "12.5 MB" }, { name: "Ads_Performance_Facebook.xlsx", size: "4.2 MB" }].map((file, i) => (
                <div key={i} onClick={() => { setSelectedFile(file); setShowDrive(false); }} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between hover:bg-orange-500/10 cursor-pointer transition-all group">
                  <div className="flex items-center gap-4"><FileText size={18} className="text-slate-400 group-hover:text-orange-500 transition-colors" /><div><p className="font-bold text-sm text-slate-200">{file.name}</p><p className="text-[9px] text-slate-500 uppercase">{file.size}</p></div></div>
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: History */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-end">
          <div className="w-80 h-full bg-[#0F172A] shadow-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold">Lịch sử sao lưu</h3>
              <button onClick={() => setShowHistory(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {history.map((v) => (
                <div key={v.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/50 cursor-pointer transition-all" onClick={() => {
                  setSlides(JSON.parse(v.slides)); setReportName(v.name); setShowHistory(false);
                }}>
                  <p className="text-xs font-bold text-slate-200 truncate">{v.versionName}</p>
                  <p className="text-[9px] text-slate-500 mt-1 uppercase">{new Date(v.updatedAt).toLocaleString('vi-VN')}</p>
                </div>
              ))}
              {history.length === 0 && <div className="text-center text-slate-600 text-xs py-10 italic">Chưa có bản ghi lịch sử</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}