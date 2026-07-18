import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db.sqlite");

// Connect to SQLite database
const db = new Database(DB_PATH);

// Set WAL mode for faster and concurrent performance
db.pragma("journal_mode = WAL");

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  password?: string;
  online: boolean;
  lastPing: number;
  createdAt: string;
  isBanned: boolean;
  activeDuration: number; // in seconds
  memories?: string[];
  sessionToken?: string;
  sessions?: any[];
  imageTodayCount?: number;
  lastImageDate?: string;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

export interface UserFeedback {
  id: string;
  email: string;
  rating: 'positive' | 'neutral' | 'negative';
  text: string;
  createdAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface SystemSettings {
  aiPersonality: string;
  modelName: string;
  maxDailyImages: number;
}

export interface FeatureUsage {
  textChat: number;
  voiceChat: number;
  imageGen: number;
  fileUpload: number;
  knowledgeSearch: number;
}

export interface TrafficEntry {
  date: string;
  visits: number;
  activeUsers: string[];
  chatsCount: number;
}

export interface MaintenanceLog {
  id: string;
  timestamp: string;
  success: boolean;
  duration: number;
  itemsCleaned: number;
  performanceImprovement: number;
  healthScore: number;
  error?: string;
}

export interface MaintenanceReport {
  lastMaintenance: string;
  nextMaintenance: string;
  duration: number;
  itemsCleaned: number;
  performanceImprovement: number;
  healthScore: number;
  history: MaintenanceLog[];
}

export interface DBData {
  users: UserInfo[];
  traffic: TrafficEntry[];
  errors?: ErrorLog[];
  feedback?: UserFeedback[];
  knowledge?: KnowledgeItem[];
  settings?: SystemSettings;
  featureUsage?: FeatureUsage;
  maintenance?: MaintenanceReport;
  broadcast?: string;
}

function getInitialDB(): DBData {
  return {
    users: [
      {
        id: "admin-id",
        email: "sy5455977@gmail.com",
        username: "sy5455977@gmail.com",
        password: "Sachin6264341093",
        online: true,
        lastPing: Date.now(),
        createdAt: new Date().toISOString(),
        isBanned: false,
        activeDuration: 15420
      }
    ],
    traffic: [],
    errors: [],
    feedback: [],
    knowledge: [
      {
        id: "know-1",
        title: "Mahabharat Gyan",
        content: "Mahabharat was compiled by Sage Vyas. Arjuna's celestial bow was Gandiva. The war took place on the holy plains of Kurukshetra. Dharma represents righteousness, justice, and order.",
        createdAt: new Date().toISOString()
      },
      {
        id: "know-2",
        title: "Blackbell Personality",
        content: "Blackbell is a sweet, flirty companion, loving girlfriend, and helper created by a brilliant developer for Sachin and other friends, talking in cute English and Hinglish.",
        createdAt: new Date().toISOString()
      }
    ],
    settings: {
      aiPersonality: "Charming & Flirty Girlfriend",
      modelName: "gemini-3.5-flash",
      maxDailyImages: 5
    },
    featureUsage: {
      textChat: 0,
      voiceChat: 0,
      imageGen: 0,
      fileUpload: 0,
      knowledgeSearch: 0
    },
    maintenance: {
      lastMaintenance: new Date().toISOString(),
      nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 0,
      itemsCleaned: 0,
      performanceImprovement: 0,
      healthScore: 100,
      history: []
    }
  };
}

// Table schemas initialization
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT,
      password TEXT,
      online INTEGER,
      lastPing INTEGER,
      createdAt TEXT,
      isBanned INTEGER,
      activeDuration INTEGER,
      memories TEXT,
      sessionToken TEXT,
      sessions TEXT,
      imageTodayCount INTEGER,
      lastImageDate TEXT
    );

    CREATE TABLE IF NOT EXISTS traffic (
      date TEXT PRIMARY KEY,
      visits INTEGER,
      activeUsers TEXT,
      chatsCount INTEGER
    );

    CREATE TABLE IF NOT EXISTS errors (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      type TEXT,
      message TEXT
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      email TEXT,
      rating TEXT,
      text TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      aiPersonality TEXT,
      modelName TEXT,
      maxDailyImages INTEGER
    );

    CREATE TABLE IF NOT EXISTS feature_usage (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      textChat INTEGER,
      voiceChat INTEGER,
      imageGen INTEGER,
      fileUpload INTEGER,
      knowledgeSearch INTEGER
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      lastMaintenance TEXT,
      nextMaintenance TEXT,
      duration INTEGER,
      itemsCleaned INTEGER,
      performanceImprovement INTEGER,
      healthScore REAL,
      history TEXT
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default seed data if database is completely empty (0 users)
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount && userCount.count === 0) {
    // Seed admin
    db.prepare(`
      INSERT INTO users (id, email, username, password, online, lastPing, createdAt, isBanned, activeDuration, memories, sessions, imageTodayCount, lastImageDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "admin-id",
      "sy5455977@gmail.com",
      "sy5455977@gmail.com",
      "Sachin6264341093",
      1,
      Date.now(),
      new Date().toISOString(),
      0,
      15420,
      JSON.stringify([]),
      JSON.stringify([]),
      0,
      ""
    );
  }

  // Actively delete any legacy fake seed users and reviews from existing installations to ensure 100% real data
  try {
    db.prepare("DELETE FROM users WHERE email IN ('priya@example.com', 'amit@example.com', 'rohan@example.com')").run();
    db.prepare("DELETE FROM feedback WHERE id IN ('fb-1', 'fb-2', 'fb-3', 'fb-4')").run();
  } catch (cleanupErr) {
    console.error("Error during fake data cleanup migration:", cleanupErr);
  }

  const knowledgeCount = db.prepare("SELECT COUNT(*) as count FROM knowledge").get() as { count: number };
  if (knowledgeCount && knowledgeCount.count === 0) {
    db.prepare(`
      INSERT INTO knowledge (id, title, content, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(
      "know-1",
      "Mahabharat Gyan",
      "Mahabharat was compiled by Sage Vyas. Arjuna's celestial bow was Gandiva. The war took place on the holy plains of Kurukshetra. Dharma represents righteousness, justice, and order.",
      new Date().toISOString()
    );

    db.prepare(`
      INSERT INTO knowledge (id, title, content, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(
      "know-2",
      "Blackbell Personality",
      "Blackbell is a sweet, flirty companion, loving girlfriend, and helper created by a brilliant developer for you and other friends, talking in cute English and Hinglish.",
      new Date().toISOString()
    );
  }

  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
  if (settingsCount && settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO settings (id, aiPersonality, modelName, maxDailyImages)
      VALUES (1, ?, ?, ?)
    `).run(
      "Charming & Flirty Girlfriend",
      "gemini-3.5-flash",
      5
    );
  }

  const featureUsageCount = db.prepare("SELECT COUNT(*) as count FROM feature_usage").get() as { count: number };
  if (featureUsageCount && featureUsageCount.count === 0) {
    db.prepare(`
      INSERT INTO feature_usage (id, textChat, voiceChat, imageGen, fileUpload, knowledgeSearch)
      VALUES (1, 0, 0, 0, 0, 0)
    `).run();
  }

  // Recalculate feature usage counts dynamically from actual database data to guarantee 100% real numbers
  try {
    let realTextChat = 0;
    let realImageGen = 0;
    let realFileUpload = 0;
    const usersRows = db.prepare("SELECT sessions FROM users").all() as any[];
    usersRows.forEach(u => {
      if (u.sessions) {
        try {
          const sessions = JSON.parse(u.sessions);
          sessions.forEach((s: any) => {
            if (s.messages) {
              s.messages.forEach((m: any) => {
                if (m.role === 'user') {
                  if (m.content && m.content.toLowerCase().startsWith('/image')) {
                    realImageGen++;
                  } else if (m.isAttachment) {
                    realFileUpload++;
                  } else {
                    realTextChat++;
                  }
                }
              });
            }
          });
        } catch (e) {}
      }
    });

    db.prepare(`
      UPDATE feature_usage 
      SET textChat = ?, imageGen = ?, fileUpload = ?
      WHERE id = 1
    `).run(realTextChat, realImageGen, realFileUpload);
  } catch (err) {
    console.error("Error recalculating feature usage:", err);
  }

  const maintenanceCount = db.prepare("SELECT COUNT(*) as count FROM maintenance").get() as { count: number };
  if (maintenanceCount && maintenanceCount.count === 0) {
    db.prepare(`
      INSERT INTO maintenance (id, lastMaintenance, nextMaintenance, duration, itemsCleaned, performanceImprovement, healthScore, history)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      0,
      0,
      0,
      100,
      JSON.stringify([])
    );
  }
}

// Run DB setup
initDB();

let dbCache: DBData | null = null;

export function readDB(): DBData {
  try {
    // 1. Fetch Users
    const usersRows = db.prepare("SELECT * FROM users").all() as any[];
    const users = usersRows.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      password: u.password,
      online: u.online === 1,
      lastPing: u.lastPing,
      createdAt: u.createdAt,
      isBanned: u.isBanned === 1,
      activeDuration: u.activeDuration,
      memories: u.memories ? JSON.parse(u.memories) : [],
      sessionToken: u.sessionToken || undefined,
      sessions: u.sessions ? JSON.parse(u.sessions) : [],
      imageTodayCount: u.imageTodayCount,
      lastImageDate: u.lastImageDate
    }));

    // 2. Fetch Traffic
    const trafficRows = db.prepare("SELECT * FROM traffic").all() as any[];
    const traffic = trafficRows.map(t => ({
      date: t.date,
      visits: t.visits,
      activeUsers: t.activeUsers ? JSON.parse(t.activeUsers) : [],
      chatsCount: t.chatsCount
    }));

    // 3. Fetch Errors
    const errorsRows = db.prepare("SELECT * FROM errors").all() as any[];
    const errors = errorsRows.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      type: e.type,
      message: e.message
    }));

    // 4. Fetch Feedback
    const feedbackRows = db.prepare("SELECT * FROM feedback").all() as any[];
    const feedback = feedbackRows.map(f => ({
      id: f.id,
      email: f.email,
      rating: f.rating,
      text: f.text,
      createdAt: f.createdAt
    }));

    // 5. Fetch Knowledge
    const knowledgeRows = db.prepare("SELECT * FROM knowledge").all() as any[];
    const knowledge = knowledgeRows.map(k => ({
      id: k.id,
      title: k.title,
      content: k.content,
      createdAt: k.createdAt
    }));

    // 6. Fetch Settings
    const settingsRow = db.prepare("SELECT * FROM settings WHERE id = 1").get() as any;
    const settings = settingsRow ? {
      aiPersonality: settingsRow.aiPersonality,
      modelName: settingsRow.modelName,
      maxDailyImages: settingsRow.maxDailyImages
    } : {
      aiPersonality: "Charming & Flirty Girlfriend",
      modelName: "gemini-3.5-flash",
      maxDailyImages: 5
    };

    // 7. Fetch Feature Usage
    const fuRow = db.prepare("SELECT * FROM feature_usage WHERE id = 1").get() as any;
    const featureUsage = fuRow ? {
      textChat: fuRow.textChat,
      voiceChat: fuRow.voiceChat,
      imageGen: fuRow.imageGen,
      fileUpload: fuRow.fileUpload,
      knowledgeSearch: fuRow.knowledgeSearch
    } : {
      textChat: 0,
      voiceChat: 0,
      imageGen: 0,
      fileUpload: 0,
      knowledgeSearch: 0
    };

    // 8. Fetch Maintenance
    const maintRow = db.prepare("SELECT * FROM maintenance WHERE id = 1").get() as any;
    const maintenance = maintRow ? {
      lastMaintenance: maintRow.lastMaintenance,
      nextMaintenance: maintRow.nextMaintenance,
      duration: maintRow.duration,
      itemsCleaned: maintRow.itemsCleaned,
      performanceImprovement: maintRow.performanceImprovement,
      healthScore: maintRow.healthScore,
      history: maintRow.history ? JSON.parse(maintRow.history) : []
    } : {
      lastMaintenance: new Date().toISOString(),
      nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 0,
      itemsCleaned: 0,
      performanceImprovement: 0,
      healthScore: 100,
      history: []
    };

    // 9. Fetch Broadcast
    const broadcastRow = db.prepare("SELECT value FROM kv_store WHERE key = 'broadcast'").get() as any;
    const broadcast = broadcastRow ? broadcastRow.value : "";

    const data: DBData = {
      users,
      traffic,
      errors,
      feedback,
      knowledge,
      settings,
      featureUsage,
      maintenance,
      broadcast
    };

    dbCache = JSON.parse(JSON.stringify(data));
    return data;
  } catch (err) {
    console.error("Error reading SQLite database in readDB:", err);
    return getInitialDB();
  }
}

export function writeDB(data: DBData): void {
  dbCache = JSON.parse(JSON.stringify(data));

  const transaction = db.transaction((data: DBData) => {
    // 1. Save Users
    db.prepare("DELETE FROM users").run();
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, username, password, online, lastPing, createdAt, isBanned, activeDuration, memories, sessionToken, sessions, imageTodayCount, lastImageDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of data.users) {
      insertUser.run(
        u.id,
        u.email,
        u.username,
        u.password || "",
        u.online ? 1 : 0,
        u.lastPing || 0,
        u.createdAt || "",
        u.isBanned ? 1 : 0,
        u.activeDuration || 0,
        JSON.stringify(u.memories || []),
        u.sessionToken || null,
        JSON.stringify(u.sessions || []),
        u.imageTodayCount || 0,
        u.lastImageDate || ""
      );
    }

    // 2. Save Traffic
    db.prepare("DELETE FROM traffic").run();
    const insertTraffic = db.prepare(`
      INSERT INTO traffic (date, visits, activeUsers, chatsCount)
      VALUES (?, ?, ?, ?)
    `);
    for (const t of data.traffic) {
      insertTraffic.run(
        t.date,
        t.visits,
        JSON.stringify(t.activeUsers || []),
        t.chatsCount
      );
    }

    // 3. Save Errors
    db.prepare("DELETE FROM errors").run();
    if (data.errors && Array.isArray(data.errors)) {
      const insertError = db.prepare(`
        INSERT INTO errors (id, timestamp, type, message)
        VALUES (?, ?, ?, ?)
      `);
      for (const e of data.errors) {
        insertError.run(e.id, e.timestamp, e.type, e.message);
      }
    }

    // 4. Save Feedback
    db.prepare("DELETE FROM feedback").run();
    if (data.feedback && Array.isArray(data.feedback)) {
      const insertFeedback = db.prepare(`
        INSERT INTO feedback (id, email, rating, text, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const f of data.feedback) {
        insertFeedback.run(f.id, f.email, f.rating, f.text, f.createdAt);
      }
    }

    // 5. Save Knowledge
    db.prepare("DELETE FROM knowledge").run();
    if (data.knowledge && Array.isArray(data.knowledge)) {
      const insertKnowledge = db.prepare(`
        INSERT INTO knowledge (id, title, content, createdAt)
        VALUES (?, ?, ?, ?)
      `);
      for (const k of data.knowledge) {
        insertKnowledge.run(k.id, k.title, k.content, k.createdAt);
      }
    }

    // 6. Save Settings
    if (data.settings) {
      db.prepare(`
        INSERT OR REPLACE INTO settings (id, aiPersonality, modelName, maxDailyImages)
        VALUES (1, ?, ?, ?)
      `).run(
        data.settings.aiPersonality,
        data.settings.modelName,
        data.settings.maxDailyImages
      );
    }

    // 7. Save Feature Usage
    if (data.featureUsage) {
      db.prepare(`
        INSERT OR REPLACE INTO feature_usage (id, textChat, voiceChat, imageGen, fileUpload, knowledgeSearch)
        VALUES (1, ?, ?, ?, ?, ?)
      `).run(
        data.featureUsage.textChat,
        data.featureUsage.voiceChat,
        data.featureUsage.imageGen,
        data.featureUsage.fileUpload,
        data.featureUsage.knowledgeSearch
      );
    }

    // 8. Save Maintenance
    if (data.maintenance) {
      db.prepare(`
        INSERT OR REPLACE INTO maintenance (id, lastMaintenance, nextMaintenance, duration, itemsCleaned, performanceImprovement, healthScore, history)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.maintenance.lastMaintenance,
        data.maintenance.nextMaintenance,
        data.maintenance.duration,
        data.maintenance.itemsCleaned,
        data.maintenance.performanceImprovement,
        data.maintenance.healthScore,
        JSON.stringify(data.maintenance.history || [])
      );
    }

    // 9. Save Broadcast
    if (data.broadcast !== undefined) {
      db.prepare(`
        INSERT OR REPLACE INTO kv_store (key, value)
        VALUES ('broadcast', ?)
      `).run(data.broadcast);
    }
  });

  try {
    transaction(data);
  } catch (err) {
    console.error("Error writing SQLite database in writeDB transaction:", err);
  }
}

// Automatic database migration from db.json to SQLite
function migrateFromJson() {
  const JSON_DB_PATH = path.join(process.cwd(), "db.json");
  if (fs.existsSync(JSON_DB_PATH)) {
    try {
      console.log("Found existing db.json. Migrating data to SQLite database...");
      const jsonContent = fs.readFileSync(JSON_DB_PATH, "utf-8");
      if (jsonContent && jsonContent.trim().length > 0) {
        const data = JSON.parse(jsonContent) as DBData;
        writeDB(data);
        console.log("Migration from db.json to db.sqlite completed successfully!");
        try {
          fs.renameSync(JSON_DB_PATH, JSON_DB_PATH + ".migrated.bak");
          console.log("Renamed db.json to db.json.migrated.bak");
        } catch (renameErr) {
          console.warn("Could not rename db.json file:", renameErr);
        }
      }
    } catch (err) {
      console.error("Failed to migrate data from db.json:", err);
    }
  }
}

// Run auto-migration on start
migrateFromJson();

// Log traffic for the current day
export function logTraffic(email: string, isChat: boolean = false) {
  const db = readDB();
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  let entry = db.traffic.find(t => t.date === todayStr);
  if (!entry) {
    entry = {
      date: todayStr,
      visits: 0,
      activeUsers: [],
      chatsCount: 0
    };
    db.traffic.push(entry);
  }

  entry.visits += 1;
  if (!entry.activeUsers.includes(email)) {
    entry.activeUsers.push(email);
  }
  if (isChat) {
    entry.chatsCount += 1;
  }

  writeDB(db);
}

// Update users who have ceased pinging
export function updateOnlineStatuses() {
  const db = readDB();
  const threshold = 35000; // 35 seconds offline threshold
  const now = Date.now();
  let changed = false;

  db.users = db.users.map(u => {
    const isRecentlyActive = (now - u.lastPing) < threshold;
    if (u.online && !isRecentlyActive) {
      u.online = false;
      changed = true;
    }
    return u;
  });

  if (changed) {
    writeDB(db);
  }
}

export function getUserMemories(email: string): string[] {
  try {
    const db = readDB();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);
    return user?.memories || [];
  } catch (err) {
    console.error("getUserMemories error:", err);
    return [];
  }
}

export function appendUserMemory(email: string, memory: string): void {
  try {
    const db = readDB();
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) return;
    const user = db.users.find(u => u.email === cleanEmail);
    if (user) {
      if (!user.memories) {
        user.memories = [];
      }
      const lowerMemory = memory.toLowerCase().trim();
      const exists = user.memories.some(m => m.toLowerCase().trim() === lowerMemory);
      if (!exists && memory.trim().length > 0) {
        user.memories.push(memory.trim());
        if (user.memories.length > 20) {
          user.memories.shift();
        }
        writeDB(db);
      }
    }
  } catch (err) {
    console.error("appendUserMemory error:", err);
  }
}

// Log a system/API error
export function logError(type: string, message: string): void {
  try {
    const db = readDB();
    if (!db.errors) db.errors = [];
    db.errors.push({
      id: "err-" + Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      type,
      message
    });
    if (db.errors.length > 50) {
      db.errors.shift(); // keep last 50 error logs
    }
    writeDB(db);
  } catch (err) {
    console.error("logError error:", err);
  }
}

// Log usage metrics for interactive features
export function updateFeatureUsage(feature: keyof FeatureUsage): void {
  try {
    const db = readDB();
    if (!db.featureUsage) {
      db.featureUsage = { textChat: 0, voiceChat: 0, imageGen: 0, fileUpload: 0, knowledgeSearch: 0 };
    }
    db.featureUsage[feature] = (db.featureUsage[feature] || 0) + 1;
    writeDB(db);
  } catch (err) {
    console.error("updateFeatureUsage error:", err);
  }
}

// Save user feedback
export function addFeedback(email: string, rating: 'positive' | 'neutral' | 'negative', text: string): void {
  try {
    const db = readDB();
    if (!db.feedback) db.feedback = [];
    db.feedback.push({
      id: "fb-" + Math.random().toString(36).substring(2) + Date.now().toString(36),
      email: email || "anonymous",
      rating,
      text: text || "",
      createdAt: new Date().toISOString()
    });
    writeDB(db);
  } catch (err) {
    console.error("addFeedback error:", err);
  }
}


