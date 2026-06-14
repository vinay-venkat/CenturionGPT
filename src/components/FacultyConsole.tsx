import React, { useState } from "react";
import { StudentRecord, AcademicFile } from "../types";
import { BookOpen, FolderPlus, HelpCircle, GraduationCap, FileSpreadsheet, Plus, CheckCircle, Clock, Camera, Eye, EyeOff } from "lucide-react";

interface FacultyConsoleProps {
  students: StudentRecord[];
  files: AcademicFile[];
  onUploadNote: (file: { fileName: string; fileType: string; description: string; textContent: string }) => void;
}

export default function FacultyConsole({ students, files, onUploadNote }: FacultyConsoleProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [showLookupPin, setShowLookupPin] = useState(false);
  const [facultyLogo, setFacultyLogo] = useState<string | null>(() => {
    return localStorage.getItem("cutm_logo_faculty");
  });

  const handleFacultyLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFacultyLogo(dataUrl);
      localStorage.setItem("cutm_logo_faculty", dataUrl);
    };
    reader.readAsDataURL(file);
  };
  const studentProfile = students.find(s => s.regNo === selectedStudent);

  // Notes file form status
  const [noteForm, setNoteForm] = useState({
    fileName: "",
    fileType: "txt",
    description: "",
    textContent: ""
  });

  const [alertSuccess, setAlertSuccess] = useState(false);

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.fileName || !noteForm.textContent) return alert("All note fields are required.");
    onUploadNote(noteForm);
    setNoteForm({ fileName: "", fileType: "txt", description: "", textContent: "" });
    setAlertSuccess(true);
    setTimeout(() => setAlertSuccess(false), 3000);
  };

  return (
    <div id="faculty-console" className="space-y-6">
      {/* Faculty Portal Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 border border-indigo-800/40 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 overflow-hidden shrink-0">
            {facultyLogo ? (
              <img src={facultyLogo} alt="Faculty Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <BookOpen className="w-8 h-8 text-indigo-300" />
            )}
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] text-white font-bold cursor-pointer transition-opacity duration-150">
              <Camera className="w-4 h-4 mb-0.5" />
              <span>Upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFacultyLogoUpload}
              />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[9px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase inline-block">
              Faculty operations portal
            </span>
            <h2 className="text-xl font-bold tracking-tight mt-1.5 font-sans">Hello, Prof. Vinayak Venkatraman</h2>
            <p className="text-xs text-indigo-200 mt-1">Department of Computer Science & Engineering • Program Lead</p>
            <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-1">
              <label className="text-[10px] font-bold text-indigo-300 hover:text-white cursor-pointer transition flex items-center gap-0.5">
                <Camera className="w-3 h-3" />
                <span>Upload Custom Faculty Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFacultyLogoUpload}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="flex gap-3 bg-indigo-800/20 p-4 rounded-xl border border-indigo-700/20 h-fit shrink-0 text-xs">
          <div>
            <p className="text-indigo-400 font-mono text-[10px] uppercase">Roster Size</p>
            <p className="text-lg font-bold mt-0.5">{students.length} Students</p>
          </div>
          <div className="w-[1px] bg-indigo-700/50"></div>
          <div>
            <p className="text-indigo-400 font-mono text-[10px] uppercase">Indexed Resources</p>
            <p className="text-lg font-bold mt-0.5">{files.length} Modules</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Course Syllabus Material Publisher */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Publish Academic Resource Notes</h3>
            <p className="text-[11px] text-slate-400">Instantly indices documents into the university RAG database</p>
          </div>

          <form onSubmit={handleSubmitNote} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">NOTES FILENAME</label>
              <input
                type="text"
                placeholder="e.g. Unit_III_NeuralNetworks_Syllabus.txt"
                required
                value={noteForm.fileName}
                onChange={(e) => setNoteForm({ ...noteForm, fileName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">CREDIT MODULE TYPE</label>
                <select
                  value={noteForm.fileType}
                  onChange={(e) => setNoteForm({ ...noteForm, fileType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none text-slate-800 dark:text-slate-200"
                >
                  <option value="txt">Lecture Summary (.txt)</option>
                  <option value="csv">Subject Credit mapping (.csv)</option>
                  <option value="docx">Assignments criteria (.docx)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">RAG PIPELINE</label>
                <div className="w-full font-mono text-[10px] p-2 text-indigo-500 bg-indigo-50/20 rounded">
                  ChromaDB vector pool
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold">DESCRIPTION</label>
              <input
                type="text"
                placeholder="e.g. Recurrent Neural Networks & LSTM lecture formulas"
                value={noteForm.description}
                onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none focus:ring-1 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1 font-semibold">LECTURE CONTENT GUIDES</label>
              <textarea
                placeholder="Type or paste core lecture guides. E.g. Unit 3 NLP covers Word Vectors, Word2Vec neural architectures, skipgrams, and negative class samplings..."
                required
                rows={4}
                value={noteForm.textContent}
                onChange={(e) => setNoteForm({ ...noteForm, textContent: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 p-2 rounded-lg text-xs outline-none focus:ring-1 resize-none font-mono text-slate-800 dark:text-slate-200"
              />
            </div>

            {alertSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] flex items-center gap-1.5 border border-emerald-100">
                <CheckCircle className="w-3.5 h-3.5" /> Resource guides uploaded and vectorized by Gemini OCR parsing!
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2.5 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> Vectorize Note Asset
            </button>
          </form>
        </div>

        {/* student grade verification console */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Roster Academic Lookup</h3>
            <p className="text-[11px] text-slate-400">Examine attendance parameters, backlogs warning and semesters credits</p>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">SELECT ENROLLED STUDENT</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-2 rounded-lg text-xs outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="">-- Choose student profile --</option>
              {students.map(s => (
                <option key={s.regNo} value={s.regNo}>{s.name} ({s.regNo})</option>
              ))}
            </select>
          </div>

          {studentProfile ? (
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{studentProfile.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Reg ID: {studentProfile.regNo}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] font-mono text-slate-400">Access PIN:</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                      {showLookupPin ? studentProfile.pin || "1234" : "••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLookupPin(!showLookupPin)}
                      className="text-slate-400 hover:text-indigo-650 cursor-pointer transition focus:outline-none"
                      title={showLookupPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showLookupPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-2 py-1 rounded font-mono font-bold">
                  CGPA: {studentProfile.cgpa}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <div>
                  <p>Semester: **{studentProfile.semester}**</p>
                  <p className="mt-1">Roster subjects: **{studentProfile.subjects.length}**</p>
                </div>
                <div>
                  <p>
                    Attendance:{" "}
                    <span className={`font-bold ${studentProfile.attendanceRate < 75 ? "text-red-500" : "text-emerald-500"}`}>
                      {studentProfile.attendanceRate}%
                    </span>
                  </p>
                  <p className="mt-1">
                    Exam Status: **{studentProfile.attendanceRate < 75 ? "⚠️ Attendance Warned" : "✅ Approved"}**
                  </p>
                </div>
              </div>

              <div>
                <h5 className="text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">Registered Grades</h5>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                  {studentProfile.subjects.map(sub => (
                    <div key={sub.code} className="text-[11px] flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/40">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{sub.name} ({sub.code})</span>
                      <span className="font-mono bg-indigo-50/50 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-600 font-bold">{sub.grade} ({sub.gradePoint} GP)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Clock className="w-8 h-8 text-slate-300" />
              Provide student identity mapping above to examine roster grade card.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
