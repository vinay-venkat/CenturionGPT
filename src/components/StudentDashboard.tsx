import React, { useState, useEffect } from "react";
import { StudentRecord, SubjectGrade } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BookOpen, Calendar, CircleUser, Award, Percent, AlertTriangle, ChevronRight, GraduationCap, Calculator, Plus, Trash2, X, Save, AlertCircle, Camera, Eye, EyeOff } from "lucide-react";

interface StudentDashboardProps {
  profile: StudentRecord;
  onAskAI: (query: string) => void;
  onRefresh?: () => void;
}

export default function StudentDashboard({ profile, onAskAI, onRefresh }: StudentDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showStudentPin, setShowStudentPin] = useState(false);
  const [studentLogo, setStudentLogo] = useState<string | null>(() => {
    return localStorage.getItem(`cutm_logo_student_${profile.regNo}`);
  });

  const handleStudentLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setStudentLogo(dataUrl);
      localStorage.setItem(`cutm_logo_student_${profile.regNo}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcSubjects, setCalcSubjects] = useState<SubjectGrade[]>([]);
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCredits, setNewSubCredits] = useState(4);
  const [newSubGrade, setNewSubGrade] = useState("O");
  const [isCalcSaving, setIsCalcSaving] = useState(false);
  const [calcSaveError, setCalcSaveError] = useState<string | null>(null);
  const [calcSaveSuccess, setCalcSaveSuccess] = useState<string | null>(null);

  // Edit Profile Info States
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editDept, setEditDept] = useState(profile.department);
  const [editSem, setEditSem] = useState(profile.semester);
  const [editAtt, setEditAtt] = useState(profile.attendanceRate);
  const [editPin, setEditPin] = useState(profile.pin || "1234");
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Sync state with profile updates
  useEffect(() => {
    if (profile) {
      setEditName(profile.name);
      setEditEmail(profile.email);
      setEditDept(profile.department);
      setEditSem(profile.semester);
      setEditAtt(profile.attendanceRate);
      setEditPin(profile.pin || "1234");
    }
  }, [profile]);

  // Manage SGPA History States
  const [isEditHistoryOpen, setIsEditHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [newHistSem, setNewHistSem] = useState<number>(1);
  const [newHistSgpa, setNewHistSgpa] = useState<string>("8.50");
  const [isHistSaving, setIsHistSaving] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.sgpaHistory) {
      setHistoryList([...profile.sgpaHistory]);
    }
  }, [profile, isEditHistoryOpen]);

  const handleSaveProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditSaving(true);
    setEditError(null);
    try {
      // Recompute CGPA with updated details
      const totalCredits = profile.subjects.reduce((sum, s) => sum + s.credits, 0);
      const weightedPoints = profile.subjects.reduce((sum, s) => sum + (s.credits * gradeToPoint(s.grade)), 0);
      const calculatedSgpa = totalCredits > 0 ? (weightedPoints / totalCredits) : 0;
      
      const computedCgpa = profile.sgpaHistory.length > 0 
        ? (profile.sgpaHistory.reduce((sum, s) => sum + s.sgpa, 0) + calculatedSgpa) / (profile.sgpaHistory.length + (totalCredits > 0 ? 1 : 0))
        : calculatedSgpa;

      const updatedProfile: StudentRecord = {
        ...profile,
        name: editName.trim(),
        email: editEmail.trim(),
        department: editDept,
        semester: Number(editSem),
        attendanceRate: Number(editAtt),
        pin: editPin,
        cgpa: Number(computedCgpa.toFixed(2))
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      });
      if (!res.ok) throw new Error("Could not update profile information.");
      
      if (onRefresh) onRefresh();
      setIsEditInfoOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to edit profile.");
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleSaveSgpaHistory = async () => {
    setIsHistSaving(true);
    setHistError(null);
    try {
      // Recompute CGPA with updated historyList
      const totalCredits = profile.subjects.reduce((sum, s) => sum + s.credits, 0);
      const weightedPoints = profile.subjects.reduce((sum, s) => sum + (s.credits * gradeToPoint(s.grade)), 0);
      const calculatedSgpa = totalCredits > 0 ? (weightedPoints / totalCredits) : 0;

      const sumPastSgpa = historyList.reduce((sum, s) => sum + s.sgpa, 0);
      const computedCgpa = historyList.length > 0
        ? (sumPastSgpa + (totalCredits > 0 ? calculatedSgpa : 0)) / (historyList.length + (totalCredits > 0 ? 1 : 0))
        : calculatedSgpa;

      const updatedProfile: StudentRecord = {
        ...profile,
        sgpaHistory: historyList,
        cgpa: Number(computedCgpa.toFixed(2))
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      });
      if (!res.ok) throw new Error("Could not update SGPA history database logs.");
      
      if (onRefresh) onRefresh();
      setIsEditHistoryOpen(false);
    } catch (err: any) {
      setHistError(err.message || "Failed to update SGPA history.");
    } finally {
      setIsHistSaving(false);
    }
  };

  const handleAddSgpaHistoryItem = () => {
    const semNum = Number(newHistSem);
    const sgpaVal = parseFloat(newHistSgpa);
    if (isNaN(semNum) || isNaN(sgpaVal) || sgpaVal < 0 || sgpaVal > 10) {
      alert("Please provide a valid SGPA value between 0.00 and 10.00!");
      return;
    }
    const dup = historyList.find(h => h.semester === semNum);
    if (dup) {
      alert(`Semester ${semNum} record already exists in lists! Please remove it first to recreate.`);
      return;
    }
    setHistoryList(prev => [...prev, { semester: semNum, sgpa: sgpaVal }].sort((a,b) => a.semester - b.semester));
  };

  const handleRemoveSgpaHistoryItem = (sem: number) => {
    setHistoryList(prev => prev.filter(h => h.semester !== sem));
  };

  // Load profile subjects when calculator is opened or profile changes
  useEffect(() => {
    if (profile && profile.subjects) {
      setCalcSubjects([...profile.subjects]);
    }
  }, [profile, isCalcOpen]);

  // Convert letter grade to points
  const gradeToPoint = (grade: string): number => {
    switch (grade.toUpperCase()) {
      case "O": return 10;
      case "E": return 9;
      case "A": return 8;
      case "B": return 7;
      case "C": return 6;
      case "D": return 5;
      case "F": return 0;
      default: return 0;
    }
  };

  const pointToGrade = (point: number): string => {
    if (point >= 10) return "O";
    if (point >= 9) return "E";
    if (point >= 8) return "A";
    if (point >= 7) return "B";
    if (point >= 6) return "C";
    if (point >= 5) return "D";
    return "F";
  };

  // Live SGPA Calculations
  const totalCredits = calcSubjects.reduce((sum, s) => sum + s.credits, 0);
  const weightedPoints = calcSubjects.reduce((sum, s) => sum + (s.credits * gradeToPoint(s.grade)), 0);
  const calculatedSgpa = totalCredits > 0 ? (weightedPoints / totalCredits) : 0;

  // Live CGPA Calculation based on past semesters + current semester simulation
  const computedCgpa = profile.sgpaHistory.length > 0 
    ? (profile.sgpaHistory.reduce((sum, s) => sum + s.sgpa, 0) + calculatedSgpa) / (profile.sgpaHistory.length + 1)
    : calculatedSgpa;

  // Save updated grades back to database
  const handleSaveGradesToProfile = async () => {
    setIsCalcSaving(true);
    setCalcSaveError(null);
    setCalcSaveSuccess(null);
    try {
      const updatedProfile: StudentRecord = {
        ...profile,
        subjects: calcSubjects,
        cgpa: computedCgpa
      };
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      });
      if (!res.ok) throw new Error("Could not update profile grades in database ledger.");
      
      setCalcSaveSuccess("Original student academic records updated successfully!");
      if (onRefresh) onRefresh();
      setTimeout(() => {
        setIsCalcOpen(false);
        setCalcSaveSuccess(null);
      }, 1500);
    } catch (e: any) {
      setCalcSaveError(e.message || "Failed to update profile.");
    } finally {
      setIsCalcSaving(false);
    }
  };

  const handleAddSubjectToCalc = () => {
    if (!newSubCode.trim() || !newSubName.trim()) {
      alert("Please specify both subject code and title!");
      return;
    }
    const dup = calcSubjects.find(s => s.code.toUpperCase() === newSubCode.toUpperCase().trim());
    if (dup) {
      alert("Subject code already exists in simulated records!");
      return;
    }

    const newItem: SubjectGrade = {
      code: newSubCode.toUpperCase().trim(),
      name: newSubName.trim(),
      credits: Number(newSubCredits),
      grade: newSubGrade,
      gradePoint: gradeToPoint(newSubGrade)
    };

    setCalcSubjects(prev => [...prev, newItem]);
    setNewSubCode("");
    setNewSubName("");
    setNewSubCredits(4);
    setNewSubGrade("O");
  };

  const handleRemoveSubjectFromCalc = (code: string) => {
    setCalcSubjects(prev => prev.filter(s => s.code !== code));
  };

  const handleUpdateGradeInCalc = (code: string, grade: string) => {
    setCalcSubjects(prev => prev.map(s => {
      if (s.code === code) {
        return {
          ...s,
          grade: grade,
          gradePoint: gradeToPoint(grade)
        };
      }
      return s;
    }));
  };

  const filteredSubjects = profile.subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Recharts data format
  const sgpaData = profile.sgpaHistory.map((item) => ({
    name: `Sem ${item.semester}`,
    SGPA: item.sgpa,
  }));

  // Colors for attendance
  const attendanceColor = profile.attendanceRate >= 75 ? "#10b981" : "#ef4444";
  const attendanceData = [
    { name: "Attended", value: profile.attendanceRate },
    { name: "Absent", value: 100 - profile.attendanceRate },
  ];

  return (
    <div id="student-dashboard" className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 text-white shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 overflow-hidden shrink-0">
            {studentLogo ? (
              <img src={studentLogo} alt="Personal Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <GraduationCap className="w-9 h-9" />
            )}
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] text-white font-bold cursor-pointer transition-opacity duration-150">
              <Camera className="w-4 h-4 mb-0.5" />
              <span>Upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleStudentLogoUpload}
              />
            </label>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{profile.name}</h2>
              <span className="text-[10px] bg-slate-700/80 px-2 py-0.5 rounded-full border border-slate-600 font-mono text-slate-300">
                Reg: {profile.regNo}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1.5 font-sans">
              {profile.department} • <span className="font-semibold">Semester {profile.semester}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-slate-500 text-[11px]">{profile.email}</p>
              <span className="text-slate-600 select-none text-[10px]">•</span>
              <label className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer transition flex items-center gap-0.5">
                <Camera className="w-3 h-3" />
                <span>Upload Custom Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleStudentLogoUpload}
                />
              </label>
              <span className="text-slate-600 select-none text-[10px]">•</span>
              <button
                type="button"
                onClick={() => setIsEditInfoOpen(true)}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-0.5 cursor-pointer bg-none border-none outline-none"
              >
                <Plus className="w-3 h-3" />
                <span>Add / Edit Profile Info</span>
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1.5 bg-slate-800/40 border border-slate-700/60 rounded-lg px-2.5 py-0.5 w-fit">
              <span className="text-[10px] font-mono text-slate-400">Security PIN:</span>
              <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                {showStudentPin ? profile.pin || "1234" : "••••"}
              </span>
              <button 
                type="button"
                onClick={() => setShowStudentPin(!showStudentPin)}
                className="text-slate-400 hover:text-slate-200 transition focus:outline-none ml-1 cursor-pointer"
                title="Toggle PIN Visibility"
              >
                {showStudentPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/40 border border-slate-700/30 p-4 rounded-xl shrink-0">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="text-center min-w-[70px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Current CGPA</p>
              <p className="text-2xl font-bold text-indigo-400 mt-0.5">{profile.cgpa.toFixed(2)}</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-700/50"></div>
            <div className="text-center min-w-[70px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Subjects</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{profile.subjects.length}</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-700/50"></div>
            <div className="text-center min-w-[70px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Attendance</p>
              <p className={`text-2xl font-bold mt-0.5 ${profile.attendanceRate < 75 ? "text-red-400" : "text-emerald-400"}`}>
                {profile.attendanceRate}%
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCalcOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 active:translate-y-0.5 cursor-pointer"
            title="Calculate and simulate current SGPA / CGPA dynamically"
          >
            <Calculator className="w-4 h-4" />
            <span>CGPA Calculator</span>
          </button>
        </div>
      </div>

      {/* Attendance Caution Warnings */}
      {profile.attendanceRate < 75 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-800 dark:text-red-400">Institutional Examination Alert</p>
            <p className="text-[11px] text-red-700 dark:text-red-300/80 mt-1">
              Your registered attendance rate ({profile.attendanceRate}%) is currently below the mandatory **75% minimum university threshold**. You are advised to request clarification regarding make-up classes or ask CenturionGPT:
              <button
                onClick={() => onAskAI("How can I raise my CSE attendance percentage above 75%?")}
                className="ml-1 text-red-600 underline font-medium hover:text-red-800 transition"
              >
                "Help me raise my attendance rate"
              </button>
            </p>
          </div>
        </div>
      )}

      {/* 2. Visual Analytics Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester GPA Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Semester SGPA Growth Curve</h3>
              <p className="text-[11px] text-slate-400">Academic performance metric trackers</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditHistoryOpen(true)}
                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900 border border-indigo-100/20 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md font-sans font-bold cursor-pointer transition flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" /> Add Past Sem GPA
              </button>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md font-mono shrink-0">
                Avg: {profile.sgpaHistory && profile.sgpaHistory.length > 0 
                  ? (profile.sgpaHistory.reduce((s, h) => s + h.sgpa, 0) / profile.sgpaHistory.length).toFixed(2) 
                  : "0.00"}
              </span>
            </div>
          </div>

          <div className="h-60 w-full font-mono text-xs font-semibold">
            {profile.sgpaHistory && profile.sgpaHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sgpaData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[5, 10]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="SGPA"
                    stroke="#6366f1"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                    dot={{ r: 4, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-450 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/10 space-y-2">
                <p className="text-xs text-slate-500 font-sans">No past semester SGPA history has been registered.</p>
                <button
                  type="button"
                  onClick={() => setIsEditHistoryOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition font-bold leading-none text-xs rounded-lg shadow-sm"
                >
                  Configure semesters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Ring Gauge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Attendance Standing</h3>
              <p className="text-[11px] text-slate-400">Aggregated lecture hours participation</p>
            </div>
            <button
              onClick={() => setIsEditInfoOpen(true)}
              className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md mb-2 font-sans font-bold cursor-pointer transition shrink-0"
            >
              Update
            </button>
          </div>

          <div className="h-40 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  <Cell fill={attendanceColor} />
                  <Cell fill="#f1f5f9" className="dark:fill-slate-800" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-2xl font-bold tracking-tight font-mono" style={{ color: attendanceColor }}>
                {profile.attendanceRate}%
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Required: 75%</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500">
              {profile.attendanceRate >= 75
                ? "🎉 You meet all criteria for semester-end examination hall entries."
                : "🚨 Attention required to meet lecture benchmarks."}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Subjects & Grades Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Subject Ledgers</h3>
            <p className="text-[11px] text-slate-400">Course credits and grade points breakdown</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCalcOpen(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-100/20 dark:border-indigo-900/30 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add / Manage Subject</span>
            </button>
            <input
              type="text"
              placeholder="Search code or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none w-full sm:w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Subject Code</th>
                <th className="py-2.5 px-3">Subject Title</th>
                <th className="py-2.5 px-3 text-center">Credits Weight</th>
                <th className="py-2.5 px-3 text-center">Grade Point</th>
                <th className="py-2.5 px-3 text-center">Registered Letter</th>
                <th className="py-2.5 px-3 text-right">Quick AI Ask</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => (
                  <tr
                    key={subject.code}
                    className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {subject.code}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {subject.name}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {subject.credits} CR
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                        {subject.gradePoint}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`font-semibold shrink-0 px-2 py-0.5 rounded-full text-[10px] ${
                          subject.grade === "O" || subject.grade === "E"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {subject.grade}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onAskAI(`What is the syllabus, content and scope of ${subject.name} (${subject.code})?`)}
                        className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-end gap-0.5 ml-auto text-[11px] font-sans"
                      >
                        Syllabus Guide <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-sans space-y-3">
                    <p className="text-xs text-slate-500">No active subject records exist in your portfolio ledger.</p>
                    <button
                      type="button"
                      onClick={() => setIsCalcOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/10 cursor-pointer active:translate-y-0.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add / Sync Subject Records Now</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proposed Academic Assistant queries */}
      <div className="bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-slate-900 dark:to-slate-900 border border-indigo-100/50 dark:border-slate-800 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-indigo-800 dark:text-slate-300 mb-2">Personal Assistant Recommendations</h4>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onAskAI("Analyze my current grades. What is my total CGPA and how can I sustain it?")}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-indigo-400 text-slate-700 dark:text-slate-300 cursor-pointer transition"
          >
            📊 Analyze CGPA Progress
          </button>
          <button
            onClick={() => onAskAI("Show me the syllabus, exams calendar policies and schedules")}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-indigo-400 text-slate-700 dark:text-slate-300 cursor-pointer transition"
          >
            📅 Show Exams Calendars
          </button>
          <button
            onClick={() => onAskAI("Are there any placement guidelines or notice boards updates available?")}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-indigo-400 text-slate-700 dark:text-slate-300 cursor-pointer transition"
          >
            💼 View Placement Notices
          </button>
        </div>
      </div>

      {/* Dynamic CGPA & SGPA Calculator Modal */}
      {isCalcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Calculator className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">SGPA/CGPA Dynamic Simulator</h3>
              </div>
              <button
                onClick={() => setIsCalcOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40 rounded-xl space-y-1">
                <p className="font-semibold text-indigo-900 dark:text-indigo-300 text-[11px]">Academic Grading Calculations</p>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Simulate your semester 4 grades to predict SGPA and aggregate CGPA. Add, edit, or delete customized lecture parameters seamlessly.
                </p>
              </div>

              {/* SGPA & CGPA stats widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold block">Simulated SGPA</span>
                  <span className="text-2xl font-extrabold text-indigo-500 mt-1 block">{calculatedSgpa.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 font-mono">({weightedPoints} Pts / {totalCredits} Credits)</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold block">Simulated CGPA</span>
                  <span className="text-2xl font-extrabold text-emerald-500 mt-1 block">{computedCgpa.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 font-mono">({profile.sgpaHistory.length + 1} Sems aggregate)</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold block">Credits Total</span>
                  <span className="text-2xl font-extrabold text-slate-600 dark:text-slate-300 mt-1 block">{totalCredits}</span>
                  <span className="text-[9px] text-slate-400 font-mono">For 4th semester courses</span>
                </div>
              </div>

              {/* Alerts if any */}
              {calcSaveError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{calcSaveError}</span>
                </div>
              )}
              {calcSaveSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-650 dark:text-emerald-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>{calcSaveSuccess}</span>
                </div>
              )}

              {/* Dynamic subjects list */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Simulated Semester 4 Courses</span>
                <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-52 overflow-y-auto">
                  {calcSubjects.map((sub) => (
                    <div key={sub.code} className="p-3 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/30 transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{sub.code}</span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono font-semibold">{sub.credits} Credits</span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">{sub.name}</p>
                      </div>
                      <div className="flex items-center gap-3 justify-end sm:justify-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Grade:</span>
                          <select
                            value={sub.grade}
                            onChange={(e) => handleUpdateGradeInCalc(sub.code, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg px-2 py-1 text-xs font-mono font-bold outline-none text-slate-700 dark:text-slate-200"
                          >
                            <option value="O">O (10 Points)</option>
                            <option value="E">E (9 Points)</option>
                            <option value="A">A (8 Points)</option>
                            <option value="B">B (7 Points)</option>
                            <option value="C">C (6 Points)</option>
                            <option value="D">D (5 Points)</option>
                            <option value="F">F (0 Points)</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleRemoveSubjectFromCalc(sub.code)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-red-500 hover:text-red-650 transition cursor-pointer"
                          title="Delete simulator course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Custom Simulator Subject */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold block">➕ Add Custom Subject Simulator</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <input
                      type="text"
                      placeholder="e.g. CUCS2001"
                      value={newSubCode}
                      onChange={(e) => setNewSubCode(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Course name / topic description"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="col-span-1 font-mono">
                    <select
                      value={newSubCredits}
                      onChange={(e) => setNewSubCredits(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs outline-none text-slate-800 dark:text-slate-100 font-bold"
                    >
                      <option value="1">1 CR</option>
                      <option value="2">2 CR</option>
                      <option value="3">3 CR</option>
                      <option value="4">4 CR</option>
                      <option value="6">6 CR</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">Assumed Grade:</span>
                    <select
                      value={newSubGrade}
                      onChange={(e) => setNewSubGrade(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-250 font-bold"
                    >
                      <option value="O">O (10 Pts)</option>
                      <option value="E">E (9 Pts)</option>
                      <option value="A">A (8 Pts)</option>
                      <option value="B">B (7 Pts)</option>
                      <option value="C">C (6 Pts)</option>
                      <option value="D">D (5 Pts)</option>
                      <option value="F">F (0 Pts)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubjectToCalc}
                    className="p-1.5 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-350 font-bold transition flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Course Parameter
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono italic">
                SGPAs calculation matches standard Centurion University rules.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalcSubjects([...profile.subjects]);
                    setCalcSaveError(null);
                    setCalcSaveSuccess(null);
                  }}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-707 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer text-xs"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  disabled={isCalcSaving}
                  onClick={handleSaveGradesToProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:bg-slate-400 text-xs"
                >
                  {isCalcSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving to ledger...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Sync to Portal</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Profile Info Modal */}
      {isEditInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Add / Edit Academic Registry Data</h3>
              </div>
              <button
                onClick={() => setIsEditInfoOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-755 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveProfileInfo} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {editError && (
                <div className="p-3 bg-red-50 dark:bg-red-955/20 border border-red-200/50 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase font-bold tracking-wider">Student Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-sans font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase font-bold tracking-wider">University Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-sans font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase font-bold tracking-wider">Semester</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={editSem}
                    onChange={(e) => setEditSem(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs text-center outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase font-bold tracking-wider">Attendance Rate (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={editAtt}
                    onChange={(e) => setEditAtt(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs text-center outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase font-bold tracking-wider">Department / Branch specialization</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-sans font-semibold"
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
                  <option value="B.Tech in Civil Engineering">B.Tech in Civil Engineering</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase font-bold tracking-wider">Security PIN</label>
                <input
                  type="text"
                  required
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              {/* Save Controls */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditInfoOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer text-xs"
                >
                  {isEditSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving info...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Sync Info</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit SGPA History Modal */}
      {isEditHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Manage Past Semesters GPA Records</h3>
              </div>
              <button
                onClick={() => setIsEditHistoryOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-755 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs font-sans">
              {histError && (
                <div className="p-3 bg-red-50 dark:bg-red-955/20 border border-red-200/50 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-lg flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{histError}</span>
                </div>
              )}

              {/* Semester adder form */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 border border-slate-100 dark:border-slate-800/60 rounded-xl space-y-3">
                <p className="font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider text-[10px] font-mono">Add Past Semester Card</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">SEMESTER</label>
                    <select
                      value={newHistSem}
                      onChange={(e) => setNewHistSem(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">SGPA SCORE</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={newHistSgpa}
                      onChange={(e) => setNewHistSgpa(e.target.value)}
                      placeholder="e.g. 8.50"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddSgpaHistoryItem}
                  className="w-full p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Semester Record
                </button>
              </div>

              {/* Semester active cards */}
              <div className="space-y-2">
                <p className="font-bold text-slate-400 block uppercase tracking-wider text-[10px] font-mono">Current Registered Semesters History</p>
                {historyList.length > 0 ? (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto">
                    {historyList.map(item => (
                      <div key={item.semester} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between hover:bg-slate-50/40 transition">
                        <span className="font-sans font-bold text-slate-700 dark:text-slate-300 text-xs">Semester {item.semester}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-extrabold text-indigo-500 text-xs">{parseFloat(item.sgpa).toFixed(2)} SGPA</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSgpaHistoryItem(item.semester)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-red-500 hover:text-red-750 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 font-sans border border-dashed border-slate-150 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-950/10">
                    No past semesters records listed yet. Use the tool above to add.
                  </div>
                )}
              </div>

              {/* Save Controls */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-805">
                <span className="text-[10px] text-slate-450 italic font-mono">Changes dynamically update the live Portal CGPA.</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditHistoryOpen(false)}
                    className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isHistSaving}
                    onClick={handleSaveSgpaHistory}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    {isHistSaving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Sync History</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
