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
  X, Copy, HardDrive, Search, FileText, CheckCircle2, ChevronRight
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

// Ưu tiên sử dụng cấu hình từ hệ thống nếu có, nếu không sẽ dùng cấu hình manual của bạn
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : myManualFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pp-report-advanced';

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
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

  // Auth: Đảm bảo đăng nhập trước khi truy vấn Firestore
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

  // Lắng nghe dữ liệu từ Firestore (Guard với !user)
  useEffect(() => {
    if (!user) return;

    const reportRef = doc(db, 'artifacts', appId, 'public', 'data', 'reports', 'currentReport');
    const unsubReport = onSnapshot(reportRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.slides) {
          try {
            setSlides(JSON.parse(data.slides));
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
      content: type === 'table' ? { data: [['Cột 1', 'Cột 2', 'Cột 3']], config: {} } : { analysis: "", context: "" }
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
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
    <div className="flex h-screen bg-[#0F172A] font-['Be_Vietnam_Pro'] text-white overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@100;300;400;600;800;900&display=swap');
        .slide-aspect { aspect-ratio: 16 / 9; }
        .orange-gradient { background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%); }
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 flex flex-col glass">
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 orange-gradient rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Layout size={20} />
            </div>
            <span className="font-black text-xl tracking-tighter">AI.REPORT</span>
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
              className={`relative group cursor-pointer rounded-2xl border-2 transition-all p-2 ${currentSlideIndex === idx ? 'border-orange-500 bg-orange-500/10' : 'border-transparent hover:bg-white/5'}`}
            >
              <div className="slide-aspect w-full bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-white/5">
                {slide.type === 'table' ? <TableIcon className="text-orange-500/50" /> : <Sparkles className="text-blue-500/50" />}
              </div>
              <div className="mt-3 flex justify-between items-center px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{idx + 1}. {slide.type}</span>
                <button onClick={(e) => { e.stopPropagation(); setSlides(slides.filter((_, i) => i !== idx)); }} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button onClick={() => setShowDrive(true)} className="w-full flex items-center justify-center gap-2 bg-blue-600/20 text-blue-400 py-3 rounded-xl text-xs font-bold hover:bg-blue-600/30 transition-all border border-blue-500/20">
            <HardDrive size={14} /> KẾT NỐI DRIVE
          </button>
          <button onClick={() => addSlide('ai')} className="w-full flex items-center justify-center gap-2 orange-gradient text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-500/20">
            <Sparkles size={14} /> THÊM SLIDE AI
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-[#020617]">
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#0F172A]/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <input 
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="bg-transparent border-none text-xl font-bold focus:ring-0 text-slate-200 min-w-[400px]"
            />
            {isSaving && <div className="text-[10px] text-orange-500 animate-pulse font-bold uppercase tracking-widest italic">Auto-saving...</div>}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-xl transition-all">
              <Clock size={16} /> Lịch sử
            </button>
            {selectedFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] text-green-400 font-bold">
                <CheckCircle2 size={12} /> {selectedFile.name}
              </div>
            )}
            <button onClick={() => saveReport(true)} className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-orange-500 hover:text-white transition-all shadow-xl">
              <Save size={16} /> LƯU BẢN GHI
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-16 flex flex-col items-center no-scrollbar">
          <div className="w-full max-w-6xl">
            {currentSlide ? (
              <div className="slide-aspect w-full bg-white text-slate-900 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative flex flex-col overflow-hidden">
                <div className="h-2 orange-gradient w-full" />
                <div className="flex-1 p-16 flex flex-col relative">
                  <div className="flex items-start gap-6 mb-12">
                    <div className="w-1.5 h-16 orange-gradient rounded-full" />
                    <div className="flex-1">
                      <input 
                        value={currentSlide.title}
                        onChange={(e) => {
                          const ns = [...slides]; ns[currentSlideIndex].title = e.target.value; setSlides(ns);
                        }}
                        className="text-5xl font-[900] tracking-tighter text-slate-900 border-none p-0 focus:ring-0 uppercase w-full bg-transparent"
                      />
                      <div className="text-[10px] font-black text-orange-500 mt-2 uppercase tracking-[0.4em]">Digital Expert Group</div>
                    </div>
                    <div className="text-6xl font-black text-slate-100 absolute right-16 top-16 -z-0 tracking-tighter uppercase opacity-50 select-none">PAGE {currentSlideIndex + 1}</div>
                  </div>

                  <div className="flex-1 z-10">
                    {currentSlide.type === 'table' ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-2xl bg-white">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="orange-gradient text-white">
                              {currentSlide.content.data[0].map((h, i) => (
                                <th key={i} className="p-4 text-left text-[11px] font-black uppercase tracking-widest border-r border-white/10 last:border-0">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentSlide.content.data.slice(1).map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-50 last:border-0">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-0 border-r border-slate-50 last:border-0">
                                    <input 
                                      value={cell}
                                      onChange={(e) => handleTableUpdate(currentSlideIndex, rIdx + 1, cIdx, e.target.value)}
                                      className="w-full p-4 bg-transparent border-none focus:ring-2 focus:ring-orange-500/20 text-xs text-slate-600 font-medium"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-12 h-full">
                        <div className="col-span-2 flex flex-col space-y-6">
                           <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Context From Drive</h4>
                              <textarea 
                                value={currentSlide.content.context}
                                onChange={(e) => { const ns = [...slides]; ns[currentSlideIndex].content.context = e.target.value; setSlides(ns); }}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm italic text-slate-500 resize-none h-40"
                                placeholder="Dán nội dung từ PPT vào đây..."
                              />
                           </div>
                           <button onClick={runAIAnalysis} disabled={isAnalyzing} className="w-full py-5 orange-gradient rounded-2xl flex items-center justify-center gap-3 text-white font-black text-sm shadow-xl transition-all disabled:opacity-50">
                             {isAnalyzing ? "ĐANG PHÂN TÍCH..." : <><Sparkles size={18} /> PHÂN TÍCH CHUYÊN GIA AI</>}
                           </button>
                        </div>
                        <div className="col-span-3">
                           <div className="h-full p-10 bg-slate-900 rounded-[2.5rem] shadow-inner relative overflow-hidden">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">AI Expert Insight</span>
                              </div>
                              <textarea 
                                value={currentSlide.content.analysis}
                                onChange={(e) => { const ns = [...slides]; ns[currentSlideIndex].content.analysis = e.target.value; setSlides(ns); }}
                                className="w-full bg-transparent border-none focus:ring-0 text-slate-300 text-lg font-medium leading-loose resize-none h-[300px] no-scrollbar"
                              />
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="slide-aspect w-full border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center text-slate-500 italic">Chọn một slide để làm việc</div>
            )}
          </div>
        </main>
      </div>

      {/* Modals: Google Drive & History */}
      {showDrive && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-12">
          <div className="bg-[#1E293B] w-full max-w-4xl h-[600px] rounded-[3rem] border border-white/10 flex flex-col overflow-hidden">
            <div className="p-10 flex items-center justify-between border-b border-white/5">
              <h3 className="text-2xl font-black">Google Drive Explorer</h3>
              <button onClick={() => setShowDrive(false)}><X size={24} /></button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto space-y-3 no-scrollbar">
              {[{ name: "Digital_Marketing_Q1.pptx", size: "12.5 MB" }, { name: "Ads_Performance.xlsx", size: "4.2 MB" }].map((file, i) => (
                <div key={i} onClick={() => { setSelectedFile(file); setShowDrive(false); }} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-orange-500/10 cursor-pointer transition-all">
                  <div className="flex items-center gap-4"><FileText size={20} className="text-slate-400" /><div><p className="font-bold">{file.name}</p><p className="text-[10px] text-slate-500 uppercase">{file.size}</p></div></div>
                  <ChevronRight size={18} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-end">
          <div className="w-96 h-full bg-[#1E293B] shadow-2xl border-l border-white/10 flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Lịch sử bản ghi</h3>
              <button onClick={() => setShowHistory(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {history.map((v) => (
                <div key={v.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/50 cursor-pointer" onClick={() => {
                  setSlides(JSON.parse(v.slides)); setReportName(v.name); setShowHistory(false);
                }}>
                  <p className="text-sm font-bold text-slate-200">{v.versionName}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(v.updatedAt).toLocaleString('vi-VN')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}