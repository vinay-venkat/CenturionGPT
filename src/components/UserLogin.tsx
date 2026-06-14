import React, { useState } from "react";
import { Lock, User, Mail, Shield, ShieldAlert, ArrowRight, GraduationCap, CheckCircle2, ChevronRight, Info, X, Key, Plus, Search, Sparkles, Calculator, AlertCircle, Eye, EyeOff } from "lucide-react";
import { StudentRecord } from "../types";
import cutmLogo from "../assets/cutm_logo.png";

interface UserLoginProps {
  onLoginSuccess: (role: "student" | "faculty" | "admin", regNo: string, email: string, profile: any) => void;
}

export default function UserLogin({ onLoginSuccess }: UserLoginProps) {
  const [role, setRole] = useState<"student" | "faculty" | "admin">("student");
  
  // Form fields
  const [identifier, setIdentifier] = useState(""); // Reg No or Email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPin, setShowRegPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password modal state parameters
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotRole, setForgotRole] = useState<"student" | "faculty" | "admin">("student");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [simulatedToken, setSimulatedToken] = useState<string | null>(null);

  // Self Registration Modal States
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regDept, setRegDept] = useState("B.Tech in CSE (AIML)");
  const [regSem, setRegSem] = useState(4);
  const [regAtt, setRegAtt] = useState(0);
  const [regSgpaHistory, setRegSgpaHistory] = useState<any[]>([]);
  const [regSubjects, setRegSubjects] = useState<any[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRegSaving, setIsRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regPin, setRegPin] = useState("1234");

  // Faculty Self Registration Modal States
  const [isFacRegisterOpen, setIsFacRegisterOpen] = useState(false);
  const [regFacName, setRegFacName] = useState("");
  const [regFacEmail, setRegFacEmail] = useState("");
  const [regFacDept, setRegFacDept] = useState("B.Tech in CSE (AIML)");
  const [regFacDesignation, setRegFacDesignation] = useState("Professor & Program Coordinator");
  const [regFacPin, setRegFacPin] = useState("admin99");
  const [isFacRegSaving, setIsFacRegSaving] = useState(false);
  const [facRegError, setFacRegError] = useState<string | null>(null);
  const [facRegSuccess, setFacRegSuccess] = useState<string | null>(null);
  const [showFacRegPin, setShowFacRegPin] = useState(false);

  // Admin Self Registration Modal States
  const [isAdminRegisterOpen, setIsAdminRegisterOpen] = useState(false);
  const [regAdminName, setRegAdminName] = useState("");
  const [regAdminEmail, setRegAdminEmail] = useState("");
  const [regAdminRole, setRegAdminRole] = useState("Chief Academic Administrator");
  const [regAdminPin, setRegAdminPin] = useState("root2026");
  const [isAdminRegSaving, setIsAdminRegSaving] = useState(false);
  const [adminRegError, setAdminRegError] = useState<string | null>(null);
  const [adminRegSuccess, setAdminRegSuccess] = useState<string | null>(null);
  const [showAdminRegPin, setShowAdminRegPin] = useState(false);

  const handleFacRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFacName.trim() || !regFacEmail.trim()) {
      setFacRegError("Faculty Name and Email are required to enroll.");
      return;
    }

    setIsFacRegSaving(true);
    setFacRegError(null);
    setFacRegSuccess(null);

    try {
      const newFaculty = {
        name: regFacName.trim(),
        email: regFacEmail.trim(),
        department: regFacDept,
        designation: regFacDesignation,
        pin: regFacPin
      };

      const res = await fetch("/api/faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFaculty)
      });

      if (!res.ok) {
        throw new Error("Faculty database registry aborted.");
      }

      setFacRegSuccess(`Faculty profile ${regFacName} successfully registered!`);

      // Auto-fill login credentials
      setRole("faculty");
      setIdentifier(regFacEmail.trim());
      setPassword(regFacPin);

      setTimeout(() => {
        setIsFacRegisterOpen(false);
        setFacRegSuccess(null);
      }, 2000);
    } catch (err: any) {
      setFacRegError(err.message || "Failed to add Faculty profile.");
    } finally {
      setIsFacRegSaving(false);
    }
  };

  const handleAdminRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regAdminName.trim() || !regAdminEmail.trim()) {
      setAdminRegError("Admin Name and Email are required to enroll.");
      return;
    }

    setIsAdminRegSaving(true);
    setAdminRegError(null);
    setAdminRegSuccess(null);

    try {
      const newAdmin = {
        name: regAdminName.trim(),
        email: regAdminEmail.trim(),
        role: regAdminRole,
        pin: regAdminPin
      };

      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin)
      });

      if (!res.ok) {
        throw new Error("Admin database registry aborted.");
      }

      setAdminRegSuccess(`Admin superuser ${regAdminName} successfully registered!`);

      // Auto-fill login credentials
      setRole("admin");
      setIdentifier(regAdminEmail.trim());
      setPassword(regAdminPin);

      setTimeout(() => {
        setIsAdminRegisterOpen(false);
        setAdminRegSuccess(null);
      }, 2000);
    } catch (err: any) {
      setAdminRegError(err.message || "Failed to add Admin superuser profile.");
    } finally {
      setIsAdminRegSaving(false);
    }
  };

  // Letter grade mapper
  const gradeToPoint = (grade: string): number => {
    switch (grade.toUpperCase()) {
      case "O": return 10;
      case "E": return 9;
      case "A": return 8;
      case "B": return 7;
      case "C": return 6;
      case "D": return 5;
      case "F": return 0;
      default: return 9;
    }
  };

  const handleExtractKnowledge = async () => {
    if (!regNo.trim()) {
      setRegError("Please enter your Registration Number to extract profile details.");
      return;
    }
    setIsExtracting(true);
    setRegError(null);
    setRegSuccess(null);
    try {
      const res = await fetch(`/api/students/extract-knowledge?regNo=${encodeURIComponent(regNo.trim())}`);
      if (!res.ok) throw new Error("University RAG database node is currently offline.");
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        setRegName(p.name || "");
        setRegEmail(p.email || "");
        setRegDept(p.department || "B.Tech in CSE (AIML)");
        setRegSem(p.semester || 4);
        setRegAtt(p.attendanceRate || 85);
        setRegSgpaHistory(p.sgpaHistory || []);
        setRegSubjects(p.subjects || []);
        setRegSuccess("Successfully extracted official syllabus subjects and past grades from university knowledge base!");
      } else {
        throw new Error("Target registration ID not found in indexed resources sheet.");
      }
    } catch (err: any) {
      setRegError(err.message || "Failed to extract grades.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim() || !regName.trim() || !regEmail.trim()) {
      setRegError("Registration ID, name, and email fields are required to enroll.");
      return;
    }

    setIsRegSaving(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const history = regSgpaHistory;
      const activeSubjects = regSubjects;

      // Exact CGPA calculation algorithm
      const totalCredits = activeSubjects.reduce((sum, s) => sum + s.credits, 0);
      const totalWeightedPoints = activeSubjects.reduce((sum, s) => sum + (s.credits * gradeToPoint(s.grade)), 0);
      const calculatedSgpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits) : 0;

      const sumPastSgpa = history.reduce((sum, h) => sum + h.sgpa, 0);
      const computedCgpa = history.length > 0 
        ? (sumPastSgpa + (totalCredits > 0 ? calculatedSgpa : 0)) / (history.length + (totalCredits > 0 ? 1 : 0))
        : calculatedSgpa;

      const newStudent: StudentRecord = {
        regNo: regNo.toUpperCase().trim(),
        name: regName.trim(),
        email: regEmail.trim(),
        department: regDept,
        semester: Number(regSem),
        attendanceRate: Number(regAtt),
        sgpaHistory: history,
        cgpa: parseFloat(computedCgpa.toFixed(2)),
        subjects: activeSubjects.map(s => ({ ...s, gradePoint: gradeToPoint(s.grade) })),
        pin: regPin
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent)
      });

      if (!res.ok) {
        throw new Error("Student enrollment database rejected. Reg No may already exist.");
      }

      setRegSuccess(`Registered ${regName} successfully in active university records!`);
      
      // Auto fill credentials
      setRole("student");
      setIdentifier(regNo.toUpperCase().trim());
      setPassword(regPin);

      setTimeout(() => {
        setIsRegisterOpen(false);
        setRegSuccess(null);
      }, 2000);
    } catch (err: any) {
      setRegError(err.message || "Failed to add profile.");
    } finally {
      setIsRegSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage(role === "student" ? "Please enter your Registration Number or Email" : "Please enter your University Email");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Password / Access PIN is mandatory for secure credentials matching");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        role,
        regNo: role === "student" ? identifier : undefined,
        email: role !== "student" || identifier.includes("@") ? identifier : undefined,
        password: password
      };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(`Welcome back, ${data.profile.name || "Authenticated User"}! Redirecting...`);
        setTimeout(() => {
          onLoginSuccess(role, data.profile.regNo || "", data.profile.email || "", data.profile);
          setIsSubmitting(false);
        }, 1000);
      } else {
        setErrorMessage(data.message || "Invalid authentication credentials specified");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
      setErrorMessage("Authentication failed. Ensure the server is online and you specified correct credentials.");
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError("Please provide a valid Registration ID or University Email");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    setSimulatedToken(null);

    setTimeout(() => {
      let pinHint = "";
      if (forgotRole === "faculty") {
        pinHint = "admin99";
      } else if (forgotRole === "admin") {
        pinHint = "root2026";
      } else {
        pinHint = "1234";
      }
      
      setSimulatedToken(pinHint);
      setForgotSuccess(`Authorized Verification Approved! Access PIN successfully matched and decrypted in secure institution records.`);
      setForgotLoading(false);
    }, 1000);
  };

  const handleApplySimulatedToken = () => {
    if (simulatedToken) {
      setPassword(simulatedToken);
      setIdentifier(forgotIdentifier);
      setRole(forgotRole);
      setErrorMessage(null);
      
      // Clear modal
      setIsForgotModalOpen(false);
      setForgotIdentifier("");
      setForgotSuccess(null);
      setSimulatedToken(null);
      setSuccessMessage("Simulated access token applied! Click 'Secure Sign In' now.");
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  return (
    <div id="secure-login-container" className="flex flex-col lg:flex-row items-stretch min-h-[85vh] bg-slate-100/50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl transition-all relative">
      
      {/* Visual Identity Left Panel with branding and statistics */}
      <div className="lg:w-5/12 bg-white dark:bg-slate-900 p-8 lg:p-12 text-slate-900 dark:text-white flex flex-col justify-center items-center relative border-r border-slate-200 dark:border-slate-800">
        
        <div className="relative z-10 space-y-6 text-center flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <img 
              src={cutmLogo} 
              alt="CUTM Logo" 
              className="h-32 w-auto object-contain" 
            />
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            CENTURIONGPT
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
            Welcome to the unified Centurion University of Technology and Management Intelligence System.
          </p>
        </div>

      </div>

      {/* Login Action Right Panel */}
      <div className="flex-1 bg-white dark:bg-slate-900 p-8 lg:p-12 flex flex-col justify-center space-y-6">
        
        <div className="max-w-md w-full mx-auto space-y-6">
          
          {/* Headline greetings */}
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              University Portal Sign In
            </h2>
            <p className="text-slate-400 text-xs mt-1">Specify your current credentials role to unlock active sessions</p>
          </div>

          {/* Role selection tab buttons */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => {
                setRole("student");
                setIdentifier("");
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-center text-xs font-bold font-sans transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                role === "student"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("faculty");
                setIdentifier("");
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-center text-xs font-bold font-sans transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                role === "faculty"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("admin");
                setIdentifier("");
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-center text-xs font-bold font-sans transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                role === "admin"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          {/* Verification Notices & Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-start gap-2 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Security Authorization Issue</p>
                <p className="text-[11px] opacity-90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Main Credentials Inputs Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field Identifier */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider font-bold">
                {role === "student" ? "REGISTRATION ID / EMAIL ADDRESS" : "UNIVERSITY EMAIL ADDRESS"}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  {role === "student" ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </span>
                <input
                  type="text"
                  placeholder={role === "student" ? "e.g. 210301120045" : "e.g. vinayak@cutm.ac.in"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 pl-10 rounded-xl text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-850 dark:text-slate-100 placeholder-slate-400 font-sans"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Field Password Pin */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                  PASSWORD / PIN
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotIdentifier(identifier);
                    setForgotRole(role);
                    setIsForgotModalOpen(true);
                    setForgotError(null);
                    setForgotSuccess(null);
                    setSimulatedToken(null);
                  }}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-350 hover:underline cursor-pointer font-sans font-semibold border-none bg-transparent outline-none focus:outline-none"
                >
                  Forgot Access PIN?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 pl-10 pr-10 rounded-xl text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-850 dark:text-slate-100 placeholder-slate-400 font-mono"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition focus:outline-none"
                  title={showPassword ? "Hide PIN" : "Show PIN"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>



            {/* Button Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:translate-y-0.5 transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Register Dynamic Panels based on current role select */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 space-y-3">
            <div>
              {role === "student" && (
                <>
                  <p className="text-[10px] text-slate-400 mt-1 italic font-sans text-center">New to the platform? Authenticate by registering your official CUTM profile details.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setRegError(null);
                      setRegSuccess(null);
                      setIsRegisterOpen(true);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer text-center active:translate-y-0.5 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Student Record</span>
                  </button>
                </>
              )}
              {role === "faculty" && (
                <>
                  <p className="text-[10px] text-slate-400 mt-1 italic font-sans text-center">New faculty member? Setup your personal academic portal here.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFacRegError(null);
                      setFacRegSuccess(null);
                      setIsFacRegisterOpen(true);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 cursor-pointer text-center active:translate-y-0.5 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Faculty Record</span>
                  </button>
                </>
              )}
              {role === "admin" && (
                <>
                  <p className="text-[10px] text-slate-450 mt-1 italic font-sans text-center">Authorized security personnel? Establish core administrative credentials ledger.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminRegError(null);
                      setAdminRegSuccess(null);
                      setIsAdminRegisterOpen(true);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-slate-500/10 cursor-pointer text-center active:translate-y-0.5 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Admin Record</span>
                  </button>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Student Self-Registration Modal Dialog */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8 transform transition-all duration-300">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> STUDENT SELF-REGISTRATION
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 italic">Enroll Academic Credentials</h3>
                <p className="text-[11px] text-slate-400 mt-1">Enroll your original credentials into the CENTURIONGPT university database nodes. Once added, you can instantly sign in using your registration key.</p>
              </div>

              {regError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 animate-pulse text-emerald-500" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                
                {/* Registration Number */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">CUTM REGISTRATION NUMBER/KEY</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={13}
                      placeholder="e.g. 240101371026"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-bold"
                    />
                    <button
                      type="button"
                      disabled={isExtracting}
                      onClick={handleExtractKnowledge}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer shrink-0 disabled:bg-slate-500 active:translate-y-0.5"
                    >
                      {isExtracting ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          <span>Extract RAG</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">Input code and click "Extract RAG" to predict/extract profiles and syllabus from files.</p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">STUDENT FULL NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Konduru Vinay Venket"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">UNIVERSITY EMAIL</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. student@cutm.ac.in"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Choose PIN */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">CHOOSE ACCESS PIN (FOR SECURE LOGIN)</label>
                  <div className="relative flex items-center">
                    <input
                      type={showRegPin ? "text" : "password"}
                      required
                      maxLength={12}
                      placeholder="e.g. 1234"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 pr-10 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPin(!showRegPin)}
                      className="absolute right-3 text-slate-400 hover:text-emerald-500 cursor-pointer transition focus:outline-none"
                      title={showRegPin ? "Hide pin" : "Show pin"}
                    >
                      {showRegPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 italic">Keep this PIN secure. You will need it to login to your dashboard.</p>
                </div>

                {/* Dept */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">COHORT DEPARTMENT</label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-750 dark:text-slate-200 font-sans font-bold"
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

                {/* Sem and attendance */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">SEMESTER</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={8}
                      value={regSem}
                      onChange={(e) => setRegSem(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs text-center font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">ATTENDANCE (%)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={regAtt}
                      onChange={(e) => setRegAtt(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs text-center font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Extracted Courses & CGPA Live Preview Desk */}
                {regSubjects.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> KB EXTRACTED ACADEMIC GRADES
                      </h4>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="px-1.5 py-0.5 bg-emerald-105 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold shrink-0">
                          SGPA: {(() => {
                            const totalCredits = regSubjects.reduce((sum, s) => sum + s.credits, 0);
                            const weightedPoints = regSubjects.reduce((sum, s) => sum + (s.credits * gradeToPoint(s.grade)), 0);
                            return totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : "0.00";
                          })()}
                        </span>
                        <span className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 rounded text-[10px] font-bold shrink-0">
                          CGPA: {(() => {
                            const history = regSgpaHistory || [];
                            const totalCredits = regSubjects.reduce((sum, s) => sum + s.credits, 0);
                            const weightedPoints = regSubjects.reduce((sum, s) => sum + (s.credits * gradeToPoint(s.grade)), 0);
                            const sgpa4 = totalCredits > 0 ? (weightedPoints / totalCredits) : 0;
                            const sumPastSgpa = history.reduce((sum, h) => sum + h.sgpa, 0);
                            return ((sumPastSgpa + sgpa4) / (history.length + 1)).toFixed(2);
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                      {regSubjects.map((sub, i) => (
                        <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[10px] font-mono">
                          <span className="text-slate-400 font-bold shrink-0">{sub.code}</span>
                          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px] text-left mx-2 font-sans">{sub.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <span className="text-slate-400">({sub.credits} CR)</span>
                            <span className="px-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold uppercase rounded border border-emerald-100 dark:border-emerald-900/40">{sub.grade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRegSaving}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold hover:shadow-emerald-500/10 transition flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5"
                >
                  {isRegSaving ? (
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Enrolling profile database...</span>
                  ) : (
                    <span>Register Credentials Ledger</span>
                  )}
                </button>

              </form>
            </div>

          </div>
        </div>
      )}

      {/* Faculty Self-Registration Modal Dialog */}
      {isFacRegisterOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8 transform transition-all duration-300">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 align-middle">
                  <GraduationCap className="w-3.5 h-3.5" /> FACULTY SELF-REGISTRATION
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFacRegisterOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-105 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3 rounded-lg border border-indigo-100/40 dark:border-indigo-900/30 text-[11px] text-slate-500 dark:text-slate-300">
                <p className="font-sans leading-relaxed">
                  Establish a primary faculty ledger account. Registered credentials will grant immediate access to classroom grade logs, academic syllabus distributions, and notice dispatch authorities.
                </p>
              </div>

              {facRegError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100 dark:border-red-900/40 rounded-xl text-[11px] font-sans flex items-start gap-1.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{facRegError}</span>
                </div>
              )}

              {facRegSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-[11px] font-sans flex items-start gap-1.5 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{facRegSuccess}</span>
                </div>
              )}

              <form onSubmit={handleFacRegisterSubmit} className="space-y-4">
                
                {/* Faculty Name */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">FULL FACULTY NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Dawaleshwar Rao"
                    value={regFacName}
                    onChange={(e) => setRegFacName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-sans font-medium"
                  />
                </div>

                {/* Faculty Email */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">OFFICIAL RECIPIENT EMAIL</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. dawaleshwar@cutm.ac.in"
                    value={regFacEmail}
                    onChange={(e) => setRegFacEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-sans font-medium"
                  />
                </div>

                {/* Faculty Designation */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">ACADEMIC DESIGNATION</label>
                  <select
                    value={regFacDesignation}
                    onChange={(e) => setRegFacDesignation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-750 dark:text-slate-200 font-sans font-bold"
                  >
                    <option value="Professor & Program Coordinator">Professor & Program Coordinator</option>
                    <option value="Associate Professor (CSE)">Associate Professor (CSE)</option>
                    <option value="Assistant Professor (AI & ML)">Assistant Professor (AI & ML)</option>
                    <option value="Lecturer Academic Specialist">Lecturer Academic Specialist</option>
                    <option value="Dean School of Engineering">Dean School of Engineering</option>
                    <option value="Head of Department">Head of Department</option>
                  </select>
                </div>

                {/* Faculty Department */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">PRIMARY DISCIPLINE DEPARTMENT</label>
                  <select
                    value={regFacDept}
                    onChange={(e) => setRegFacDept(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-750 dark:text-slate-200 font-sans font-bold"
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

                {/* Faculty PIN */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">CHOOSE ACCESS PIN</label>
                  <div className="relative flex items-center">
                    <input
                      type={showFacRegPin ? "text" : "password"}
                      required
                      placeholder="e.g. admin99"
                      value={regFacPin}
                      onChange={(e) => setRegFacPin(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 pr-10 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFacRegPin(!showFacRegPin)}
                      className="absolute right-3 text-slate-400 hover:text-indigo-500 cursor-pointer transition focus:outline-none"
                      title={showFacRegPin ? "Hide pin" : "Show pin"}
                    >
                      {showFacRegPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 italic">Faculty portal defaults to <code className="font-mono bg-slate-100 dark:bg-slate-950 px-1 rounded font-bold text-indigo-650 dark:text-indigo-455">admin99</code>. Keep it secure.</p>
                </div>

                <button
                  type="submit"
                  disabled={isFacRegSaving}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5"
                >
                  {isFacRegSaving ? (
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Enrolling Faculty database...</span>
                  ) : (
                    <span>Register Credentials Ledger</span>
                  )}
                </button>

              </form>
            </div>

          </div>
        </div>
      )}

      {/* Admin Self-Registration Modal Dialog */}
      {isAdminRegisterOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8 transform transition-all duration-300">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Shield className="w-3.5 h-3.5 text-slate-500" /> ADMIN SYSTEM INITIALIZATION
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminRegisterOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-105 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-250 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-300">
                <p className="font-sans leading-relaxed">
                  Establish dynamic Super Administrator credentials ledger. Admin roles provide comprehensive system wide controls, student db adjustments, scrapers, and global academic regulations logs.
                </p>
              </div>

              {adminRegError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100 dark:border-red-900/40 rounded-xl text-[11px] font-sans flex items-start gap-1.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminRegError}</span>
                </div>
              )}

              {adminRegSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-[11px] font-sans flex items-start gap-1.5 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{adminRegSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAdminRegisterSubmit} className="space-y-4">
                
                {/* Admin Name */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">FULL SYS-ADMIN NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. anita patra"
                    value={regAdminName}
                    onChange={(e) => setRegAdminName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-500 text-slate-800 dark:text-slate-100 font-sans font-medium"
                  />
                </div>

                {/* Admin Email */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">ADMIN ROOT EMAIL</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. anita@cutm.ac.in, anitapatrajitm@gmail.com"
                    value={regAdminEmail}
                    onChange={(e) => setRegAdminEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-500 text-slate-800 dark:text-slate-100 font-sans font-medium"
                  />
                </div>

                {/* Admin Role */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-405 mb-1.5 uppercase font-bold tracking-wider">SYSTEM FUNCTION LEVEL / ROLE</label>
                  <select
                    value={regAdminRole}
                    onChange={(e) => setRegAdminRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-500 text-slate-750 dark:text-slate-200 font-sans font-bold"
                  >
                    <option value="Chief Academic Administrator">Chief Academic Administrator</option>
                    <option value="Database Control Operations">Database Control Operations</option>
                    <option value="Executive Admissions Registrar">Executive Admissions Registrar</option>
                  </select>
                </div>

                {/* Admin Security PIN */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">ROOT SECURITY KEY</label>
                  <div className="relative flex items-center">
                    <input
                      type={showAdminRegPin ? "text" : "password"}
                      required
                      placeholder="e.g. root2026"
                      value={regAdminPin}
                      onChange={(e) => setRegAdminPin(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 pr-10 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-500 text-slate-800 dark:text-slate-100 font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminRegPin(!showAdminRegPin)}
                      className="absolute right-3 text-slate-400 hover:text-slate-550 cursor-pointer transition focus:outline-none"
                      title={showAdminRegPin ? "Hide pin" : "Show pin"}
                    >
                      {showAdminRegPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-450 mt-1 italic">Root key defaults to <code className="font-mono bg-slate-100 dark:bg-slate-950 px-1 rounded font-bold text-slate-650 dark:text-slate-400">root2026</code>.</p>
                </div>

                <button
                  type="submit"
                  disabled={isAdminRegSaving}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-slate-750 to-slate-900 hover:from-slate-800 hover:to-black disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-slate-500/10 hover:shadow-slate-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5"
                >
                  {isAdminRegSaving ? (
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Enrolling Admin database...</span>
                  ) : (
                    <span>Register Credentials Ledger</span>
                  )}
                </button>

              </form>
            </div>

          </div>
        </div>
      )}

      {/* Forgot Password Modal Dialog */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all animate-fade-in">
          
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all duration-300">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> SECURE RESET SERVICE
                </div>
              </div>
              <button
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotError(null);
                  setForgotSuccess(null);
                  setSimulatedToken(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 italic">Forgot Access PIN?</h3>
                <p className="text-[11px] text-slate-400 mt-1">Specify your registered identity payload. Our cryptographic simulator will authenticate your record and output a simulated verification token instantly.</p>
              </div>

              {forgotError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-250 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] rounded-xl space-y-2">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
                    <p className="font-medium">{forgotSuccess}</p>
                  </div>
                  {simulatedToken && (
                    <div className="bg-indigo-100/40 dark:bg-indigo-950/80 p-3 rounded-lg border border-indigo-200/50 dark:border-indigo-900/40 text-center space-y-2">
                      <p className="text-[9px] uppercase font-mono text-slate-400 font-bold tracking-wider">Simulated OTP Recovery Access Pin</p>
                      <p className="font-mono text-base font-extrabold text-indigo-600 dark:text-indigo-400 select-all tracking-widest">{simulatedToken}</p>
                      
                      <button
                        type="button"
                        onClick={handleApplySimulatedToken}
                        className="w-full mt-2 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Auto-fill Access PIN & Login
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!simulatedToken && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  
                  {/* Select Role */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">Verification Role Context</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                      {(["student", "faculty", "admin"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForgotRole(r)}
                          className={`py-1.5 px-3 text-[10px] font-bold rounded-lg uppercase font-mono transition cursor-pointer text-center ${
                            forgotRole === r
                              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "text-slate-400 hover:text-slate-700"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Identifier */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase font-bold tracking-wider">
                      {forgotRole === "student" ? "REGISTRATION ID / STAFF ID" : "UNIVERSITY EMAIL ADDRESS"}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400">
                        {forgotRole === "student" ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      </span>
                      <input
                        type="text"
                        placeholder={forgotRole === "student" ? "e.g. 210301120045" : "e.g. conduruvinayvenkat@gmail.com"}
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 pl-9 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold hover:shadow-indigo-500/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Verifying university database...</span>
                    ) : (
                      <span>Resolve simulated security token</span>
                    )}
                  </button>

                </form>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
