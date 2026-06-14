import React, { useState, useEffect, useRef } from "react";
import { StudentRecord, Notice, AcademicFile, ScrapedUrl, ChatMessage } from "./types";
import StudentDashboard from "./components/StudentDashboard";
import AdminPanel from "./components/AdminPanel";
import FacultyConsole from "./components/FacultyConsole";
import UserLogin from "./components/UserLogin";
import cutmLogo from "./assets/cutm_logo.png";
import {
  MessageSquare,
  Sparkles,
  Command,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Shield,
  Upload,
  Send,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  Bell,
  HelpCircle,
  Clock,
  Briefcase,
  Copy,
  RotateCcw,
  Square,
  GraduationCap
} from "lucide-react";

export default function App() {
  // Theme Config
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Active session authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("cutm_is_logged_in") === "true";
  });
  
  const [activeRole, setActiveRole] = useState<"student" | "faculty" | "admin" >(() => {
    return (localStorage.getItem("cutm_active_role") as any) || "student";
  });

  const [selectedRegNo, setSelectedRegNo] = useState<string>(() => {
    return localStorage.getItem("cutm_selected_reg_no") || "210301120045";
  });

  const [loggedInUser, setLoggedInUser] = useState<any>(() => {
    const saved = localStorage.getItem("cutm_logged_in_user");
    return saved ? JSON.parse(saved) : null;
  });
  
  // Navigation layout sections
  const [activeTabSection, setActiveTabSection] = useState<"dashboard" | "assistant">("assistant");

  // Handler for successful login matches
  const handleLoginSuccess = (role: "student" | "faculty" | "admin", regNo: string, email: string, profile: any) => {
    setIsLoggedIn(true);
    setActiveRole(role);
    setLoggedInUser(profile);
    localStorage.setItem("cutm_is_logged_in", "true");
    localStorage.setItem("cutm_active_role", role);
    localStorage.setItem("cutm_logged_in_user", JSON.stringify(profile));
    if (role === "student") {
      setSelectedRegNo(regNo);
      localStorage.setItem("cutm_selected_reg_no", regNo);
    } else {
      setSelectedRegNo("");
      localStorage.removeItem("cutm_selected_reg_no");
    }
    
    // Welcome message to the user chat assistant
    const loginGreetMsgId = `login-greet-${Date.now()}`;
    const greetedText = role === "student" 
      ? `🔒 **Secure Student Session Initiated**\n\nWelcome back, **${profile.name}**!\nYour grade book, live SGPAs, course progress indices, and examination notices for **Semester ${profile.semester}** are now fully synchronized.\n\nType any query below to interact with your data!`
      : role === "faculty"
      ? `🔒 **Faculty Member Session Verified**\n\nWelcome back, **${profile.name}**!\nYou have full CSE authorization to publish lecture summaries, check student GPA cards, and check attendance ratios.\n\nWhat would you like to build or check today?`
      : `🔒 **Super Administrator System Level Access**\n\nWelcome back, **${profile.name}**!\nYou can manage the full list of students, insert campus notices, trigger web scrapers, and monitor mock DB state configurations.\n\nChoose an option from your workspace tabs above!`;

    setChatHistory(prev => [
      ...prev,
      {
        id: loginGreetMsgId,
        role: "model",
        text: greetedText,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Secure Sign out session reset
  const handleLogOut = () => {
    setIsLoggedIn(false);
    setActiveRole("student");
    setLoggedInUser(null);
    setSelectedRegNo("210351120045"); // reset standard
    localStorage.removeItem("cutm_is_logged_in");
    localStorage.removeItem("cutm_active_role");
    localStorage.removeItem("cutm_logged_in_user");
    localStorage.removeItem("cutm_selected_reg_no");

    // Initialize greeting on sign out
    setChatHistory([
      {
        id: "welcome-message",
        role: "model",
        text: "👋 **Welcome back to CENTURIONGPT!**\n\nYou have successfully signed out of your session. Please authenticate using the secure login form to proceed.",
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Databases States synced from full-stack express
  const [studentsList, setStudentsList] = useState<StudentRecord[]>([]);
  const [noticesList, setNoticesList] = useState<Notice[]>([]);
  const [filesList, setFilesList] = useState<AcademicFile[]>([]);
  const [scrapedPagesList, setScrapedPagesList] = useState<ScrapedUrl[]>([]);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);

  // AI Chat Controls
  const [inputText, setInputText] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome-message",
      role: "model",
      text: "👋 **Welcome to CENTURIONGPT!**\n\nI am your unified AI-powered University Intelligence System. Select your student profile above to sync your private academic credentials (SGPAs, CGPA, grades criteria, alerts).\n\nAsk me queries like:\n* 📊 *\"Analyze my SGPA grades and show me credit weights\"*\n* 📅 *\"What is the mid-term examination notice?\"*\n* 💼 *\"Are there any on-campus placement drives by Google or TCS?\"*\n* 🎓 *\"Syllabus info for Machine Learning soluciones\"*\n\nHow can I aid your academic journey today?",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastUserQuery, setLastUserQuery] = useState<string>("");

  // Voice Interaction (Web Speech API)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceSynthesisActive, setVoiceSynthesisActive] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Attachment file mock
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: string; base64?: string } | null>(null);
  const [isChatDraggingFile, setIsChatDraggingFile] = useState<boolean>(false);
  const [chatUploadStatus, setChatUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch standard state
  const syncServerDatabases = async () => {
    try {
      const [stdRes, ntcRes, filRes, scrRes] = await Promise.all([
        fetch("/api/students").then(r => r.json()),
        fetch("/api/notices").then(r => r.json()),
        fetch("/api/files").then(r => r.json()),
        fetch("/api/scraper").then(r => r.json())
      ]);
      setStudentsList(stdRes || []);
      setNoticesList(ntcRes || []);
      setFilesList(filRes || []);
      setScrapedPagesList(scrRes || []);
    } catch (e) {
      console.error("Synced databases errors:", e);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    syncServerDatabases();
    // Initialize Browser speech synth check
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Sync Dark Mode state to root element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Sync scroll on chat queries
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isGenerating]);

  // Handle Voice Recording Command (Speech to Text)
  const toggleSpeechRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Web Speech API is not fully supported in this browser window. Try opening in a separate tab.");
        return;
      }
      
      const r = new SpeechRecognition();
      r.continuous = false;
      r.interimResults = false;
      r.lang = "en-US";

      r.onstart = () => {
        setIsRecording(true);
      };

      r.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };

      r.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
        setIsRecording(false);
      };

      r.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = r;
      r.start();
    }
  };

  // TTS browser speaking out-loud
  const handleTTSVoicePlayback = (text: string) => {
    if (!synthRef.current) return;
    
    // Stop ongoing speaks
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
      setVoiceSynthesisActive(false);
      return;
    }

    // Strip markdown formatting for cleaner audio
    const speechText = text.replace(/[*_#`\-|]/g, " ").substring(0, 400); // Guard long reading
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    
    utterance.onend = () => {
      setVoiceSynthesisActive(false);
    };
    utterance.onerror = () => {
      setVoiceSynthesisActive(false);
    };

    setVoiceSynthesisActive(true);
    synthRef.current.speak(utterance);
  };

  // Halt speak synthesis
  const stopMouthSpeaker = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setVoiceSynthesisActive(false);
    }
  };

  // AI query submit handler
  const handleQueryAI = async (customQuery?: string) => {
    const textToSend = customQuery || inputText;
    if (!textToSend.trim() && !attachedFile) return;

    setLastUserQuery(textToSend);
    setInputText("");

    // Append user message
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: attachedFile
        ? `📎 Attached [${attachedFile.name}]:\n\n${textToSend || "Analyze the structured index elements."}`
        : textToSend,
      timestamp: new Date().toLocaleTimeString(),
      isVoice: isRecording
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsGenerating(true);

    // Save active attached file metadata onto server RAG directory before asking if present
    let serverFileName = "";
    if (attachedFile) {
      try {
        const upRes = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: attachedFile.name,
            fileType: attachedFile.type,
            description: "Direct Chat prompt attachment context",
            textContent: attachedFile.content,
            fileContentsBase64: attachedFile.base64 || "",
            uploader: activeRole === "student" ? `Student ID ${selectedRegNo}` : activeRole
          })
        });
        if (upRes.ok) {
          const body = await upRes.json();
          serverFileName = body.file?.fileName || attachedFile.name;
          syncServerDatabases();
        }
      } catch (err) {
        console.error("Direct attach error:", err);
      }
    }

    setAttachedFile(null);

    try {
      const chatRes = await fetch("/api/chat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend + (serverFileName ? ` (Note: please analyze the attached asset titled "${serverFileName}")` : ""),
          regNo: activeRole === "student" ? selectedRegNo : undefined,
          role: activeRole,
          // Limit to latest 6 history units to protect token boundaries
          history: chatHistory.slice(-6).map(m => ({ role: m.role, text: m.text }))
        })
      });

      if (chatRes.ok) {
        const body = await chatRes.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "model",
          text: body.text,
          timestamp: new Date().toLocaleTimeString(),
          citations: body.citations
        };
        setChatHistory(prev => [...prev, aiMsg]);

        // Auto announce voice outputs if requested or spoken in
        if (isRecording) {
          handleTTSVoicePlayback(body.text);
        }
      } else {
        throw new Error("Pipeline computation error");
      }
    } catch (e: any) {
      setChatHistory(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "model",
          text: `⚠️ **AI Intelligence Engine status is offline:** Could not parse university models: ${e.message}. Active diagnostic databases are still functional locally.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentStudentProfile = studentsList.find(s => s.regNo === selectedRegNo) || studentsList[0];

  // Faculty Note vectorize proxy
  const handleFacultyNoteSubmit = async (note: { fileName: string; fileType: string; description: string; textContent: string }) => {
    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...note,
          uploader: "Prof. Vinayak"
        })
      });
      if (res.ok) {
        syncServerDatabases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyMessageText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Message content copied to clipboard!");
  };

  // Handles server uploading and attaching files instantly
  const handleUploadAndAttachFileDirectly = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "txt";
    const isText = ["txt", "csv", "json"].includes(extension);

    setChatUploadStatus(`Reading "${file.name}"...`);

    const performUpload = async (content: string, base64: string) => {
      try {
        setChatUploadStatus(`Gemini RAG Indexing "${file.name}"...`);
        const payload = {
          fileName: file.name,
          fileType: extension,
          description: "Instant Chat workspace attachment",
          textContent: content,
          fileContentsBase64: base64,
          uploader: activeRole === "student" ? `Student ID ${selectedRegNo || "Portal"}` : activeRole
        };

        const upRes = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (upRes.ok) {
          const body = await upRes.json();
          const serverName = body.file?.fileName || file.name;
          
          // Refresh lists to display document immediately under Workspace RAG list
          await syncServerDatabases();

          // Set as currently active attached file so the user can ask questions about it
          setAttachedFile({
            name: serverName,
            type: extension,
            content: content,
            base64: base64
          });

          setChatUploadStatus(null);
        } else {
          const errorMsg = await upRes.text();
          console.error("Direct upload failed", errorMsg);
          alert(`Failed to index file: ${errorMsg || "Upload error"}`);
          setChatUploadStatus(null);
        }
      } catch (err) {
        console.error("Direct upload connection error", err);
        alert("Network connection error whilst indexing document.");
        setChatUploadStatus(null);
      }
    };

    const reader = new FileReader();
    if (isText) {
      reader.onload = (e) => {
        const text = e.target?.result as string || "";
        performUpload(text, "");
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const result = e.target?.result as string || "";
        const base64 = result.split(",")[1] || result;
        const placeholderContent = `[Binary content ${file.name} attached - Gemini AI will analyze the document details directly]`;
        performUpload(placeholderContent, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Triggers file selector attachment
  const handleSelectLocalFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleUploadAndAttachFileDirectly(file);
  };

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200`}>
      
      {/* 1. Header Navigation Panel */}
      <header className="bg-white dark:bg-slate-900 border-b border-indigo-100 dark:border-slate-800 px-4 py-3.5 sticky top-0 z-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Systems Branding Logo */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <img 
              src={cutmLogo} 
              alt="CUTM Logo" 
              className="h-10 w-auto object-contain" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono uppercase">
                CENTURIONGPT
              </h1>
              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                V3.5 RAG Active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">AI-Powered academic Intelligence & University Retrieve Solutions</p>
          </div>
        </div>

        {/* Dynamic Context Controller Bar */}
        {isLoggedIn && loggedInUser ? (
          <div className="flex flex-wrap items-center gap-3 bg-indigo-50/50 dark:bg-slate-800/80 p-1.5 px-3 rounded-xl border border-indigo-100/30 dark:border-slate-700 max-w-full">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 select-none">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  activeRole === "admin" ? "bg-rose-450" : activeRole === "faculty" ? "bg-emerald-450" : "bg-indigo-400"
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  activeRole === "admin" ? "bg-rose-500" : activeRole === "faculty" ? "bg-emerald-500" : "bg-indigo-500"
                }`}></span>
              </span>
              <div className="text-left font-sans">
                <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider font-extrabold block leading-none">
                  {activeRole === "student" ? "STUDENT LOGGED" : activeRole === "faculty" ? "FACULTY PORTAL" : "SUPER ADMINISTRATOR"}
                </span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-normal">
                  {loggedInUser.name} {activeRole === "student" && `(${selectedRegNo})`}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1 select-none"></div>

            <button
              onClick={handleLogOut}
              className="px-2.5 py-1 text-[10px] bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:text-white rounded-lg border border-rose-250/50 dark:border-rose-900/50 transition cursor-pointer flex items-center gap-1 font-mono font-bold"
              title="Terminate private workspace session safely"
            >
              <LogOut className="w-3 h-3 animate-pulse" /> Sign Out
            </button>
          </div>
        ) : (
          <div className="text-[11px] bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 font-mono select-none">
            🔒 Academic Session Locked
          </div>
        )}

        {/* Global Controls & Theme */}
        <div className="flex items-center gap-2.5 ML-auto">
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer text-slate-500"
            title="Toggle theme contrast"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-700" />}
          </button>

          <button
            onClick={syncServerDatabases}
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer text-slate-500"
            title="Refresh active database sync"
          >
            <RefreshCw className="w-4 h-4 text-emerald-500" />
          </button>

          <div className="hidden lg:block w-[1px] h-6 bg-slate-200 dark:bg-slate-700"></div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400">CUTM Network: Live</span>
          </div>
        </div>

      </header>

      {/* 2. Primary Layout Framework (Left/Right balance panels) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4">
        {!isLoggedIn ? (
          <div className="max-w-4xl mx-auto py-8">
            <UserLogin onLoginSuccess={handleLoginSuccess} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
            
            {/* LEFT COLUMN: ACTIVE WORKSPACE CONSOLE OR ROLE VIEWS */}
            <div className="lg:col-span-12 xl:col-span-8 flex flex-col space-y-6">
          
          {/* Section Navigation Toggles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-2xl shadow-sm flex gap-2">
            
            <button
              onClick={() => setActiveTabSection("assistant")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTabSection === "assistant"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50/50"
              }`}
            >
              <Sparkles className="w-4 h-4" /> AI Academic Assistant Interface
            </button>

            <button
              onClick={() => setActiveTabSection("dashboard")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTabSection === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              {activeRole === "student" && "My Student Grade Card & SGPA tracker"}
              {activeRole === "faculty" && "Enrolled Students list & Files Publish"}
              {activeRole === "admin" && "Superuser Settings Control"}
            </button>
          </div>

          {/* RENDERING SECTIONS CONTENT */}
          <div className="flex-1 flex flex-col justify-between">
            {activeTabSection === "dashboard" ? (
              <div className="animate-fade-in">
                {activeRole === "student" && currentStudentProfile && (
                  <StudentDashboard
                    profile={currentStudentProfile}
                    onAskAI={(query) => {
                      setActiveTabSection("assistant");
                      handleQueryAI(query);
                    }}
                    onRefresh={syncServerDatabases}
                  />
                )}
                {activeRole === "student" && !currentStudentProfile && (
                  <div className="text-center py-24 text-slate-400 text-xs">
                    Loading student grade records database index...
                  </div>
                )}
                {activeRole === "faculty" && (
                  <FacultyConsole
                    students={studentsList}
                    files={filesList}
                    onUploadNote={handleFacultyNoteSubmit}
                  />
                )}
                {activeRole === "admin" && (
                  <AdminPanel
                    students={studentsList}
                    notices={noticesList}
                    files={filesList}
                    scrapedPages={scrapedPagesList}
                    onRefreshAll={syncServerDatabases}
                  />
                )}
              </div>
            ) : (
              
              /* CHAT ASSISTANT PANEL WRAPPERS */
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsChatDraggingFile(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                    setIsChatDraggingFile(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsChatDraggingFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    handleUploadAndAttachFileDirectly(file);
                  }
                }}
                className={`bg-white dark:bg-slate-900 border rounded-2xl flex flex-col h-[75vh] shadow-sm overflow-hidden justify-between relative transition-all duration-200 ${
                  isChatDraggingFile
                    ? "border-indigo-500 ring-2 ring-indigo-500/20"
                    : "border-slate-100 dark:border-slate-800"
                }`}
              >
                
                {isChatDraggingFile && (
                  <div className="absolute inset-0 z-[100] bg-indigo-600/10 dark:bg-indigo-950/45 backdrop-blur-[3.5px] flex flex-col items-center justify-center p-6 pointer-events-none">
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center gap-3 animate-bounce">
                      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Drop file to Index directly in RAG
                      </p>
                      <p className="text-[10px] text-slate-400 text-center max-w-xs leading-normal">
                        Your file will be uploaded, parsed by Gemini AI, and added to the RAG Retrieval index immediately.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Assistant Chat header */}
                <div className="bg-slate-50/60 dark:bg-slate-900/60 p-4 border-b border-indigo-50/30 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Intelligence Reasoning Desk</h3>
                      <p className="text-[10px] text-slate-400">Context Personalized to: <span className="font-mono text-indigo-550 dark:text-indigo-400">{activeRole === "student" ? currentStudentProfile?.name : activeRole.toUpperCase()}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {voiceSynthesisActive && (
                      <button
                        onClick={stopMouthSpeaker}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition animate-bounce cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-current" /> Stop Voice Playback
                      </button>
                    )}
                    <button
                      onClick={() => setChatHistory([
                        {
                          id: "welcome-message",
                          role: "model",
                          text: "👋 **Welcome back!** Chat history was initialized. How can I assist you at CUTM today?",
                          timestamp: new Date().toLocaleTimeString()
                        }
                      ])}
                      className="text-slate-400 hover:text-slate-600 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear History
                    </button>
                  </div>
                </div>

                {/* Messages scroll box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 font-sans leading-relaxed text-sm bg-slate-50/20 dark:bg-slate-950/20">
                  {chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start animate-fade-in"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mb-1">
                        <span className="font-bold flex items-center gap-1">
                          {msg.role === "user" ? <User className="w-3 h-3 text-indigo-400" /> : <GraduationCap className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                          {msg.role === "user" ? "Client Intent" : "Intelligence Logic"}
                        </span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl shadow-sm text-xs md:text-sm whitespace-pre-wrap font-sans ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-tr-none text-left"
                            : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none text-left relative"
                        }`}
                      >
                        {/* Bullet markers and headings parsing */}
                        <div className="leading-relaxed whitespace-pre-wrap select-text selection:bg-indigo-100">
                          {msg.text.split("\n").map((line, i) => {
                            if (line.startsWith("###")) {
                              return <h3 key={i} className="text-sm font-extrabold text-indigo-500 mt-3 mb-1.5">{line.replace("###", "")}</h3>;
                            }
                            if (line.startsWith("**") && line.endsWith("**")) {
                              return <p key={i} className="font-bold text-slate-800 dark:text-white mt-2">{line.replace(/\*\*/g, "")}</p>;
                            }
                            if (line.startsWith("*")) {
                              return <p key={i} className="pl-3.5 border-l-2 border-indigo-500/40 my-1 font-sans">{line.replace("*", "•")}</p>;
                            }
                            return <p key={i} className="min-h-1">{line}</p>;
                          })}
                        </div>

                        {/* Citations references visual block */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-800 mt-3.5 pt-2 text-[10px] text-slate-400 flex flex-col gap-1 select-none">
                            <span className="font-bold text-[9px] uppercase tracking-wider font-mono text-indigo-500">RAG Verification Citations:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {msg.citations.map((c, idx) => (
                                <span key={idx} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/55 px-2 py-0.5 rounded font-mono text-[9px] truncate max-w-xs text-slate-500 dark:text-slate-350">
                                  📜 {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Floating operations menu */}
                      <div className="flex items-center gap-2 mt-1.5 px-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                          onClick={() => handleCopyMessageText(msg.text)}
                          className="text-slate-400 hover:text-indigo-500 p-1 rounded text-[10px] flex items-center gap-0.5 font-mono cursor-pointer"
                          title="Copy details"
                        >
                          <Copy className="w-3 h-3" /> copy
                        </button>
                        {msg.role === "model" && (
                          <button
                            onClick={() => handleTTSVoicePlayback(msg.text)}
                            className="text-slate-400 hover:text-indigo-500 p-1 rounded text-[10px] flex items-center gap-0.5 font-mono cursor-pointer"
                            title="Speak Response block aloud"
                          >
                            <Volume2 className="w-3 h-3" /> speak
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex items-start gap-2 max-w-[80%] mr-auto animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                        <Sparkles className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-2xl rounded-tl-none">
                        <div className="flex space-x-1.5 items-center justify-center py-2 px-1 text-slate-400 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                          <span>Centurion AI is reasoning transcripts database...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Controller bar */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-3">
                  
                  {/* Uploading loading indicators */}
                  {chatUploadStatus && (
                    <div className="flex items-center gap-2 bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2.5 rounded-xl text-xs text-indigo-600 dark:text-indigo-400 font-mono animate-pulse">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold">{chatUploadStatus}</span>
                    </div>
                  )}

                  {/* File attachment preview chips */}
                  {attachedFile && (
                    <div className="flex items-center justify-between bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-3 py-1.5 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {attachedFile.name} (.{attachedFile.type})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setAttachedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-red-500 font-bold hover:underline font-mono text-[11px]"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Input form panel */}
                  <div className="flex items-center gap-2">
                    
                    {/* Native attach button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating || !!chatUploadStatus}
                      className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer text-slate-500 border border-slate-200/50 dark:border-slate-700/55 shrink-0 disabled:opacity-50"
                      title="Attach syllabus PDF, CSV, XLS, XLSX grids, images or TXT log files"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.csv,.json,.pdf,.docx,.xls,.xlsx,image/*"
                      onChange={handleSelectLocalFile}
                      className="hidden"
                    />

                    {/* Microphone button with sound waveform animation */}
                    <button
                      onClick={toggleSpeechRecording}
                      disabled={isGenerating || !!chatUploadStatus}
                      className={`p-3 rounded-xl transition shrink-0 cursor-pointer border disabled:opacity-50 ${
                        isRecording
                          ? "bg-red-500 text-white animate-pulse border-red-400"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 border-slate-200/50 dark:border-slate-700/55"
                      }`}
                      title={isRecording ? "Listening... Speak now" : "Dictate query with Web Speech API"}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-rose-500" />}
                    </button>

                    {/* Search panel bar */}
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="text"
                        placeholder={
                          isRecording
                            ? "Listening to voice input..."
                            : chatUploadStatus
                            ? "Document is being parsed and indexed by Gemini..."
                            : attachedFile
                            ? "Complete your query about the attachment..."
                            : "Explore CGPA, exams timetables, hostel rules..."
                        }
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isGenerating && !chatUploadStatus) handleQueryAI();
                        }}
                        disabled={isGenerating || !!chatUploadStatus}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-3.5 pr-12 rounded-xl text-xs md:text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />

                      <button
                        onClick={() => handleQueryAI()}
                        disabled={isGenerating || !!chatUploadStatus || (!inputText.trim() && !attachedFile)}
                        className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: DETAILED INFORMATIONAL SIDE INDEX PANELS */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-6">
          
          {/* 1. Official Live Notices Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4.5 h-4.5 text-rose-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">University Notices</h3>
              </div>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-2 py-0.5 rounded font-mono font-bold">
                {noticesList.length} Active Notice
              </span>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {noticesList.length > 0 ? (
                noticesList.map((notice) => (
                  <div
                    key={notice.id}
                    onClick={() => {
                      setActiveTabSection("assistant");
                      handleQueryAI(`Explain details about this notice: "${notice.title}"`);
                    }}
                    className="group border border-slate-50 dark:border-slate-800/50 p-3 rounded-xl bg-slate-50/20 dark:bg-slate-800/10 hover:border-indigo-400 cursor-pointer transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mb-1">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-neutral-500 font-semibold">{notice.category}</span>
                        <span>{notice.date}</span>
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-350 group-hover:text-indigo-500 transition leading-snug">
                        {notice.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-normal font-sans">
                        {notice.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-4 font-sans">No active notices published.</p>
              )}
            </div>
          </div>

          {/* 2. Knowledge Retrieval Sources and Files */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Command className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Workspace RAG Index</h3>
              </div>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-2 py-0.5 rounded font-mono font-bold">
                {filesList.length} Files
              </span>
            </div>

            <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
              {filesList.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    setActiveTabSection("assistant");
                    handleQueryAI(`Explain and summarize what is indexed inside the file: "${file.fileName}"`);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-800/10 hover:border-indigo-400 text-xs cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase shrink-0">
                      .{file.fileType}
                    </span>
                    <span className="font-sans text-slate-70 text-[11px] truncate">{file.fileName}</span>
                  </div>
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>

            <p className="text-[9px] text-slate-400 select-none text-center font-mono italic">
              * Click any notice or document file above to instantly trigger an AI deep analytics query.
            </p>
          </div>

          {/* 3. Developer Program Credentials Credits */}
          <div className="p-5 rounded-2xl border border-dashed border-indigo-200 dark:border-slate-800 bg-indigo-50/10 dark:bg-slate-900/10 space-y-3.5 Card-Glass select-none">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              🏆 Creator Spotlight
            </h4>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-mono font-bold text-sm shrink-0">
                KV
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">K. Vinay Venkat</p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">B.Tech CSE (AI & ML)</p>
                <p className="text-[10px] text-slate-400">Centurion University Developer Lead</p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>CUTM Academic Year</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-neutral-800 dark:text-slate-350">2026 Session</span>
            </div>
          </div>

        </div>
      </div>
      )}
    </main>

      {/* FOOTER */}
      <footer className="border-t border-indigo-100 dark:border-slate-900 bg-white dark:bg-slate-950 py-4 text-center text-[10px] font-mono text-slate-400">
        <p>© 2026 CENTURIONGPT • University Intelligence System • Crafted by K. Vinay Venkat</p>
      </footer>

    </div>
  );
}

