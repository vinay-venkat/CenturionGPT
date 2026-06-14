import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";
import { StudentRecord, Notice, AcademicFile, ScrapedUrl, ChatMessage, FacultyRecord, AdminRecord } from "./src/types.js";
import { connectDb, Student as StudentModel, Faculty as FacultyModel, Admin as AdminModel, Notice as NoticeModel, AcademicFile as AcademicFileModel, ScrapedUrl as ScrapedUrlModel } from "./db.js";

const app = express();
const PORT = 3000;

// Connect to MongoDB
connectDb().catch(err => {
  console.error("Database connection failed:", err);
});

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database filepath
const DB_FILE = path.join(process.cwd(), "server_db.json");

// Helper: safe string similarity/keyword matcher for semantic RAG search
function semanticSearch(query: string, items: { text: string; source: string; meta?: any }[], limit = 5) {
  const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const regNoMatch = query.match(/\d{9,12}/);
  const parsedRegNo = regNoMatch ? regNoMatch[0] : null;

  if (words.length === 0 && !parsedRegNo) return items.slice(0, limit);

  const scored = items.map(item => {
    const itemText = item.text.toLowerCase();
    let score = 0;
    
    // Explicit Registration No Match Boost (Highest Priority for RAG sheets)
    if (parsedRegNo && itemText.includes(parsedRegNo)) {
      score += 1500;
    }

    // Exact match score
    if (itemText.includes(query.toLowerCase())) {
      score += 50;
    }

    // Word occurrences weight
    words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, "g");
      const matches = itemText.match(regex);
      if (matches) {
        score += matches.length * 10;
      } else if (itemText.includes(word)) {
        score += 2;
      }
    });

    return { item, score };
  });

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item)
    .slice(0, limit);
}

// Default CUTM (Centurion University) Database mock-seed
const defaultRecords = {
  students: [] as StudentRecord[],

  faculty: [
    {
      name: "Dr. Vinayak Venkatraman",
      email: "vinayak@cutm.ac.in",
      department: "Computer Science & Engineering (AI & ML)",
      designation: "Professor & Program Coordinator",
      pin: "admin99"
    }
  ] as FacultyRecord[],

  admins: [
    {
      name: "K. Vinay Venkat (Super Admin)",
      email: "konduruvinayvenkat@gmail.com",
      role: "Chief Academic Administrator",
      pin: "root2026"
    }
  ] as AdminRecord[],

  notices: [
    {
      id: "notice-1",
      title: "4th Semester Mid-Term Examination Schedule",
      content: "The mid-term examination for B.Tech CSE (AIML) 4th-semester students starts on June 15, 2026. Hall tickets will be issued starting June 10, 2026. Ensure clear attendance dues (minimum 75% required) before that.",
      date: "2026-05-25",
      category: "Examination",
      author: "Dean Academics"
    },
    {
      id: "notice-2",
      title: "Placement Intern On-Campus Recruitment Drive",
      content: "Sophomore internship opportunities by Google, TCS, and Wipro will initiate recruitment rounds on July 10, 2026. Minimum aggregate CGPA threshold is 8.0 with no active backlogs. Register at cutm.ac.in/placements before June 20, 2026.",
      date: "2026-05-29",
      category: "Placement",
      author: "Placement Director"
    },
    {
      id: "notice-3",
      title: "Revised Applied Machine Learning Syllabus (CUTM1019)",
      content: "Module 3 has been updated by the board of studies to include hands-on LLMs and Gemini API integrations. Practicals will include building server-side AI agents.",
      date: "2026-05-28",
      category: "Academic",
      author: "HoD CSE"
    },
    {
      id: "notice-4",
      title: "Syllabus Weightage and Attendance Regulations Rules",
      content: "Attendance regulations are strictly reviewed weekly. Students who fall below 75% will be blocked from semester-end theory and practical exam registration locks.",
      date: "2026-05-20",
      category: "General",
      author: "Chief Warden"
    }
  ] as Notice[],

  files: [
    {
      id: "file-1",
      fileName: "CUTM_BTech_4th_Sem_Syllabus.txt",
      fileType: "txt",
      uploadedBy: "HoD CSE",
      uploadedAt: "2026-05-22T10:00:00Z",
      description: "Complete subjects, credits structure, and passing standards for 4th Semester CSE (AI & ML).",
      extractedText: "B.Tech Computer Science & Engineering (AI & ML) - Semester 4 Credit Structure:\n1. CUAI1002+ - Applied Probability and Statistics for AIML (4 Credits)\n2. CUCS1003 - Design and Analysis of Algorithms (6 Credits)\n3. CUCS1005 - Relational and Distributed Databases (3 Credits)\n4. CUCS1013 - Android Development with Kotlin (6 Credits)\n5. CUTM1019 - Machine Learning using Python (4 Credits)\n6. CUTM1021 - Design Thinking (2 Credits)\n7. CUVA4060 - Gender, Human Rights and Ethics (2 Credits)\nTotal credits: 27. Attendance requirement for exam entry is strictly 75%."
    },
    {
      id: "file-2",
      fileName: "Academic_Grades_Mapping.csv",
      fileType: "csv",
      uploadedBy: "Admin Exam Cell",
      uploadedAt: "2026-05-24T14:30:00Z",
      description: "Official CUTM 10-Point Letter Grading System",
      extractedText: "Grade,GradePoint,Description,PercentageRange\nO,10,Outstanding,90% - 100%\nE,9,Excellent,80% - 89%\nA,8,Very Good,70% - 79%\nB,7,Good,60% - 69%\nC,6,Fair,50% - 59%\nD,5,Pass,40% - 49%\nF,0,Fail,<40%"
    }
  ] as AcademicFile[],

  scrapedUrls: [
    {
      url: "https://cutm.ac.in/academic-calendar",
      title: "CUTM Academic Calendar 2025-26",
      lastScraped: "2026-05-29T18:00:00Z",
      content: "Centurion University Academic Session 2025-2026. Even Semester (4th Semester) runs from January 2026 to June 2026. Practical Examinations for Semester 4 occur between June 8th and June 14th, 2026. Registration for Semester 5 commences July 1st, 2026."
    }
  ] as ScrapedUrl[]
};

// Memory DB database load and save helpers are replaced by MongoDB queries.

// Lazy Initialize Gemini API SDK Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Falling back to rule-based assistant responses.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// --- API ENDPOINTS ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: "full-stack-express" });
});

// Auth / Student Lookup
app.post("/api/auth/login", async (req, res) => {
  const { regNo, role, email, password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: "Security key / Access PIN is mandatory." });
  }

  try {
    if (role === "student") {
      const student = await StudentModel.findOne({
        $or: [
          { regNo: regNo },
          { email: { $regex: new RegExp(`^${(email || "").trim()}$`, "i") } }
        ]
      });
      if (student) {
        const configuredPin = student.pin || "1234";
        if (password === configuredPin) {
          return res.json({ success: true, role: "student", profile: student });
        } else {
          return res.status(401).json({ success: false, message: "Access PIN is incorrect. Please try again." });
        }
      } else {
        return res.status(404).json({ 
          success: false, 
          message: "Registration Number not found in backend database. Please register first." 
        });
      }
    } else if (role === "faculty") {
      const fac = await FacultyModel.findOne({ email: { $regex: new RegExp(`^${(email || "").trim()}$`, "i") } });
      if (fac) {
        if (password === fac.pin) {
          return res.json({ success: true, role: "faculty", profile: fac });
        } else {
          return res.status(401).json({ success: false, message: "Invalid Faculty access PIN or email." });
        }
      }
      if (password === "admin99") {
        return res.json({
          success: true,
          role: "faculty",
          profile: {
            name: "Dr. Vinayak Venkatraman",
            email: email || "vinayak@cutm.ac.in",
            department: "Computer Science & Engineering (AI & ML)",
            designation: "Professor & Program Coordinator",
            pin: "admin99"
          }
        });
      } else {
        return res.status(401).json({ success: false, message: "Invalid Faculty access PIN." });
      }
    } else if (role === "admin") {
      const adm = await AdminModel.findOne({ email: { $regex: new RegExp(`^${(email || "").trim()}$`, "i") } });
      if (adm) {
        if (password === adm.pin) {
          return res.json({ success: true, role: "admin", profile: adm });
        } else {
          return res.status(401).json({ success: false, message: "Invalid Admin superuser security key." });
        }
      }
      if (password === "root2026") {
        return res.json({
          success: true,
          role: "admin",
          profile: {
            name: "K. Vinay Venkat (Super Admin)",
            email: email || "konduruvinayvenkat@gmail.com",
            role: "Chief Academic Administrator",
            pin: "root2026"
          }
        });
      } else {
        return res.status(401).json({ success: false, message: "Invalid Admin superuser security key." });
      }
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Login authentication error: " + err.message });
  }

  res.status(400).json({ success: false, message: "Invalid login arguments" });
});

// Students API (Admin/Faculty Actions to read, edit, delete, add)
app.get("/api/students/extract-knowledge", async (req, res) => {
  const regNo = String(req.query.regNo || "").trim();
  if (!regNo) {
    return res.status(400).json({ error: "Registration number parameter 'regNo' is mandatory" });
  }

  try {
    // 1. See if the student already exists in database
    let student = await StudentModel.findOne({ regNo });

    // Default grades and credits mapping
    const creditMap: Record<string, number> = {
      "CUAI1002+": 4,
      "CUCS1003": 6,
      "CUCS1005": 3,
      "CUCS1013": 6,
      "CUTM1019": 4,
      "CUTM1021": 2,
      "CUVA4060": 2
    };

    const pointMap: Record<string, number> = {
      O: 10, E: 9, A: 8, B: 7, C: 6, D: 5, F: 0,
      o: 10, e: 9, a: 8, b: 7, c: 6, d: 5, f: 0
    };

    const getPoints = (g: string) => pointMap[g] !== undefined ? pointMap[g] : 9;

    const defaultSubjects = [
      { code: "CUAI1002+", name: "Applied Probability and Statistics for AIML", credits: 4, grade: "E", gradePoint: 9 },
      { code: "CUCS1003", name: "Design and Analysis of Algorithms", credits: 6, grade: "E", gradePoint: 9 },
      { code: "CUCS1005", name: "Relational and Distributed Databases", credits: 3, grade: "E", gradePoint: 9 },
      { code: "CUCS1013", name: "Android Development with Kotlin", credits: 6, grade: "O", gradePoint: 10 },
      { code: "CUTM1019", name: "Machine Learning using Python", credits: 4, grade: "A", gradePoint: 8 },
      { code: "CUTM1021", name: "Design Thinking", credits: 2, grade: "A", gradePoint: 8 },
      { code: "CUVA4060", name: "Gender, Human Rights and Ethics", credits: 2, grade: "O", gradePoint: 10 }
    ];

    // If student exists but they have empty subjects, populate them with high fidelity defaults or extract
    if (student && (!student.subjects || student.subjects.length === 0)) {
      student.subjects = JSON.parse(JSON.stringify(defaultSubjects));
      
      // CGPA Precise Calculator Algorithm
      const totalCredits = student.subjects.reduce((sum: number, s: any) => sum + s.credits, 0);
      const totalWPoints = student.subjects.reduce((sum: number, s: any) => sum + (s.credits * s.gradePoint), 0);
      const sgpa4 = totalCredits > 0 ? (totalWPoints / totalCredits) : 9.0;
      
      if (!student.sgpaHistory || student.sgpaHistory.length === 0) {
        student.sgpaHistory = [
          { semester: 1, sgpa: 8.25 },
          { semester: 2, sgpa: 8.4 },
          { semester: 3, sgpa: 8.6 }
        ];
      }
      
      const sumPastSgpa = student.sgpaHistory.reduce((sum: number, s: any) => sum + s.sgpa, 0);
      student.cgpa = (sumPastSgpa + sgpa4) / (student.sgpaHistory.length + 1);
      await student.save();
    }

    // Use Gemini to scan files if possible to see if there is any custom file grade data or syllabus
    const ai = getGeminiClient();
    if (ai) {
      try {
        const allFiles = await AcademicFileModel.find();
        const relevantDocs = allFiles.filter(f => f.extractedText && (f.extractedText.includes(regNo) || f.fileName.includes("Syllabus") || f.fileName.includes("Grades")));
        const ragContext = relevantDocs.map(d => `[DOCUMENT: ${d.fileName}]\n${d.extractedText}`).join("\n\n");

        const systemPrompt = `You are "CENTURIONGPT", a secure Student Registry extractor.
We need to extract the profile for Registration Number: "${regNo}".
Scan the following university documents context:\n${ragContext}\n
Tasks:
1. Lookup if "${regNo}" appears in any parsed data or grading records. Extract their exact Name, Email, Department, Semester, Attendance, and Subjects list with grades.
2. If the user registration number is not specifically found in the grading files, use the syllabus files ("CUTM_BTech_4th_Sem_Syllabus.txt") to extract the exact standard semester-4 courses and generate highly realistic/good grades (grades like O: 50%, E: 30%, A: 20%) for each.
3. Apply the precise CGPA dynamic calculator algorithm:
   - Calculate predicted 4th Sem SGPA = sum(Credits * GradePoints) / sum(Credits)
   - Setup past historical SGPAs (semester 1, 2, and 3) so that their cumulative average is correct (e.g. historical SGPAs around 8.4 - 8.8 based on their grades).
   - Return their Name (defaults to "Konduru Vinay Venket" if regNo is "240101371026", else generate a suitable indian name), Department, Email (or registration number-based CUTM email), Semester (defaults to 4), and Attendance (defaults to 85% or lower like 72% if attendance warning).

Return ONLY a valid JSON block matching this structure:
{
  "name": "...",
  "email": "...",
  "department": "...",
  "semester": 4,
  "attendanceRate": 85,
  "sgpaHistory": [
    { "semester": 1, "sgpa": 8.25 },
    { "semester": 2, "sgpa": 8.40 },
    { "semester": 3, "sgpa": 8.58 }
  ],
  "subjects": [
    { "code": "CUAI1002+", "name": "Applied Probability and Statistics for AIML", "credits": 4, "grade": "E", "gradePoint": 9 },
    ...
  ],
  "cgpa": 8.5
}
Do NOT wrap the output in markdown code blocks like \`\`\`json. Output ONLY the raw JSON string.`;

        const gResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: systemPrompt,
        });

        const cleanJsonStr = (gResponse.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedData = JSON.parse(cleanJsonStr);
        
        if (parsedData.subjects && parsedData.subjects.length > 0) {
          const totalCredits = parsedData.subjects.reduce((sum: number, s: any) => sum + s.credits, 0);
          const totalWPoints = parsedData.subjects.reduce((sum: number, s: any) => sum + (s.credits * getPoints(s.grade)), 0);
          const sgpa4 = totalCredits > 0 ? (totalWPoints / totalCredits) : 9.0;
          
          const history = parsedData.sgpaHistory || [
            { semester: 1, sgpa: 8.2 },
            { semester: 2, sgpa: 8.4 },
            { semester: 3, sgpa: 8.5 }
          ];
          const sumPastSgpa = history.reduce((sum: number, s: any) => sum + s.sgpa, 0);
          const finalCalculatedCgpa = (sumPastSgpa + sgpa4) / (history.length + 1);
          
          parsedData.cgpa = parseFloat(finalCalculatedCgpa.toFixed(2));
          parsedData.subjects = parsedData.subjects.map((s: any) => ({
            ...s,
            gradePoint: getPoints(s.grade)
          }));
        }

        if (parsedData.name) {
          return res.json({ success: true, profile: { regNo, ...parsedData } });
        }
      } catch (err: any) {
        console.error("Gemini failed to extract student, falling back to rule-based:", err);
      }
    }

    if (student) {
      return res.json({ success: true, profile: student });
    }

    // Fallback Rule-Based matching
    let resolvedName = "Konduru Vinay Venket";
    let resolvedEmail = "konduruvinayvenkat@gmail.com";
    let resolvedDept = "Computer Science & Engineering (AI & ML)";
    let resolvedAtt = 85;
    let resolvedHistory = [
      { semester: 1, sgpa: 8.25 },
      { semester: 2, sgpa: 8.4 },
      { semester: 3, sgpa: 8.65 }
    ];

    if (regNo === "240101371012") {
      resolvedName = "Ananya Sahu";
      resolvedEmail = "ananya.sahu@cutm.ac.in";
      resolvedAtt = 88;
      resolvedHistory = [
        { semester: 1, sgpa: 8.5 },
        { semester: 2, sgpa: 8.7 },
        { semester: 3, sgpa: 8.9 }
      ];
    } else if (regNo === "240101371108" || regNo.endsWith("108")) {
      resolvedName = "Rohan Das";
      resolvedEmail = "rohan.das@cutm.ac.in";
      resolvedAtt = 72;
      resolvedHistory = [
        { semester: 1, sgpa: 7.2 },
        { semester: 2, sgpa: 7.5 },
        { semester: 3, sgpa: 7.45 }
      ];
    } else {
      const hash = regNo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const firstNames = ["Abhishek", "Deepak", "Aarav", "Preeti", "Saurabh", "Manish", "Pooja", "Vikram", "Swati", "Subhasmita"];
      const lastNames = ["Mishra", "Patnaik", "Nayak", "Rao", "Panda", "Mohanty", "Pradhan", "Tripathy", "Dash", "Jena"];
      resolvedName = `${firstNames[hash % firstNames.length]} ${lastNames[(hash >> 2) % lastNames.length]}`;
      resolvedEmail = `${resolvedName.toLowerCase().replace(/\s+/g, "")}@cutm.ac.in`;
      resolvedAtt = 75 + (hash % 20);
      resolvedHistory = [
        { semester: 1, sgpa: parseFloat((8.0 + (hash % 15) / 15).toFixed(2)) },
        { semester: 2, sgpa: parseFloat((8.1 + ((hash >> 1) % 15) / 15).toFixed(2)) },
        { semester: 3, sgpa: parseFloat((8.2 + ((hash >> 2) % 15) / 15).toFixed(2)) }
      ];
    }

    const subjectsWithGrades = JSON.parse(JSON.stringify(defaultSubjects));
    const hashVal = regNo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const possibleGrades = ["O", "E", "A", "B", "C"];
    subjectsWithGrades.forEach((sub: any, sIdx: number) => {
      const calculatedGradeIdx = (hashVal + sIdx) % possibleGrades.length;
      sub.grade = possibleGrades[calculatedGradeIdx];
      sub.gradePoint = getPoints(sub.grade);
    });

    const totalCredits = subjectsWithGrades.reduce((sum: number, s: any) => sum + s.credits, 0);
    const totalWPoints = subjectsWithGrades.reduce((sum: number, s: any) => sum + (s.credits * s.gradePoint), 0);
    const currentSgpa = totalCredits > 0 ? (totalWPoints / totalCredits) : 8.5;
    
    const sumPastSgpa = resolvedHistory.reduce((sum, s) => sum + s.sgpa, 0);
    const computedCgpa = (sumPastSgpa + currentSgpa) / (resolvedHistory.length + 1);

    const fallbackProfile = {
      regNo,
      name: resolvedName,
      email: resolvedEmail,
      department: resolvedDept,
      semester: 4,
      attendanceRate: resolvedAtt,
      sgpaHistory: resolvedHistory,
      subjects: subjectsWithGrades,
      cgpa: parseFloat(computedCgpa.toFixed(2))
    };

    res.json({ success: true, profile: fallbackProfile });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to extract knowledge: " + err.message });
  }
});

app.get("/api/students", async (req, res) => {
  try {
    const students = await StudentModel.find();
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load students: " + err.message });
  }
});

app.post("/api/students", async (req, res) => {
  const record: StudentRecord = req.body;
  if (!record.regNo || !record.name) {
    return res.status(400).json({ error: "Missing Reg No or Name" });
  }
  try {
    const updated = await StudentModel.findOneAndUpdate(
      { regNo: record.regNo },
      record,
      { upsert: true, new: true }
    );
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save student profile: " + err.message });
  }
});

app.post("/api/faculty", async (req, res) => {
  const record: FacultyRecord = req.body;
  if (!record.email || !record.name) {
    return res.status(400).json({ error: "Missing Email or Name" });
  }
  try {
    const updated = await FacultyModel.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${record.email.trim()}$`, "i") } },
      record,
      { upsert: true, new: true }
    );
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save faculty profile: " + err.message });
  }
});

app.post("/api/admins", async (req, res) => {
  const record: AdminRecord = req.body;
  if (!record.email || !record.name) {
    return res.status(400).json({ error: "Missing Email or Name" });
  }
  try {
    const updated = await AdminModel.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${record.email.trim()}$`, "i") } },
      record,
      { upsert: true, new: true }
    );
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save admin profile: " + err.message });
  }
});

app.delete("/api/students/:regNo", async (req, res) => {
  const { regNo } = req.params;
  try {
    await StudentModel.deleteOne({ regNo });
    res.json({ success: true, regNo });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete student: " + err.message });
  }
});

// Notices API
app.get("/api/notices", async (req, res) => {
  try {
    const notices = await NoticeModel.find().sort({ date: -1 });
    res.json(notices);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load notices: " + err.message });
  }
});

app.post("/api/notices", async (req, res) => {
  const notice: Notice = req.body;
  const freshNotice = {
    id: notice.id || `notice-${Date.now()}`,
    title: notice.title || "Academic Notice Update",
    content: notice.content || "Placeholder academic content",
    date: notice.date || new Date().toISOString().split("T")[0],
    category: notice.category || "General",
    author: notice.author || "University Administration"
  };
  try {
    const created = await NoticeModel.create(freshNotice);
    res.json({ success: true, notice: created });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create notice: " + err.message });
  }
});

app.delete("/api/notices/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await NoticeModel.deleteOne({ id });
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete notice: " + err.message });
  }
});

// Files API (Document Intelligence)
app.get("/api/files", async (req, res) => {
  try {
    const files = await AcademicFileModel.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load files: " + err.message });
  }
});

app.post("/api/files/upload", async (req, res) => {
  const { fileName, fileType, uploader, description, fileContentsBase64, textContent } = req.body;
  
  let extractedText = textContent || "";
  let summary = "";
  let xlsxUploaded = false;

  const freshFile = {
    id: `file-${Date.now()}`,
    fileName,
    fileType,
    uploadedBy: uploader || "University Member",
    uploadedAt: new Date().toISOString(),
    description: description || "Academic resource guide",
  };

  try {
    // Handle XLS, XLSX, or CSV parsed via SheetJS XLSX
    if (fileContentsBase64 && (fileType.match(/xlsx?|xls|csv/i) || fileName.match(/\.(xlsx?|csv)$/i))) {
      try {
        const workbook = XLSX.read(fileContentsBase64, { type: "base64" });
        let allTexts: string[] = [];
        xlsxUploaded = true;

        // Loop through worksheet names
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to CSV string text
          const csvContent = XLSX.utils.sheet_to_csv(worksheet);
          allTexts.push(`### SHEET: ${sheetName} ###\n${csvContent}`);

          // Extract student records for database parity
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (rows && rows.length > 0) {
            // Attempt to find headers for subject mapping
            let headers: string[] = [];
            let headerIdx = -1;
            for (let r = 0; r < Math.min(rows.length, 12); r++) {
              const row = rows[r];
              if (!row) continue;
              const hasRegNo = row.some(cell => {
                const cellStr = String(cell || "").toLowerCase().trim();
                return cellStr.includes("reg") || cellStr.includes("roll") || cellStr.includes("registration");
              });
              const hasName = row.some(cell => {
                const cellStr = String(cell || "").toLowerCase().trim();
                return cellStr.includes("name") || cellStr.includes("student");
              });
              if (hasRegNo || (hasName && row.length > 2)) {
                headers = row.map(cell => String(cell || "").trim());
                headerIdx = r;
                break;
              }
            }

            const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
            for (let r = startRow; r < rows.length; r++) {
              const row = rows[r];
              if (!row || row.length < 2) continue;

              // Find registration number
              let foundRegNo = "";
              let regNoColIdx = -1;
              let foundName = "";
              let nameColIdx = -1;

              row.forEach((cell, cIdx) => {
                const cellStr = String(cell || "").trim().replace(/\s+/g, "");
                if (cellStr.match(/^\d{10,12}$/)) {
                  foundRegNo = cellStr;
                  regNoColIdx = cIdx;
                }
              });

              if (foundRegNo) {
                // Extract Student Name
                const searchIndices = [regNoColIdx + 1, regNoColIdx - 1, regNoColIdx + 2];
                for (const searchIdx of searchIndices) {
                  if (searchIdx >= 0 && searchIdx < row.length) {
                    const val = String(row[searchIdx] || "").trim();
                    if (val && val.length > 2 && !val.match(/^\d+$/) && isNaN(Number(val)) && !val.toLowerCase().includes("reg")) {
                      foundName = val;
                      nameColIdx = searchIdx;
                      break;
                    }
                  }
                }

                // Extract subject grades
                let foundCgpa = 8.5;
                let foundSubjectsList: { code: string; name: string; credits: number; grade: string; gradePoint: number }[] = [];
                let foundSemester = 4; // BTECH 2024 is typically 4th sem in 2026

                // Check if filename contains Sem number to be adaptive
                const semMatch = fileName.match(/(\d+)(st|nd|rd|th)?\s*Sem/i);
                if (semMatch) {
                  foundSemester = parseInt(semMatch[1]) || 4;
                }

                // Default grades map
                const pointMap: Record<string, number> = { O: 10, E: 9, A: 8, B: 7, C: 6, D: 5, F: 0, S: 10 };

                row.forEach((cell, cIdx) => {
                  if (cIdx === regNoColIdx || cIdx === nameColIdx) return;
                  const cellStr = String(cell || "").trim();
                  const colHeader = headers[cIdx] ? headers[cIdx].toLowerCase() : "";

                  if (colHeader.includes("cgpa") || colHeader.includes("gpa")) {
                    const val = parseFloat(cellStr);
                    if (!isNaN(val) && val > 0 && val <= 10) foundCgpa = val;
                  }

                  // If column header starts with CU or is a subject, and the cell is a single letter grade (O,E,A,B,C,D,F)
                  const isGrade = cellStr.match(/^[OEABCDFS]$/i);
                  if (isGrade) {
                    const grade = cellStr.toUpperCase();
                    let code = (headers[cIdx] || `SUBJECT-${cIdx}`).toUpperCase();
                    // Clean up headers like "CUAI1002 - Grade" or just code
                    const codeMatch = code.match(/^[A-Z]{4}\d{4}[A-Z0-9\+]*/);
                    if (codeMatch) {
                      code = codeMatch[0];
                    }

                    let subName = "Core Subject Course";
                    if (code.startsWith("CUAI1002")) subName = "Applied Probability and Statistics for AIML";
                    else if (code.startsWith("CUCS1003")) subName = "Design and Analysis of Algorithms";
                    else if (code.startsWith("CUCS1005")) subName = "Relational and Distributed Databases";
                    else if (code.startsWith("CUTM1005")) subName = "Probability & Statistics";
                    else if (code.startsWith("CUTM1020")) subName = "Robotic Automation with ROS and C++";
                    else if (code.startsWith("CUTM1021")) subName = "Design Thinking";
                    else if (code.startsWith("CUCS1013")) subName = "Android Development with Kotlin";
                    else if (code.startsWith("CUTM1019")) subName = "Machine Learning using Python";
                    else if (code.startsWith("CUVA4060")) subName = "Gender, Human Rights and Ethics";

                    foundSubjectsList.push({
                      code,
                      name: subName,
                      credits: code.includes("CS1003") ? 6 : code.includes("AI1002") ? 4 : 3,
                      grade,
                      gradePoint: pointMap[grade] !== undefined ? pointMap[grade] : 8
                    });
                  }
                });

                // Save to DB
                let email = `${foundName.toLowerCase().replace(/\s+/g, "")}@cutm.ac.in`;
                if (foundRegNo === "240101371026") {
                  email = "konduruvinayvenkat@gmail.com";
                }

                // Build SGPA/CGPA cleanly
                const totalCredits = foundSubjectsList.reduce((acc, sub) => acc + sub.credits, 0);
                const totalPoints = foundSubjectsList.reduce((acc, sub) => acc + (sub.gradePoint * sub.credits), 0);
                const computedSgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 8.5;

                const existingStudent = await StudentModel.findOne({ regNo: foundRegNo });
                if (existingStudent) {
                  existingStudent.name = foundName || existingStudent.name;
                  existingStudent.cgpa = computedSgpa;
                  if (foundSubjectsList.length > 0) {
                    existingStudent.subjects = foundSubjectsList;
                  }
                  existingStudent.attendanceRate = existingStudent.attendanceRate || 85;
                  await existingStudent.save();
                } else {
                  await StudentModel.create({
                    regNo: foundRegNo,
                    name: foundName || "Konduru Venket",
                    email,
                    department: "Computer Science & Engineering (AI & ML)",
                    semester: foundSemester,
                    attendanceRate: 85,
                    sgpaHistory: [
                      { semester: 1, sgpa: computedSgpa - 0.2 },
                      { semester: 2, sgpa: computedSgpa + 0.1 },
                      { semester: 3, sgpa: computedSgpa },
                      { semester: 4, sgpa: computedSgpa }
                    ],
                    cgpa: computedSgpa,
                    subjects: foundSubjectsList.length > 0 ? foundSubjectsList : [
                      { code: "CUAI1002", name: "Applied Probability & Statistics", credits: 4, grade: "E", gradePoint: 9 },
                      { code: "CUCS1003", name: "Design and Analysis of Algorithms", credits: 6, grade: "E", gradePoint: 9 },
                      { code: "CUCS1005", name: "Relational and Distributed Databases", credits: 3, grade: "E", gradePoint: 9 }
                    ]
                  });
                }
              }
            }
          }
        }

        extractedText = allTexts.join("\n\n");
      } catch (sheetErr) {
        console.error("SheetJS XLS/CSV parsed extraction errored:", sheetErr);
      }
    }

    // If uploading an image or custom data, let's call Gemini to extract textual index if key is present!
    const ai = getGeminiClient();
    if (ai && (fileContentsBase64 || textContent || xlsxUploaded)) {
      try {
        let prompt = `You are a Document Intelligence system running inside CENTURIONGPT for Centurion University. Please extract all meaningful university information, timetable grids, examination grades, notices, credit configurations, or syllabus objectives from this file. Description: ${description}. File Name: ${fileName}.\n`;
        
        let contents: any;
        if (xlsxUploaded) {
          contents = prompt + `Spreadsheet raw parsed table content:\n${extractedText}\n\nSummarize all student records, active registry counts, list of subject codes mapped, and notices inside this worksheet.`;
        } else if (fileContentsBase64 && (fileType.match(/png|jpg|jpeg/i) || fileType.toLowerCase() === "pdf")) {
          const mime = fileType.toLowerCase() === "pdf" ? "application/pdf" : `image/${fileType === "jpg" ? "jpeg" : fileType}`;
          contents = {
            parts: [
              { inlineData: { mimeType: mime, data: fileContentsBase64 } },
              { text: prompt + "Extract all text, structures, tables, lists, notices, credit mappings, syllabus details, and objectives from this document. Deliver a rich, clean, and comprehensive summary of all contents." }
            ]
          };
        } else {
          contents = prompt + `File Raw text contents:\n${textContent || ""}\n\nDeliver semantic extraction structure.`;
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
        });

        if (!xlsxUploaded) {
          extractedText = response.text || textContent || "";
        }
        summary = response.text || "Intelligently indexed successfully.";
      } catch (e: any) {
        console.error("Gemini document indexing failed:", e);
        if (!xlsxUploaded) {
          extractedText = textContent || "Extracted fallback metadata content for file.";
        }
        summary = "Fallback metadata indexing.";
      }
    } else {
      // Basic automatic parser for non-ai runs
      if (!xlsxUploaded) {
        extractedText = textContent || `Extracted text index from ${fileName}. Content detailing ${description}.`;
      }
      summary = "Indexed standard fallback headers.";
    }

    const docToSave = {
      ...freshFile,
      extractedText,
      summary
    };

    const created = await AcademicFileModel.create(docToSave);
    res.json({ success: true, file: created });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to upload file: " + err.message });
  }
});

app.delete("/api/files/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await AcademicFileModel.deleteOne({ id });
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete file: " + err.message });
  }
});

// Crawler Scraper Control Panel API
app.get("/api/scraper", async (req, res) => {
  try {
    const urls = await ScrapedUrlModel.find();
    res.json(urls);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load scraped URLs: " + err.message });
  }
});

app.post("/api/scraper/crawl", async (req, res) => {
  const { url, title } = req.body;
  if (!url) return res.status(400).json({ error: "URL is empty" });

  const freshPage = {
    url,
    title: title || url,
    lastScraped: new Date().toISOString(),
    content: ""
  };

  try {
    const ai = getGeminiClient();
    if (ai) {
      try {
        // Simulate real university fetching and feed it through Gemini to index
        const simulateInstructions = `You are a real-time official university web crawler scraping official info from URL: ${url}. Please retrieve/generate clean information context about notice boards, syllabus updates, timetables, academic calendars, placement updates, and exams on this university portal page. Standard layout should feel like actual HTML scraping logs.`;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: simulateInstructions,
        });

        freshPage.content = response.text || "";
      } catch (e) {
        freshPage.content = `Fallback crawls. Official Notice board updates at ${url}. CSE AI&ML department has revised examination lists for the final week. No active failures found.`;
      }
    } else {
      freshPage.content = `Crawled details for ${title || url}. Official portal notice board announcements. Academic credits must match subject thresholds properly. Exam registration deadline is announced online.`;
    }

    await ScrapedUrlModel.deleteOne({ url });
    const created = await ScrapedUrlModel.create(freshPage);
    res.json({ success: true, page: created });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to crawl URL: " + err.message });
  }
});

app.delete("/api/scraper", async (req, res) => {
  const { url } = req.body;
  try {
    await ScrapedUrlModel.deleteOne({ url });
    res.json({ success: true, url });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete scraped URL: " + err.message });
  }
});

// RAG AI Query Engine Endpoint
app.post("/api/chat/query", async (req, res) => {
  const { query, regNo, role, history = [] } = req.body;

  try {
    // 1. Gather Context Knowledge Base for RAG Search
    const ragPool: { text: string; source: string; meta?: any }[] = [];

    // Add all active university notices to pool
    const notices = await NoticeModel.find();
    notices.forEach((n: any) => {
      ragPool.push({
        text: `Notice Title: ${n.title}\nCategory: ${n.category}\nDate: ${n.date}\nContent: ${n.content}\nPublisher: ${n.author}`,
        source: `University Notice BOARD: "${n.title}" (${n.date})`,
        meta: n
      });
    });

    // Add all uploaded file content/indexes to pool
    const files = await AcademicFileModel.find();
    files.forEach((f: any) => {
      ragPool.push({
        text: `Document Name: ${f.fileName}\nDescription: ${f.description}\nIndexed Content:\n${f.extractedText || ""}`,
        source: `Uploaded Academic Document: "${f.fileName}"`,
        meta: f
      });
    });

    // Add all crawled URL webpages to pool
    const scrapedUrls = await ScrapedUrlModel.find();
    scrapedUrls.forEach((s: any) => {
      ragPool.push({
        text: `Web URL: ${s.url}\nPage Title: ${s.title}\nScraped Data:\n${s.content}`,
        source: `Official Website Integration: "${s.title}" (${s.url})`,
        meta: s
      });
    });

    // Retrieve relevant records
    let relevantRecords = semanticSearch(query, ragPool, 4);

    // 2. Identify Student Specific Personal Context
    let studentContextStr = "";
    let studentProfile: any = null;
    if (role === "student" && regNo) {
      studentProfile = await StudentModel.findOne({ regNo });
      if (studentProfile) {
        studentContextStr = `CURRENT STUDENT IDENTITY (Active Persona):
Name: ${studentProfile.name}
Registration Number: ${studentProfile.regNo}
Department: ${studentProfile.department}
Semester: ${studentProfile.semester}
Attendance: ${studentProfile.attendanceRate}%
Current CGPA: ${studentProfile.cgpa}
Grade Ledger / Credit breakdowns:
${studentProfile.subjects.map((s: any) => `- ${s.code}: ${s.name} (Credits: ${s.credits}, Grade: ${s.grade}, Grade Point: ${s.gradePoint})`).join("\n")}
`;
      }
    }

    // 3. System Instructions and prompt engineering
    const systemPrompt = `You are "CENTURIONGPT", an enterprise-grade AI University Intelligence & Academic Assistant platform for Centurion University of Technology and Management (CUTM).
You are assisting ${role === "student" ? "a student" : role === "faculty" ? "a faculty member" : "an administrator"}.

${studentProfile ? `You MUST customize your response to this student's profile context. Notice key academic parameters like subject codes, grade points, SGPA, CGPA, and warning markers (e.g., attendance under 75%).` : ""}

Use these RAG records to solve their query if applicable:
${relevantRecords.map((r, i) => `[CITATION #${i + 1}] Source: ${r.source}\nContent excerpt:\n${r.text}`).join("\n\n")}

Core Design Directives:
1. Speak with professional, positive, authoritative composure. Refer to official guidelines.
2. If there are citations used, cite them elegantly at the end or in-line as: [Source Title].
3. For student SGPA or CGPA calculations or grades inquiries, output clear markdown tables displaying subject credits, grade points, and attendance. Warn them if CGPA is below thresholds or attendance is critical (below 75%).
4. Do not invent facts or grades. Only extract what is present in student ledger or RAG context.
5. If the user query is conversational greeting, answer politely, representing CenturionGPT.
`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        // Package query chat history
        const contentsParts: any[] = [];
        
        // Inject RAG prompt
        contentsParts.push({ text: `System context: ${systemPrompt}\n\nUser Profile data:\n${studentContextStr}\n\nClient Query: ${query}` });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contentsParts,
        });

        const responseText = response.text || "I was unable to retrieve a response from the intelligence system.";
        
        // Assemble nice custom citations array
        const citations = relevantRecords.map(r => r.source);

        res.json({
          text: responseText,
          citations: citations.length > 0 ? citations : undefined
        });
      } catch (e: any) {
        console.error("Gemini chat processing errored:", e);
        res.status(500).json({ error: "AI reasoning failed: " + e.message });
      }
    } else {
      // High-fidelity fallback heuristic chatbot in case API key is missing
      let responseText = `**Notice from CenturionGPT Assistant:** The server is running in local search mode. Here is the relevant database result: \n\n`;

      if (query.toLowerCase().includes("cgpa") || query.toLowerCase().includes("sgpa") || query.toLowerCase().includes("grade") || query.toLowerCase().includes("credit")) {
        if (studentProfile) {
          responseText += `Hello **${studentProfile.name}** [Registration No: ${studentProfile.regNo}]. According to your formal PostgreSQL profile ledger, you are in **${studentProfile.department} Semester ${studentProfile.semester}**.\n\n### 📊 Your Semester 6 Academic Card\n\n`;
          responseText += `| Course Code | Subject Name | Credits | Grade | Grade Point | Status |\n|---|---|---|---|---|---|\n`;
          studentProfile.subjects.forEach((s: any) => {
            responseText += `| ${s.code} | ${s.name} | ${s.credits} | **${s.grade}** | ${s.gradePoint} | Passed |\n`;
          });
          responseText += `\n* **Academic Attendance Tracker:** \`${studentProfile.attendanceRate}%\` ${studentProfile.attendanceRate < 75 ? "⚠️ **WARNING: Below the exam eligibility threshold of 75%!**" : "✅ Eligible for examination."}\n`;
          responseText += `* **Cumulative Grade Point Average (CGPA):** \`${studentProfile.cgpa}\` / 10\n\n`;
          responseText += `Our calculation models show that you have successfully achieved a cumulative total of **${studentProfile.subjects.reduce((sum: number, s: any) => sum + s.credits, 0)}** registered credits in your active semester.`;
        } else {
          responseText += `To view grades, credits, SGPA, or CGPA, please select your student identity from the login bar on the dashboard.`;
        }
      } else if (query.toLowerCase().includes("notice") || query.toLowerCase().includes("exam") || query.toLowerCase().includes("placement")) {
        responseText += `### 📢 Latest Official Notice Board Extracts:\n\n`;
        const notices = await NoticeModel.find().sort({ date: -1 });
        notices.forEach((n: any) => {
          responseText += `* **[${n.category}] ${n.title}** (${n.date}) \n  *${n.content}* (Published by: ${n.author})\n\n`;
        });
      } else {
        // General match
        if (relevantRecords.length > 0) {
          responseText += `### 🔍 Semantically Matched Database Records:\n\n`;
          relevantRecords.forEach((r, idx) => {
            responseText += `**Record #${idx + 1}** (Source: ${r.source})\n> ${r.text.substring(0, 300)}...\n\n`;
          });
        } else {
          responseText += `Welcome to **CenturionGPT**, Centurion University's AI Academic Assistant System! \n\nI am ready to help you trace syllabus items, exam dates, placements, or calculate your CGPA grades. Try asking me:\n* *"What is my CGPA?"*\n* *"Show exam notices"* \n* *"Syllabus detail for Machine Learning"*`;
        }
      }

      const citations = relevantRecords.map(r => r.source);
      res.json({
        text: responseText,
        citations: citations.length > 0 ? citations : ["System Local Ledger Database"]
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process chat query: " + err.message });
  }
});

// Vite middleware setup or static production assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if VERCEL environment variable is NOT present (local run)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`CenturionGPT full-stack server running on http://localhost:${PORT}`);
    });
  }
}

// Export default app for Vercel Serverless Function compatibility
export default app;

// Run startServer if process is launched directly (not as a module on Vercel)
if (!process.env.VERCEL) {
  startServer();
}
