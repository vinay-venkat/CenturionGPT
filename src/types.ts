/**
 * Shared types for CenturionGPT
 */

export type UserRole = "student" | "faculty" | "admin";

export interface StudentRecord {
  regNo: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  attendanceRate: number; // e.g. 85 for 85%
  sgpaHistory: { semester: number; sgpa: number }[];
  cgpa: number;
  subjects: SubjectGrade[];
  pin?: string;
}

export interface FacultyRecord {
  name: string;
  email: string;
  department: string;
  designation: string;
  pin: string;
}

export interface AdminRecord {
  name: string;
  email: string;
  role: string;
  pin: string;
}

export interface SubjectGrade {
  code: string;
  name: string;
  credits: number;
  grade: string; // "O" | "E" | "A" | "B" | "C" | "D" | "F" | "S"
  gradePoint: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  category: "Academic" | "Examination" | "Placement" | "General";
  author: string;
  sourceUrl?: string; // If crawled
}

export interface AcademicFile {
  id: string;
  fileName: string;
  fileType: string; // "pdf" | "docx" | "txt" | "xlsx" | "csv" | "pptx" | "image"
  uploadedBy: string;
  uploadedAt: string;
  description: string;
  extractedText?: string;
  summary?: string;
}

export interface ScrapedUrl {
  url: string;
  title: string;
  lastScraped: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  citations?: string[];
  isVoice?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: string;
}
