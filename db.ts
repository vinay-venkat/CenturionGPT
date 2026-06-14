import mongoose, { Schema } from 'mongoose';
import fs from 'fs';
import path from 'path';

// Define schemas

// 1. Student
const StudentSchema = new Schema({
  regNo: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, required: true },
  semester: { type: Number, required: true },
  attendanceRate: { type: Number, required: true },
  sgpaHistory: [{ semester: Number, sgpa: Number }],
  cgpa: { type: Number, required: true },
  subjects: [{
    code: String,
    name: String,
    credits: Number,
    grade: String,
    gradePoint: Number
  }],
  pin: String
});

// 2. Faculty
const FacultySchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  pin: { type: String, required: true }
});

// 3. Admin
const AdminSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  role: { type: String, required: true },
  pin: { type: String, required: true }
});

// 4. Notice
const NoticeSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String, required: true },
  category: { type: String, required: true },
  author: { type: String, required: true },
  sourceUrl: String
});

// 5. AcademicFile
const AcademicFileSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: String, required: true },
  description: { type: String, required: true },
  extractedText: String,
  summary: String
});

// 6. ScrapedUrl
const ScrapedUrlSchema = new Schema({
  url: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  lastScraped: { type: String, required: true },
  content: { type: String, required: true }
});

class ModelWrapper {
  private mongooseModel: any;
  private collectionKey: string;

  constructor(mongooseModel: any, collectionKey: string) {
    this.mongooseModel = mongooseModel;
    this.collectionKey = collectionKey;
  }

  private isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async findOne(query: any) {
    if (this.isConnected()) {
      return this.mongooseModel.findOne(query);
    }
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
    }
    const list = data[this.collectionKey] || [];
    const item = list.find((item: any) => {
      return Object.keys(query || {}).every(key => {
        const val = query[key];
        if (typeof val === 'object' && val !== null) {
          if (val.$regex) {
            const regex = typeof val.$regex === 'string' ? new RegExp(val.$regex, 'i') : val.$regex;
            return regex.test(item[key] || '');
          }
        }
        return String(item[key] || '').toLowerCase() === String(val || '').toLowerCase();
      });
    });
    if (item) {
      const doc = { ...item };
      const colKey = this.collectionKey;
      Object.defineProperty(doc, 'save', {
        value: async function() {
          let freshData: any = {};
          if (fs.existsSync(DB_FILE)) {
            try { freshData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
          }
          const freshList = freshData[colKey] || [];
          const idx = freshList.findIndex((x: any) => x.regNo === this.regNo || x.email === this.email || x.id === this.id || x.url === this.url);
          if (idx !== -1) {
            const toSave = { ...this };
            delete toSave.save;
            freshList[idx] = toSave;
            try { fs.writeFileSync(DB_FILE, JSON.stringify(freshData, null, 2), 'utf-8'); } catch(e) {}
          }
        }.bind(doc),
        writable: true,
        configurable: true,
        enumerable: false
      });
      return doc;
    }
    return null;
  }

  async find(query: any = {}) {
    if (this.isConnected()) {
      return this.mongooseModel.find(query);
    }
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
    }
    const list = data[this.collectionKey] || [];
    const results = list.filter((item: any) => {
      return Object.keys(query || {}).every(key => {
        return String(item[key] || '') === String(query[key] || '');
      });
    });
    const chain = results;
    Object.defineProperty(chain, 'sort', {
      value: function(sortObj: any) {
        const field = Object.keys(sortObj || {})[0];
        if (!field) return this;
        const order = sortObj[field];
        return this.sort((a: any, b: any) => {
          if (a[field] < b[field]) return order === -1 ? 1 : -1;
          if (a[field] > b[field]) return order === -1 ? -1 : 1;
          return 0;
        });
      }.bind(chain),
      writable: true,
      configurable: true,
      enumerable: false
    });
    return chain;
  }

  async findOneAndUpdate(query: any, update: any, options: any = {}) {
    if (this.isConnected()) {
      return this.mongooseModel.findOneAndUpdate(query, update, options);
    }
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
    }
    if (!data[this.collectionKey]) data[this.collectionKey] = [];
    const list = data[this.collectionKey];
    const idx = list.findIndex((item: any) => {
      return Object.keys(query || {}).every(key => String(item[key] || '') === String(query[key] || ''));
    });
    const docUpdate = update.$set || update;
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...docUpdate };
      try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch(e) {}
      return list[idx];
    } else if (options.upsert) {
      const newDoc = { ...query, ...docUpdate };
      list.push(newDoc);
      try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch(e) {}
      return newDoc;
    }
    return null;
  }

  async create(doc: any) {
    if (this.isConnected()) {
      return this.mongooseModel.create(doc);
    }
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
    }
    if (!data[this.collectionKey]) data[this.collectionKey] = [];
    data[this.collectionKey].push(doc);
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch(e) {}
    return doc;
  }

  async insertMany(docs: any[]) {
    if (this.isConnected()) {
      return this.mongooseModel.insertMany(docs);
    }
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
    }
    if (!data[this.collectionKey]) data[this.collectionKey] = [];
    data[this.collectionKey].push(...docs);
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch(e) {}
    return docs;
  }

  async deleteOne(query: any) {
    if (this.isConnected()) {
      return this.mongooseModel.deleteOne(query);
    }
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
    }
    const list = data[this.collectionKey] || [];
    const beforeLength = list.length;
    const filtered = list.filter((item: any) => {
      return !Object.keys(query || {}).every(key => String(item[key] || '') === String(query[key] || ''));
    });
    data[this.collectionKey] = filtered;
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch(e) {}
    return { deletedCount: beforeLength - filtered.length };
  }

  async countDocuments(query: any = {}) {
    if (this.isConnected()) {
      return this.mongooseModel.countDocuments(query);
    }
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e) {}
    }
    const list = data[this.collectionKey] || [];
    return list.filter((item: any) => {
      return Object.keys(query || {}).every(key => String(item[key] || '') === String(query[key] || ''));
    }).length;
  }
}

const StudentMongoose = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const FacultyMongoose = mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
const AdminMongoose = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
const NoticeMongoose = mongoose.models.Notice || mongoose.model('Notice', NoticeSchema);
const AcademicFileMongoose = mongoose.models.AcademicFile || mongoose.model('AcademicFile', AcademicFileSchema);
const ScrapedUrlMongoose = mongoose.models.ScrapedUrl || mongoose.model('ScrapedUrl', ScrapedUrlSchema);

export const Student = new ModelWrapper(StudentMongoose, 'students') as any;
export const Faculty = new ModelWrapper(FacultyMongoose, 'faculty') as any;
export const Admin = new ModelWrapper(AdminMongoose, 'admins') as any;
export const Notice = new ModelWrapper(NoticeMongoose, 'notices') as any;
export const AcademicFile = new ModelWrapper(AcademicFileMongoose, 'files') as any;
export const ScrapedUrl = new ModelWrapper(ScrapedUrlMongoose, 'scrapedUrls') as any;



export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("WARNING: MONGODB_URI is not defined in environment variables. DB connection skipped.");
    return;
  }
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    console.log('Successfully connected to MongoDB.');
    await seedDb();
  }
}

async function seedDb() {
  try {
    // Check if seeding is already completed by checking if records exist
    const studentCount = await Student.countDocuments();
    const facultyCount = await Faculty.countDocuments();
    const adminCount = await Admin.countDocuments();
    const noticeCount = await Notice.countDocuments();
    const fileCount = await AcademicFile.countDocuments();
    const scrapedCount = await ScrapedUrl.countDocuments();

    if (studentCount > 0 || facultyCount > 0 || adminCount > 0 || noticeCount > 0 || fileCount > 0 || scrapedCount > 0) {
      console.log('Database already has content, skipping seeding.');
      return;
    }

    console.log('Starting DB seeding...');

    // Load seed data from server_db.json if it exists, otherwise use defaults
    const DB_FILE = path.join(process.cwd(), "server_db.json");
    let seedData: any = {};

    if (fs.existsSync(DB_FILE)) {
      try {
        const rawData = fs.readFileSync(DB_FILE, 'utf-8');
        seedData = JSON.parse(rawData);
        console.log('Loaded seed data from server_db.json.');
      } catch (err) {
        console.error('Failed to parse server_db.json, using defaults:', err);
      }
    }

    const defaultFaculty = seedData.faculty && seedData.faculty.length > 0 ? seedData.faculty : [
      {
        name: "Dr. Vinayak Venkatraman",
        email: "vinayak@cutm.ac.in",
        department: "Computer Science & Engineering (AI & ML)",
        designation: "Professor & Program Coordinator",
        pin: "admin99"
      }
    ];

    const defaultAdmins = seedData.admins && seedData.admins.length > 0 ? seedData.admins : [
      {
        name: "K. Vinay Venkat (Super Admin)",
        email: "konduruvinayvenkat@gmail.com",
        role: "Chief Academic Administrator",
        pin: "root2026"
      }
    ];

    const defaultNotices = seedData.notices && seedData.notices.length > 0 ? seedData.notices : [
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
    ];

    const defaultFiles = seedData.files && seedData.files.length > 0 ? seedData.files : [
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
    ];

    const defaultScrapedUrls = seedData.scrapedUrls && seedData.scrapedUrls.length > 0 ? seedData.scrapedUrls : [
      {
        url: "https://cutm.ac.in/academic-calendar",
        title: "CUTM Academic Calendar 2025-26",
        lastScraped: "2026-05-29T18:00:00Z",
        content: "Centurion University Academic Session 2025-2026. Even Semester (4th Semester) runs from January 2026 to June 2026. Practical Examinations for Semester 4 occur between June 8th and June 14th, 2026. Registration for Semester 5 commences July 1st, 2026."
      }
    ];

    // Seed students if present in JSON
    if (seedData.students && seedData.students.length > 0) {
      const validStudents = seedData.students.filter((s: any) => s.pin !== undefined);
      if (validStudents.length > 0) {
        await Student.insertMany(validStudents);
        console.log(`Seeded ${validStudents.length} students.`);
      }
    }

    // Seed others
    await Faculty.insertMany(defaultFaculty);
    console.log(`Seeded ${defaultFaculty.length} faculty profiles.`);

    await Admin.insertMany(defaultAdmins);
    console.log(`Seeded ${defaultAdmins.length} admin profiles.`);

    await Notice.insertMany(defaultNotices);
    console.log(`Seeded ${defaultNotices.length} notices.`);

    await AcademicFile.insertMany(defaultFiles);
    console.log(`Seeded ${defaultFiles.length} academic files.`);

    await ScrapedUrl.insertMany(defaultScrapedUrls);
    console.log(`Seeded ${defaultScrapedUrls.length} scraped URLs.`);

    console.log('Database seeding successfully finished.');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
