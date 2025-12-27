import React, { useState, useRef, useEffect } from 'react';
import { ColorData, SearchMode } from './types';
import * as geminiService from './services/geminiService';
import ColorCard from './components/ColorCard';
import Loading from './components/Loading';

// Icons
const SearchIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const CameraIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const SlidersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
);
const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

// Predefined Libraries for "Explore"
const POPULAR_PANTONE = [
  { code: "13-1023", name: "Peach Fuzz", hex: "#FFBE98" },
  { code: "18-1750", name: "Viva Magenta", hex: "#BB2649" },
  { code: "17-3938", name: "Very Peri", hex: "#6667AB" },
  { code: "19-4052", name: "Classic Blue", hex: "#0F4C81" },
];
const POPULAR_RAL = [
  { code: "7035", name: "Light Grey", hex: "#C5C7C4" },
  { code: "9010", name: "Pure White", hex: "#FFFFFF" },
  { code: "7016", name: "Anthracite", hex: "#383E42" },
  { code: "3000", name: "Flame Red", hex: "#AF2B1E" },
];

interface SwatchProps {
  code: string;
  name?: string;
  hex: string;
  onClick?: () => void;
}

const Swatch: React.FC<SwatchProps> = ({ code, name, hex, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center mr-4 w-24 shrink-0 transition-transform active:scale-95"
  >
    <div 
      className="w-20 h-20 rounded-2xl shadow-sm mb-2 border border-gray-100" 
      style={{ backgroundColor: hex }}
    />
    <span className="text-xs font-bold text-gray-900 truncate w-full text-center">{code}</span>
    {name && <span className="text-[10px] text-gray-500 truncate w-full text-center">{name}</span>}
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SearchMode>('code');
  // Store results as an array to handle multiple matches from camera
  const [results, setResults] = useState<ColorData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // History
  const [history, setHistory] = useState<ColorData[]>([]);

  // Search State
  const [codeInput, setCodeInput] = useState('');
  
  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Value Input State
  const [valueType, setValueType] = useState<'rgb' | 'lab'>('rgb');
  const [values, setValues] = useState({ v1: '', v2: '', v3: '' });

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('chroma_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const addToHistory = (item: ColorData) => {
    setHistory(prev => {
      // Avoid duplicates based on code
      const filtered = prev.filter(p => p.code !== item.code);
      const newHistory = [item, ...filtered].slice(0, 20); // Keep last 20
      localStorage.setItem('chroma_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleCodeSearch = async (codeToSearch?: string) => {
    const query = codeToSearch || codeInput;
    if (!query.trim()) return;
    
    setLoading(true);
    setResults(null);
    setErrorMsg(null);
    
    try {
      const data = await geminiService.searchByColorCode(query);
      setResults([data]);
      addToHistory(data);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Could not find color. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setResults(null);
    setCapturedImage(null);
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setErrorMsg("Unable to access camera. Please allow permissions.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Check if video is ready with data
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        setErrorMsg("Camera is starting up, please try again in a second...");
        return;
    }

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Draw video to canvas
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
    
    const base64Data = dataUrl.split(',')[1];

    setLoading(true);
    setErrorMsg(null);
    
    try {
      const dataList = await geminiService.identifyColorFromImage(base64Data);
      if (dataList && dataList.length > 0) {
        setResults(dataList);
        addToHistory(dataList[0]);
      } else {
        setErrorMsg("No colors identified in the image. Try better lighting.");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  const handleValueSearch = async () => {
    const v1 = parseFloat(values.v1);
    const v2 = parseFloat(values.v2);
    const v3 = parseFloat(values.v3);

    if (isNaN(v1) || isNaN(v2) || isNaN(v3)) {
      setErrorMsg("Please enter valid numbers");
      return;
    }

    setLoading(true);
    setResults(null);
    setErrorMsg(null);
    
    try {
      const data = await geminiService.searchByValues(valueType, { v1, v2, v3 });
      setResults([data]);
      addToHistory(data);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Could not match color values.");
    } finally {
      setLoading(false);
    }
  };

  // Views
  const renderCodeSearch = () => (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 flex items-center sticky top-20 z-10">
        <div className="pl-4 text-gray-400">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={codeInput}
          onChange={(e) => { setCodeInput(e.target.value); setErrorMsg(null); }}
          placeholder="Enter Pantone or RAL code..."
          className="flex-1 p-4 bg-transparent outline-none text-lg font-medium text-gray-900 placeholder-gray-400"
          onKeyDown={(e) => e.key === 'Enter' && handleCodeSearch()}
        />
        <button
          onClick={() => handleCodeSearch()}
          disabled={loading || !codeInput}
          className="bg-blue-600 text-white rounded-2xl px-6 py-3 font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          Go
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-medium animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* Results or Explore/History */}
      {loading ? (
        <Loading />
      ) : results ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xl font-bold">Results</h2>
            <button 
              onClick={() => { setResults(null); setCodeInput(''); }} 
              className="text-sm text-blue-600 font-medium"
            >
              Clear
            </button>
          </div>
          {results.map((item, idx) => (
             <ColorCard key={idx} data={item} />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* History Section */}
          {history.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-500 px-1">
                <HistoryIcon />
                <h3 className="text-sm font-bold uppercase tracking-wider">Recent History</h3>
              </div>
              <div className="flex overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                {history.map((item, idx) => (
                  <Swatch 
                    key={idx} 
                    code={item.code} 
                    name={item.nameEN} 
                    hex={item.hex} 
                    onClick={() => { setResults([item]); setErrorMsg(null); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Library: Pantone */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Popular Pantone</h3>
            <div className="grid grid-cols-2 gap-4">
              {POPULAR_PANTONE.map((c, i) => (
                <div 
                  key={i}
                  onClick={() => { setCodeInput(c.code); handleCodeSearch(c.code); }}
                  className="bg-white p-3 rounded-2xl flex items-center space-x-3 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: c.hex }} />
                  <div className="overflow-hidden">
                    <p className="font-bold text-gray-900 truncate">{c.code}</p>
                    <p className="text-xs text-gray-500 truncate">{c.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Library: RAL */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Classic RAL</h3>
            <div className="grid grid-cols-2 gap-4">
              {POPULAR_RAL.map((c, i) => (
                <div 
                  key={i}
                  onClick={() => { setCodeInput(c.code); handleCodeSearch(c.code); }}
                  className="bg-white p-3 rounded-2xl flex items-center space-x-3 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: c.hex }} />
                  <div className="overflow-hidden">
                    <p className="font-bold text-gray-900 truncate">{c.code}</p>
                    <p className="text-xs text-gray-500 truncate">{c.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCameraMode = () => (
    <div className="flex flex-col items-center animate-fade-in w-full pb-20">
      {!isCameraActive && !capturedImage && !results && (
        <div className="text-center py-20">
          <button 
            onClick={startCamera}
            className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <CameraIcon />
          </button>
          <p className="mt-4 text-gray-500 font-medium">Tap to start camera</p>
        </div>
      )}

      {errorMsg && (
         <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-medium animate-fade-in mb-4 w-full">
           {errorMsg}
         </div>
      )}

      {isCameraActive && (
        <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          {/* Viewfinder overlay */}
          <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white/80 rounded-full pointer-events-none"></div>
          
          <div className="absolute bottom-8 w-full flex justify-center z-10">
            <button 
              onClick={captureAndAnalyze}
              className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg active:bg-gray-200 transition-all"
              aria-label="Capture"
            ></button>
          </div>
        </div>
      )}

      {capturedImage && !results && !loading && (
        <div className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden shadow-xl mb-6">
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          <button 
            onClick={() => { setCapturedImage(null); startCamera(); }}
            className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-full text-gray-900 backdrop-blur-md shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      )}
      
      {loading && <Loading />}

      {results && (
        <div className="w-full space-y-4">
            <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-lg">Detected Colors</h3>
                <button onClick={() => { setResults(null); setCapturedImage(null); }} className="text-blue-600 text-sm font-semibold">New Scan</button>
            </div>
            {results.map((item, idx) => (
                <ColorCard key={idx} data={item} />
            ))}
        </div>
      )}
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderValueInput = () => (
    <div className="space-y-8 animate-fade-in max-w-md mx-auto pb-20">
      <div className="bg-gray-200/50 p-1 rounded-2xl flex">
        <button
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${valueType === 'rgb' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          onClick={() => setValueType('rgb')}
        >
          RGB
        </button>
        <button
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${valueType === 'lab' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          onClick={() => setValueType('lab')}
        >
          L*a*b*
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 text-center">
              {valueType === 'rgb' ? 'Red' : 'L*'}
            </label>
            <input
              type="number"
              value={values.v1}
              onChange={e => { setValues({...values, v1: e.target.value}); setErrorMsg(null); }}
              className="w-full text-center bg-white border border-gray-200 rounded-2xl py-4 text-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0"
            />
            <p className="text-[10px] text-gray-400 text-center mt-1 font-medium">
              {valueType === 'rgb' ? '0-255' : '0-100'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 text-center">
              {valueType === 'rgb' ? 'Green' : 'a*'}
            </label>
            <input
              type="number"
              value={values.v2}
              onChange={e => { setValues({...values, v2: e.target.value}); setErrorMsg(null); }}
              className="w-full text-center bg-white border border-gray-200 rounded-2xl py-4 text-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0"
            />
             <p className="text-[10px] text-gray-400 text-center mt-1 font-medium">
              {valueType === 'rgb' ? '0-255' : '-128 to 127'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 text-center">
              {valueType === 'rgb' ? 'Blue' : 'b*'}
            </label>
            <input
              type="number"
              value={values.v3}
              onChange={e => { setValues({...values, v3: e.target.value}); setErrorMsg(null); }}
              className="w-full text-center bg-white border border-gray-200 rounded-2xl py-4 text-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0"
            />
             <p className="text-[10px] text-gray-400 text-center mt-1 font-medium">
              {valueType === 'rgb' ? '0-255' : '-128 to 127'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleValueSearch}
          disabled={loading || !values.v1}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          Convert to Color
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-medium animate-fade-in">
          {errorMsg}
        </div>
      )}

      {loading && <Loading />}

      {results && results.map((item, idx) => (
        <ColorCard key={idx} data={item} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-2xl mx-auto min-h-screen flex flex-col relative">
        <div className="pt-12 pb-8 px-6 text-center">
          <h1 className="text-4xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Chroma<span className="text-gray-900">AI</span>
          </h1>
          <p className="text-gray-500 font-medium">Professional Color Identification</p>
        </div>

        <div className="px-6 mb-8 sticky top-4 z-20">
          <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100">
            {(['code', 'camera', 'value'] as SearchMode[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                   setActiveTab(tab);
                   if (tab !== 'camera' && isCameraActive) {
                     stopCamera();
                   }
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                  activeTab === tab 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-6 pb-12">
          {activeTab === 'code' && renderCodeSearch()}
          {activeTab === 'camera' && renderCameraMode()}
          {activeTab === 'value' && renderValueInput()}
        </div>
      </div>
    </div>
  );
};

export default App;