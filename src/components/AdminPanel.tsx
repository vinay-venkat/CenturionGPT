import React, { useState, useEffect } from "react";
import { StudentRecord, Notice, AcademicFile, ScrapedUrl } from "../types";
import { Users, FileText, Globe, Bell, Plus, ShieldCheck, Trash2, Database, Upload, RefreshCw, Layers, Camera, Eye, EyeOff } from "lucide-react";

interface AdminPanelProps {
  students: StudentRecord[];
  notices: Notice[];
  files: AcademicFile[];
  scrapedPages: ScrapedUrl[];
  onRefreshAll: () => void;
}

export default function AdminPanel({ students, notices, files, scrapedPages, onRefreshAll }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"students" | "notices" | "files" | "scrapers" | "stats">("students");
  const [adminLogo, setAdminLogo] = useState<string | null>(() => {
    return localStorage.getItem("cutm_logo_admin");
  });

  const handleAdminLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAdminLogo(dataUrl);
      localStorage.setItem("cutm_logo_admin", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Refresh status state
  const [refreshing, setRefreshing] = useState(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [showAdminFormPin, setShowAdminFormPin] = useState(false);

  // Student CRUD State
  const [studentForm, setStudentForm] = useState<Partial<StudentRecord>>({
    regNo: "",
    name: "",
    email: "",
    pin: "1234",
    department: "B.Tech in CSE (AIML)",
    semester: 4,
    attendanceRate: 0,
    sgpaHistory: [],
    cgpa: 0.0,
    subjects: []
  });

  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    credits: 4,
    grade: "E",
    gradePoint: 9
  });

  // Notice Board Form State
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    category: "Academic" as Notice["category"],
    author: "Office of the Registrar"
  });

  // Scraping crawl state
  const [scraperForm, setScraperForm] = useState({
    url: "",
    title: ""
  });

  // Document Upload State
  const [docFile, setDocFile] = useState({
    fileName: "",
    fileType: "txt",
    description: "",
    textContent: "",
    fileContentsBase64: ""
  });
  const [isDragging, setIsDragging] = useState(false);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Save or edit a student record
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.regNo || !studentForm.name) return alert("Reg No and Name are mandatory");

    setLoadingAction("student");
    try {
      // Auto-compute average of SGPAs for CGPA if empty
      const history = studentForm.sgpaHistory || [];
      const computedCgpa = history.length > 0 
        ? parseFloat((history.reduce((sum, item) => sum + item.sgpa, 0) / history.length).toFixed(2))
        : 8.5;

      const payload = {
        ...studentForm,
        cgpa: computedCgpa,
        subjects: studentForm.subjects && studentForm.subjects.length > 0 ? studentForm.subjects : [
          { code: "CUTM1011", name: "Machine Learning Solutions", credits: 4, grade: "E", gradePoint: 9 },
          { code: "CUTM1100", name: "Web Application Development using React", credits: 3, grade: "O", gradePoint: 10 }
        ]
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onRefreshAll();
        // Clear fields
        setStudentForm({
          regNo: "",
          name: "",
          email: "",
          pin: "1234",
          department: "B.Tech in CSE (AIML)",
          semester: 4,
          attendanceRate: 0,
          sgpaHistory: [],
          cgpa: 0.0,
          subjects: []
        });
        alert("Student record saved successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Delete student
  const handleDeleteStudent = async (regNo: string) => {
    if (!window.confirm(`Delete student record with Registration ID ${regNo}?`)) return;
    try {
      const res = await fetch(`/api/students/${regNo}`, { method: "DELETE" });
      if (res.ok) onRefreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  // Publish a Notice
  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.content) return alert("Title and Content are mandatory");
    
    setLoadingAction("notice");
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeForm)
      });
      if (res.ok) {
        onRefreshAll();
        setNoticeForm({
          title: "",
          content: "",
          category: "Academic",
          author: "Office of the Registrar"
        });
        alert("Board notice published instantly!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (res.ok) onRefreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  // Crawl official website urls
  const handleTriggerScraper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scraperForm.url) return alert("URL is required");

    setLoadingAction("scraper");
    try {
      const res = await fetch("/api/scraper/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scraperForm)
      });
      if (res.ok) {
        onRefreshAll();
        setScraperForm({ url: "", title: "" });
        alert("Crawl indexed successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteScrape = async (url: string) => {
    try {
      const res = await fetch("/api/scraper", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (res.ok) onRefreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle ingesting dropped/selected files
  const handleIngestFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "txt";
    let type = "txt";
    if (extension === "pdf") type = "pdf";
    else if (extension === "csv") type = "csv";
    else if (extension === "json") type = "json";
    else if (extension === "docx") type = "docx";
    else if (["xls", "xlsx"].includes(extension)) type = extension;
    else if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) type = "image";

    const reader = new FileReader();
    
    if (type === "txt" || type === "csv" || type === "json") {
      reader.onload = (e) => {
        setDocFile({
          fileName: file.name,
          fileType: type,
          description: docFile.description || `Academic metadata from ${file.name}`,
          textContent: e.target?.result as string,
          fileContentsBase64: ""
        });
      };
      reader.readAsText(file);
    } else {
      // Binary files: PDF, Images, Word docx, Excel XLS/XLSX
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(",")[1] || result;
        setDocFile({
          fileName: file.name,
          fileType: ["xls", "xlsx", "docx", "pdf"].includes(type) ? type : extension,
          description: docFile.description || `Academic sheet/document ${file.name}`,
          textContent: `[Binary ${file.name} uploaded - Gemini AI will automatically extract notice structures or credit objectives on submit]`,
          fileContentsBase64: base64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload custom document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile.fileName) return alert("File Name is required");
    if (!docFile.textContent && !docFile.fileContentsBase64) return alert("File content is empty! Please upload a file first.");

    setLoadingAction("uploader");
    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: docFile.fileName,
          fileType: docFile.fileType,
          description: docFile.description,
          textContent: docFile.textContent,
          fileContentsBase64: docFile.fileContentsBase64,
          uploader: "Administrative Officer"
        })
      });
      if (res.ok) {
        onRefreshAll();
        setDocFile({ fileName: "", fileType: "txt", description: "", textContent: "", fileContentsBase64: "" });
        alert("Academic file received and indexed by Gemini RAG parser!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (res.ok) onRefreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  const quickSeedTestData = async () => {
    setRefreshing(true);
    // Refresh all states
    onRefreshAll();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div id="admin-panel" className="space-y-6">
      {/* Admin Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-indigo-500 overflow-hidden shrink-0">
            {adminLogo ? (
              <img src={adminLogo} alt="Admin Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-indigo-500" />
            )}
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[8px] text-white font-bold cursor-pointer transition-opacity duration-150">
              <Camera className="w-3.5 h-3.5 mb-0.5" />
              <span>Upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAdminLogoUpload}
              />
            </label>
          </div>
          <div>
            <span className="text-[10px] bg-red-100 text-red-600 dark:bg-rose-950 dark:text-rose-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
              Superuser Control Room
            </span>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              Institutional Settings Console
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span>Configure parameters, crawl syllabus boards, and execute databases updates.</span>
              <span className="hidden sm:inline text-slate-350">•</span>
              <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5 transition">
                <Camera className="w-3 h-3" />
                <span>Upload Custom Admin Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAdminLogoUpload}
                />
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={quickSeedTestData}
          disabled={refreshing}
          className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 hover:bg-indigo-100 transition duration-150 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Reload Infrastructure Databases
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap border-b border-slate-100 dark:border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "students"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" /> Students Ledger
        </button>
        <button
          onClick={() => setActiveTab("notices")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "notices"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Bell className="w-4 h-4" /> Publish Announcements
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "files"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" /> Document intelligence
        </button>
        <button
          onClick={() => setActiveTab("scrapers")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "scrapers"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="w-4 h-4" /> Live Website Crawler
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "stats"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database className="w-4 h-4" /> Engine Databases Statuses
        </button>
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Tab Content Box */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          
          {/* TAB 1: STUDENTS LEDGER */}
          {activeTab === "students" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enrolled Postgre Student Directory</h3>
                <p className="text-[11px] text-slate-400">Total active profiles: {students.length}</p>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3">ID / Reg No</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3 text-center">Semester</th>
                      <th className="p-3 text-center">CGPA Score</th>
                      <th className="p-3 text-center">Attendance</th>
                      <th className="p-3 text-center">Access PIN</th>
                      <th className="p-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.regNo} className="border-b border-slate-50 dark:border-slate-800/30 hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                        <td className="p-3 font-mono font-bold text-indigo-500 dark:text-indigo-400">{student.regNo}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{student.name}</td>
                        <td className="p-3 text-slate-500 max-w-[150px] truncate">{student.department}</td>
                        <td className="p-3 text-center font-mono text-slate-700 dark:text-slate-300">{student.semester}</td>
                        <td className="p-3 text-center font-bold text-emerald-500 font-mono">{student.cgpa}</td>
                        <td className="p-3 text-center">
                          <span className={`${student.attendanceRate < 75 ? "bg-red-50 dark:bg-red-950/20 text-red-500" : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500"}`}>
                            {student.attendanceRate}%
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {visiblePins[student.regNo] ? student.pin || "1234" : "••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVisiblePins(prev => ({ ...prev, [student.regNo]: !prev[student.regNo] }))}
                              className="text-slate-400 hover:text-slate-650 cursor-pointer transition focus:outline-none"
                              title={visiblePins[student.regNo] ? "Hide PIN" : "Show PIN"}
                            >
                              {visiblePins[student.regNo] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteStudent(student.regNo)}
                            className="text-red-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4 ml-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ANNOUNCEMENTS */}
          {activeTab === "notices" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Notice Board</h3>
                <p className="text-[11px] text-slate-400">Total notice logs published: {notices.length}</p>
              </div>

              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4 bg-slate-50/30 dark:bg-slate-800/10">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-semibold">
                          {n.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{n.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5">{n.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-sans">{n.content}</p>
                      <p className="text-[10px] text-indigo-500 mt-1 font-mono">By: {n.author}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNotice(n.id)}
                      className="text-slate-400 hover:text-red-500 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENT INTELLIGENCE */}
          {activeTab === "files" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Multi-Format Document Repository</h3>
                <p className="text-[11px] text-slate-400">Indexed context items: {files.length}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {files.map((file) => (
                  <div key={file.id} className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between bg-slate-50/30 dark:bg-slate-800/10">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono font-bold tracking-tight uppercase">
                          .{file.fileType}
                        </span>
                        <button onClick={() => handleDeleteFile(file.id)} className="text-slate-400 hover:text-red-500 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 truncate">{file.fileName}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 font-sans">{file.description}</p>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800/60 mt-3 pt-2 text-[10px] text-slate-500 flex justify-between items-center">
                      <span>By: {file.uploadedBy}</span>
                      <span className="font-mono">{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WEBPAGE CRAWLS */}
          {activeTab === "scrapers" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Crawl Index Directory</h3>
                <p className="text-[11px] text-slate-400">Total crawled sites: {scrapedPages.length}</p>
              </div>

              <div className="space-y-4">
                {scrapedPages.map((page) => (
                  <div key={page.url} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/20 dark:bg-slate-800/10 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{page.title}</h4>
                        <a href={page.url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline block mt-0.5 font-mono">{page.url}</a>
                      </div>
                      <button onClick={() => handleDeleteScrape(page.url)} className="text-slate-400 hover:text-red-500 transition shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-3 bg-slate-100 dark:bg-slate-800/40 p-2 rounded-lg font-mono text-[9px]">
                      {page.content}
                    </p>
                    <div className="text-[9px] text-slate-400 text-right mt-2 font-mono">
                      Last Indexed: {new Date(page.lastScraped).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ENGINE STATS */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Internal AI Platform Telemetry</h3>
                <p className="text-[11px] text-slate-400">Real-time stats across memory buckets</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50/30">
                  <p className="text-[10px] text-slate-400 uppercase">PostgreSQL Sync</p>
                  <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{students.length} Records</p>
                  <span className="text-[9px] text-slate-500 block mt-2">Active Student Ledger Profile objects.</span>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50/30">
                  <p className="text-[10px] text-slate-400 uppercase">MongoDB BotLogs</p>
                  <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{notices.length} Notices</p>
                  <span className="text-[9px] text-slate-500 block mt-2">Notice entries, logs, and crawler feeds.</span>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50/30">
                  <p className="text-[10px] text-slate-400 uppercase">ChromaDB Vector</p>
                  <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{files.length + scrapedPages.length} Vectors</p>
                  <span className="text-[9px] text-slate-500 block mt-2">Document token partitions index.</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Form Settings Sidebar (Changes according to tab) */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 self-start">
          
          {/* Student edit form */}
          {activeTab === "students" && (
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Add/Edit Student Profile</h4>
              
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">REGISTRATION NO</label>
                <input
                  type="text"
                  placeholder="e.g. 210301120045"
                  required
                  value={studentForm.regNo}
                  onChange={(e) => setStudentForm({ ...studentForm, regNo: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">FULL NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Vinay Venkat"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">UNIVERSITY EMAIL</label>
                <input
                  type="email"
                  placeholder="e.g. student@cutm.ac.in"
                  required
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">ACCESS PIN</label>
                <div className="relative flex items-center">
                  <input
                    type={showAdminFormPin ? "text" : "password"}
                    placeholder="e.g. 1234"
                    required
                    value={studentForm.pin || "1234"}
                    onChange={(e) => setStudentForm({ ...studentForm, pin: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 pr-10 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminFormPin(!showAdminFormPin)}
                    className="absolute right-2 px-1 text-slate-400 hover:text-indigo-500 transition focus:outline-none cursor-pointer"
                    title={showAdminFormPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showAdminFormPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">DEPARTMENT</label>
                <select
                  value={studentForm.department}
                  onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none focus:ring-1"
                >
                  <option value="B.Tech in CSE">B.Tech in CSE</option>
                  <option value="B.Tech in CSE (AIML)">B.Tech in CSE (AIML)</option>
                  <option value="B.Tech in CSE (Data Science)">B.Tech in CSE (Data Science)</option>
                  <option value="B.Tech in CSE (Software Engineering)">B.Tech in CSE (Software Engineering)</option>
                  <option value="B.Tech in CSE (Computer Networking)">B.Tech in CSE (Computer Networking)</option>
                  <option value="B.Tech in CSE (IOT & Cyber Security with Block Chain Technology)">B.Tech in CSE (IOT & Cyber Security with Block Chain Technology)</option>
                  <option value="B.Tech in CSE (Biosciences)">B.Tech in CSE (Biosciences)</option>
                  <option value="MCA">MCA</option>
                  <option value="BCA">BCA</option>
                  <option value="B.Tech in ECE">B.Tech in ECE</option>
                  <option value="B.Tech in ECE (Industry Integrated)">B.Tech in ECE (Industry Integrated)</option>
                  <option value="B.Tech in ECE (Bio Medical)">B.Tech in ECE (Bio Medical)</option>
                  <option value="B.Tech in Aerospace and Drone Technology">B.Tech in Aerospace and Drone Technology</option>
                  <option value="B.Tech in Mechanical Engineering">B.Tech in Mechanical Engineering</option>
                  <option value="B.Tech in Mechanical Engineering (Automobile)">B.Tech in Mechanical Engineering (Automobile)</option>
                  <option value="B.Tech in Mechanical Engineering (Additive Manufacturing)">B.Tech in Mechanical Engineering (Additive Manufacturing)</option>
                  <option value="BBA">BBA</option>
                  <option value="Bachelor of Commerce">Bachelor of Commerce</option>
                  <option value="BBA Logistics & Port Management">BBA Logistics & Port Management</option>
                  <option value="B.Sc in Forensic Science">B.Sc in Forensic Science</option>
                  <option value="Bachelor of Optometry (B.Optom)">Bachelor of Optometry (B.Optom)</option>
                  <option value="B.Sc in Radiology and Imaging Technology">B.Sc in Radiology and Imaging Technology</option>
                  <option value="B.Sc in Anesthesia and Operation Theatre Technology">B.Sc in Anesthesia and Operation Theatre Technology</option>
                  <option value="B. Pharmacy">B. Pharmacy</option>
                  <option value="B.Sc. Cardiovascular Technology">B.Sc. Cardiovascular Technology</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">SEMESTER</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({ ...studentForm, semester: parseInt(e.target.value) })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 rounded-lg text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">ATTENDANCE %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={studentForm.attendanceRate}
                    onChange={(e) => setStudentForm({ ...studentForm, attendanceRate: parseInt(e.target.value) })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 rounded-lg text-xs text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingAction === "student"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2 text-xs font-semibold mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingAction === "student" ? "Processing..." : <><Plus className="w-3.5 h-3.5" /> Save student profile</>}
              </button>
            </form>
          )}

          {/* Notice Board post form */}
          {activeTab === "notices" && (
            <form onSubmit={handlePublishNotice} className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Publish a Notice</h4>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">TITLE</label>
                <input
                  type="text"
                  placeholder="Notice Title headings..."
                  required
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">CATEGORY</label>
                <select
                  value={noticeForm.category}
                  onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value as any })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value="Academic">Academic</option>
                  <option value="Examination">Examination</option>
                  <option value="Placement">Placement</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">SENDER AUTHORITY</label>
                <input
                  type="text"
                  placeholder="e.g. Dean of Placements"
                  required
                  value={noticeForm.author}
                  onChange={(e) => setNoticeForm({ ...noticeForm, author: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 p-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">CONTENT BODY</label>
                <textarea
                  placeholder="Details of the announcement notice..."
                  required
                  rows={4}
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 p-2 rounded-lg text-xs resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAction === "notice"}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-2 text-xs font-semibold mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingAction === "notice" ? "Publishing..." : <><Bell className="w-3.5 h-3.5" /> Publish Announcement</>}
              </button>
            </form>
          )}

          {/* Document Upload Form */}
          {activeTab === "files" && (
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Index Academic Document</h4>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleIngestFile(file);
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".txt,.csv,.json,.pdf,.docx,.xls,.xlsx,image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleIngestFile(file);
                  };
                  input.click();
                }}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-205 ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Upload className="w-5 h-5 animate-pulse" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-755 dark:text-slate-300">
                    Drag & drop files here, or <span className="text-indigo-505 dark:text-indigo-400 select-none underline">custom browse</span>
                  </p>
                  <p className="text-[9px] text-slate-400 leading-snug">
                    Accepts text, CSV, XLS, XLSX, PDF, or image files (with Gemini OCR extractor)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">FILENAME</label>
                <input
                  type="text"
                  placeholder="e.g. machine_learning_syllabus.txt"
                  required
                  value={docFile.fileName}
                  onChange={(e) => setDocFile({ ...docFile, fileName: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 p-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">FORMAT</label>
                <select
                  value={docFile.fileType}
                  onChange={(e) => setDocFile({ ...docFile, fileType: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-100 p-2 rounded-lg text-xs"
                >
                  <option value="txt">TXT Plaintext</option>
                  <option value="csv">CSV Sheet</option>
                  <option value="pdf">PDF Document</option>
                  <option value="docx">Word DOCX</option>
                  <option value="xls">XLS Spreadsheet</option>
                  <option value="xlsx">XLSX Spreadsheet</option>
                  <option value="png">PNG Image</option>
                  <option value="jpg">JPG Image</option>
                  <option value="jpeg">JPEG Image</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">BRIEF EXPLANATION</label>
                <input
                  type="text"
                  placeholder="e.g. Official credits guidelines and course objectives"
                  value={docFile.description}
                  onChange={(e) => setDocFile({ ...docFile, description: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 p-2 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAction === "uploader"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2 text-xs font-semibold mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingAction === "uploader" ? "AI Indexing..." : <><Upload className="w-3.5 h-3.5" /> Parse & Save Document</>}
              </button>
            </form>
          )}

          {/* Crawler Scrape Form */}
          {activeTab === "scrapers" && (
            <form onSubmit={handleTriggerScraper} className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Crawl official link</h4>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">WEBPAGE TITLE</label>
                <input
                  type="text"
                  placeholder="e.g. CUTM Examinations Section"
                  value={scraperForm.title}
                  onChange={(e) => setScraperForm({ ...scraperForm, title: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 p-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">UNIVERSITY URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://cutm.ac.in/examinations"
                  required
                  value={scraperForm.url}
                  onChange={(e) => setScraperForm({ ...scraperForm, url: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 p-2 rounded-lg text-xs font-mono"
                />
              </div>

              <p className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2 rounded font-sans leading-normal">
                Crawls will extract notice banners, exams announcements, placements URLs in real-time. In sandboxed mode, Gemini generates clean, simulated crawl targets for safe operational trials.
              </p>

              <button
                type="submit"
                disabled={loadingAction === "scraper"}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg p-2 text-xs font-semibold mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingAction === "scraper" ? "Crawling..." : <><Globe className="w-3.5 h-3.5" /> Triggers Crawl Scrape</>}
              </button>
            </form>
          )}

          {/* General telemetries layout */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Systems Setup Config</h4>
              <div className="text-xs border border-slate-200 p-4 rounded-xl leading-relaxed space-y-2 text-slate-600">
                <p>📊 **Core Engine API Context**:</p>
                <p className="font-mono text-[9px] bg-slate-100 p-1.5 rounded text-neutral-700">Service: @google/genai TS SDK</p>
                <p className="font-mono text-[9px] bg-slate-100 p-1.5 rounded text-neutral-700">Active Model: gemini-3.5-flash</p>
                <p>⚙️ **Operational Thresholds**:</p>
                <p className="font-sans text-[10px]">SGPA limits: \`0.00 - 10.00\`</p>
                <p className="font-sans text-[10px]">Daily crawl rate limit: \`100 URLs\`</p>
                <p className="font-sans text-[10px]">Automatic cache validation: \`Enabled\`</p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
