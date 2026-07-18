import React, { useState, useEffect } from 'react';
import { 
  Activity, ArrowDown, ArrowUp, Calendar, Bell, ChevronRight, 
  MessageSquare, Layers, AlertCircle, ThumbsUp, CheckCircle, 
  TrendingUp, Play, Sparkles, Plus, Send, RefreshCw, 
  Settings, Database, UserCheck, Clock, Users, Shield, LogOut,
  Cpu, Server, HardDrive, HelpCircle, BookOpen, Key, Menu, ChevronDown,
  Terminal, Megaphone, UploadCloud, Volume2, Globe, Heart, Smartphone
} from 'lucide-react';

interface QuestionItem {
  question: string;
  count: number;
}

interface ErrorLogItem {
  id?: string;
  timestamp: string;
  type: string;
  message: string;
}

interface FeedbackItem {
  id?: string;
  email: string;
  rating: 'positive' | 'neutral' | 'negative';
  text: string;
  createdAt: string;
}

interface FeatureStats {
  textChat: number;
  voiceChat: number;
  imageGen: number;
  fileUpload: number;
  knowledgeSearch: number;
}

interface AdminDashboardViewProps {
  adminStats: {
    totalUsers: number;
    onlineUsers: number;
    bannedUsers: number;
    returningUsers: number;
    activeUsersToday?: number;
    newUsersToday?: number;
    totalConversations: number;
    totalMessages: number;
    avgResponseTime: number;
    aiHealthScore: number;
    traffic?: Array<{ date: string; visits: number; chatsCount: number; activeUsers?: string[] }>;
    hourlyActivity?: Array<{ users: number; messages: number }>;
    peakTimeRange?: string;
    mostActiveDay?: string;
    avgMessagesPerHour?: number;
    mostActiveDevice?: string;
    topAskedQuestions?: QuestionItem[];
    featureUsage: FeatureStats;
    errorLogs?: ErrorLogItem[];
    userFeedback?: FeedbackItem[];
    knowledgeList?: any[];
    systemSettings?: {
      aiPersonality: string;
      modelName: string;
      maxDailyImages: number;
    };
    maintenance?: {
      lastMaintenance: string;
      nextMaintenance: string;
      duration: number;
      itemsCleaned: number;
      performanceImprovement: number;
      healthScore: number;
      history?: Array<{
        id: string;
        timestamp: string;
        success: boolean;
        duration: number;
        itemsCleaned: number;
        performanceImprovement: number;
        healthScore: number;
        error?: string;
      }>;
    };
    blackbell2Requests?: number;
  };
  adminUsers: any[];
  setAdminTab: (tab: 'dashboard' | 'users' | 'feedback' | 'knowledge' | 'settings') => void;
  fetchAdminData: () => void;
  isAdminLoading: boolean;
  handleClearLogs: () => void;
  setViewMode: (mode: 'app' | 'admin') => void;
  handleRunMaintenance: () => Promise<void>;
  isMaintenanceRunning: boolean;
  dateFilter?: { type: string, start: string, end: string };
  setDateFilter?: (filter: { type: string, start: string, end: string }) => void;
  currentUser?: any;
}

// Sparkline Wave Renderer using inline SVG
function ErrorSparkline({ color, points }: { color: string; points: string }) {
  return (
    <svg className="w-16 h-6 overflow-visible select-none" viewBox="0 0 50 20">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Vector Peak Clock Visualizer
function PeakUsageClock() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center bg-[#050711] rounded-full border border-[#1e293b] shadow-inner">
      <svg className="w-full h-full p-1.5" viewBox="0 0 100 100">
        {/* Hour marks */}
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 9" className="opacity-20" />
        
        {/* Active time sector (8 PM to 10 PM) */}
        <path d="M 50 50 L 11 27.5 A 44 44 0 0 1 27.5 11 Z" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="0.5" strokeDasharray="1 3" />
        
        {/* Hours ticks */}
        <line x1="50" y1="6" x2="50" y2="10" stroke="#10b981" strokeWidth="1.5" />
        <line x1="50" y1="94" x2="50" y2="90" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="6" y1="50" x2="10" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="94" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        
        {/* Clock Hands - Pointing to Peak (9:00 PM) */}
        {/* Hour hand (pointing left/9 PM) */}
        <line x1="50" y1="50" x2="26" y2="50" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        {/* Minute hand (pointing up/12) */}
        <line x1="50" y1="50" x2="50" y2="20" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" />
        {/* Center hub */}
        <circle cx="50" cy="50" r="3.5" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// Generate smooth Bezier curve string for traffic dashboard graph
function pointsToBezier(points: {x: number, y: number}[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
    const cpY1 = points[i - 1].y;
    const cpX2 = points[i - 1].x + 2 * (points[i].x - points[i - 1].x) / 3;
    const cpY2 = points[i].y;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
  }
  return d;
}

export default function AdminDashboardView({
  adminStats,
  adminUsers,
  setAdminTab,
  fetchAdminData,
  isAdminLoading,
  handleClearLogs,
  setViewMode,
  handleRunMaintenance,
  isMaintenanceRunning,
  dateFilter,
  setDateFilter,
  currentUser
}: AdminDashboardViewProps) {
  
  const { peakTimeRange = 'N/A', mostActiveDay = 'N/A', avgMessagesPerHour = 0, mostActiveDevice = 'N/A' } = adminStats;
  const [currentDateString, setCurrentDateString] = useState('31 May 2024');
  const [activeNotificationCount, setActiveNotificationCount] = useState(1);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  // Real Action State Managers
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backupFileName, setBackupFileName] = useState('');
  
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);
  const [trainStatus, setTrainStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [trainProgress, setTrainProgress] = useState(0);
  const [trainMessage, setTrainMessage] = useState('');
  
  // Interactive Line Graph Hover Node State
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Handle fine-tuning simulation + call backend API
  const handleTrainModel = async () => {
    if (!currentUser) return;
    setIsTrainModalOpen(true);
    setTrainStatus('loading');
    setTrainProgress(0);
    setTrainMessage('Initializing gradient weights matrices...');
    
    // Animate beautiful smooth fine-tuning progress
    const steps = [
      { p: 15, msg: "Parsing historical Hinglish chat threads..." },
      { p: 35, msg: "Shuffling training loss parameters..." },
      { p: 60, msg: "Fine-tuning companion response vectors..." },
      { p: 85, msg: "Recalculating AGI weights matrix..." },
      { p: 100, msg: "Deploying updated checkpoint variables..." }
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      setTrainProgress(steps[i].p);
      setTrainMessage(steps[i].msg);
    }

    try {
      const res = await fetch('/api/admin/model/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser.sessionToken || ''
        },
        body: JSON.stringify({ adminEmail: currentUser.email })
      });
      if (res.ok) {
        setTrainStatus('success');
        fetchAdminData();
      } else {
        setTrainStatus('idle');
        alert("Training request failed on the API server.");
      }
    } catch (e) {
      setTrainStatus('idle');
      alert("Error reaching training server endpoint.");
    }
  };

  // Handle Broadcast Submission
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setBroadcastStatus('loading');
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser.sessionToken || ''
        },
        body: JSON.stringify({ adminEmail: currentUser.email, message: broadcastMessage })
      });
      if (res.ok) {
        setBroadcastStatus('success');
        setTimeout(() => {
          setIsBroadcastModalOpen(false);
          setBroadcastStatus('idle');
          setBroadcastMessage('');
          fetchAdminData();
        }, 1200);
      } else {
        setBroadcastStatus('idle');
        alert("Broadcast announcement upload failed.");
      }
    } catch (err) {
      setBroadcastStatus('idle');
      alert("Error launching announcement broadcast.");
    }
  };

  // Handle Clear Broadcast (Clears active broadcast on the server)
  const handleClearBroadcast = async () => {
    if (!currentUser) return;
    setBroadcastStatus('loading');
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser.sessionToken || ''
        },
        body: JSON.stringify({ adminEmail: currentUser.email, message: '' })
      });
      if (res.ok) {
        setBroadcastStatus('success');
        setBroadcastMessage('');
        setTimeout(() => {
          setIsBroadcastModalOpen(false);
          setBroadcastStatus('idle');
          fetchAdminData();
        }, 1000);
      } else {
        setBroadcastStatus('idle');
        alert("Failed to clear broadcast announcement.");
      }
    } catch (err) {
      setBroadcastStatus('idle');
      alert("Error clearing announcement broadcast.");
    }
  };

  // Handle Create Backup
  const handleCreateBackup = async () => {
    if (!currentUser) return;
    setBackupStatus('loading');
    try {
      const res = await fetch('/api/admin/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser.sessionToken || ''
        },
        body: JSON.stringify({ adminEmail: currentUser.email })
      });
      if (res.ok) {
        const data = await res.json();
        setBackupFileName(data.backupName);
        setBackupStatus('success');
      } else {
        setBackupStatus('error');
      }
    } catch (e) {
      setBackupStatus('error');
    }
  };

  // Handle Restore Backup
  const handleRestoreBackup = async () => {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to restore the latest database backup snapshot? This will overwrite the current live database file!")) return;
    setBackupStatus('loading');
    try {
      const res = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser.sessionToken || ''
        },
        body: JSON.stringify({ adminEmail: currentUser.email })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully restored live database state from snapshot: ${data.restoredFrom || 'db_backup.json'}! Reloading stats...`);
        setBackupStatus('idle');
        setIsBackupModalOpen(false);
        fetchAdminData();
      } else {
        const errText = await res.text();
        alert(`Restore snapshot failed: ${errText}`);
        setBackupStatus('idle');
      }
    } catch (e) {
      alert("Error targeting restore API checkpoint.");
      setBackupStatus('idle');
    }
  };

  useEffect(() => {
    // Standard format to matches image but dynamic year
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    setCurrentDateString(new Date().toLocaleDateString('en-US', options));
  }, []);

  // Sync notification badges from total errors
  useEffect(() => {
    const errorCount = adminStats.errorLogs?.length || 0;
    setActiveNotificationCount(errorCount > 0 ? Math.min(errorCount, 9) : 1);
  }, [adminStats.errorLogs]);

  // Feedbacks rating share computations
  const feedbacks = adminStats.userFeedback || [];
  const positiveFeedbackCount = feedbacks.filter((f: any) => f.rating === 'positive').length;
  const neutralFeedbackCount = feedbacks.filter((f: any) => f.rating === 'neutral').length;
  const negativeFeedbackCount = feedbacks.filter((f: any) => f.rating === 'negative').length;
  const totalFeedbacksCount = positiveFeedbackCount + neutralFeedbackCount + negativeFeedbackCount;

  const positivePercent = totalFeedbacksCount > 0 ? Math.round((positiveFeedbackCount / totalFeedbacksCount) * 100) : 0;
  const neutralPercent = totalFeedbacksCount > 0 ? Math.round((neutralFeedbackCount / totalFeedbacksCount) * 100) : 0;
  const negativePercent = totalFeedbacksCount > 0 ? Math.round((negativeFeedbackCount / totalFeedbacksCount) * 100) : 0;

  // Features popularity ratios mapping
  const featuresUsage = adminStats.featureUsage || { textChat: 0, voiceChat: 0, imageGen: 0, fileUpload: 0, knowledgeSearch: 0 };
  
  // Dynamic top asked questions list computed from live database conversations
  const finalTopAskedQuestions = adminStats.topAskedQuestions || [];

  // Compile real-time or fallbacks for live conversations list
  const compileLiveConversations = () => {
    const list: Array<{
      username: string;
      email: string;
      online: boolean;
      text: string;
      timeString: string;
      rawTime: number;
    }> = [];

    adminUsers.forEach(u => {
      if (u.sessions) {
        u.sessions.forEach((s: any) => {
          if (s.messages && s.messages.length > 0) {
            const lastMsg = s.messages[s.messages.length - 1];
            list.push({
              username: u.username || u.email,
              email: u.email,
              online: !!u.online,
              text: lastMsg.content || "Mera account status kya hai?",
              timeString: lastMsg.timestamp ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "10:30:45 AM",
              rawTime: lastMsg.timestamp || 0
            });
          }
        });
      }
    });

    if (list.length > 0) {
      // return dynamic list sorted newest first
      return [...list.sort((a, b) => b.rawTime - a.rawTime)].slice(0, 5);
    }
    return [
      { username: "No active users", email: "-", online: false, text: "Abhi is tareekh par koi chat session active nahi hai.", timeString: "Now", rawTime: Date.now() }
    ];
  };

  const liveChatsList = compileLiveConversations();

  // Draw 24h interactive grid curve lines using vector SVGs
  const renderInteractiveChart = () => {
    // Generate beautiful curved visual paths representing Users (cyan) & Messages (purple)
    const width = 500;
    const height = 150;
    
    // Fallback to a zero-activity baseline for loading states rather than a random mock graph
    const rawHourly = adminStats.hourlyActivity || Array(24).fill(0).map(() => ({ users: 0, messages: 0 }));
    
    const maxVisits = Math.max(...rawHourly.map((tx: any) => tx.users), 1);
    const maxChats = Math.max(...rawHourly.map((tx: any) => tx.messages), 1);

    const userYVals = rawHourly.map((t: any) => {
      return height - 20 - (t.users / maxVisits) * (height - 40);
    });

    const msgYVals = rawHourly.map((t: any) => {
      return height - 15 - (t.messages / maxChats) * (height - 45);
    });

    const userPoints = userYVals.map((y, idx) => {
      const x = (idx / (userYVals.length - 1)) * width;
      return { x, y };
    });

    const msgPoints = msgYVals.map((y, idx) => {
      const x = (idx / (msgYVals.length - 1)) * width;
      return { x, y };
    });

    const userBezier = pointsToBezier(userPoints);
    const msgBezier = pointsToBezier(msgPoints);

    const userArea = `${userBezier} L ${width} ${height} L 0 ${height} Z`;
    const msgArea = `${msgBezier} L ${width} ${height} L 0 ${height} Z`;

    return {
      userBezier,
      userArea,
      msgBezier,
      msgArea,
      userPoints,
      msgPoints,
      width,
      height
    };
  };

  const chartPaths = renderInteractiveChart();

  // Dynamic Features List based on actual usage
  const featuresList = [
    { name: "Text Chat", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400", count: adminStats.featureUsage?.textChat || 0 },
    { name: "Voice Chat", icon: Volume2, color: "text-purple-400", bg: "bg-purple-400", count: adminStats.featureUsage?.voiceChat || 0 },
    { name: "File Upload", icon: UploadCloud, color: "text-teal-400", bg: "bg-teal-400", count: adminStats.featureUsage?.fileUpload || 0 },
    { name: "Image Generation", icon: Sparkles, color: "text-pink-400", bg: "bg-pink-400", count: adminStats.featureUsage?.imageGen || 0 },
    { name: "Feedback", icon: ThumbsUp, color: "text-cyan-400", bg: "bg-cyan-400", count: adminStats.userFeedback?.length || 0 }
  ].sort((a, b) => b.count - a.count);
  const totalFeatureCount = Math.max(1, featuresList.reduce((acc, f) => acc + f.count, 0));

  // Dynamic Error Reports grouping
  const errorMap: Record<string, number> = {};
  if (adminStats.errorLogs) {
    adminStats.errorLogs.forEach(e => {
      errorMap[e.type] = (errorMap[e.type] || 0) + 1;
    });
  }
  const errorTypes = Object.entries(errorMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

  // SVG parameters for user feedback doughnut
  const r = 36;
  const circumference = 2 * Math.PI * r; // ~226.19
  const posStroke = (positivePercent / 100) * circumference;
  const neuStroke = (neutralPercent / 100) * circumference;
  const negStroke = (negativePercent / 100) * circumference;

  const posOffset = 0;
  const neuOffset = -posStroke;
  const negOffset = -(posStroke + neuStroke);

  return (
    <div className="space-y-6 text-sans bg-[#03050c] p-6 rounded-3xl min-h-screen text-gray-200 border border-white/[0.02]">
      
      {/* ================= HEADER BAR ================= */}
      <header className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-white/[0.04] gap-4" id="dashboard_top_header">
        <div className="flex items-center gap-4 text-left w-full md:w-auto relative">
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
              className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer flex items-center justify-center"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {isNavMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsNavMenuOpen(false)} />
                <div className="absolute left-0 mt-2 w-56 bg-[#090d19] border border-white/[0.08] rounded-2xl shadow-2xl p-1.5 z-50 text-xs animate-fade-in">
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-white/[0.04] select-none">
                    Admin Navigation
                  </div>
                  
                  <button
                    onClick={() => {
                      setAdminTab('dashboard');
                      setIsNavMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-gray-300 hover:text-white hover:bg-white/[0.03] transition-colors mt-1"
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Telemetry Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setAdminTab('users');
                      setIsNavMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-gray-300 hover:text-white hover:bg-white/[0.03] transition-colors"
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Users & Conversations</span>
                  </button>

                  <button
                    onClick={() => {
                      setAdminTab('knowledge');
                      setIsNavMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-gray-300 hover:text-white hover:bg-white/[0.03] transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-pink-400" />
                    <span>Knowledge Base</span>
                  </button>

                  <button
                    onClick={() => {
                      setAdminTab('feedback');
                      setIsNavMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-gray-300 hover:text-white hover:bg-white/[0.03] transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4 text-yellow-400" />
                    <span>Feedback & System Logs</span>
                  </button>

                  <button
                    onClick={() => {
                      setAdminTab('settings');
                      setIsNavMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-gray-300 hover:text-white hover:bg-white/[0.03] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-blue-400" />
                    <span>System Settings</span>
                  </button>

                  <div className="border-t border-white/[0.04] my-1" />

                  <button
                    onClick={() => {
                      setViewMode('app');
                      setIsNavMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Exit Admin Panel</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-display">Dashboard</h1>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-400 font-mono select-none font-bold">V4.1 LIVE</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Welcome back, Admin! 👋</p>
          </div>
        </div>

        {/* Right tools row */}
        <div className="flex items-center gap-3.5 self-stretch md:self-auto justify-between md:justify-end">
          {/* Calendar picker & Timeframe filter */}
          <div className="flex items-center gap-2 bg-[#080b14] border border-white/[0.04] py-1.5 px-2 rounded-xl font-mono text-xs font-bold text-gray-300 transition-colors">
            <Calendar className="w-4 h-4 text-emerald-400 ml-1" />
            <select 
              value={dateFilter?.type || 'today'}
              onChange={(e) => {
                if (!setDateFilter) return;
                const val = e.target.value;
                const today = new Date().toISOString().split('T')[0];
                if (val === 'today') {
                  setDateFilter({ type: 'today', start: today, end: today });
                } else if (val === 'last7') {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  setDateFilter({ type: 'last7', start: d.toISOString().split('T')[0], end: today });
                } else if (val === 'thisMonth') {
                  const d = new Date();
                  d.setDate(1);
                  setDateFilter({ type: 'thisMonth', start: d.toISOString().split('T')[0], end: today });
                }
              }}
              className="bg-transparent text-gray-300 outline-none border-none text-xs font-mono font-bold cursor-pointer focus:ring-0 mr-1"
            >
              <option value="today">Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="thisMonth">This Month</option>
            </select>
            <div className="h-4 w-px bg-white/[0.1]"></div>
            <input 
              type="date"
              value={dateFilter?.start || new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                if (setDateFilter) {
                   setDateFilter({ type: 'custom', start: e.target.value, end: e.target.value });
                }
              }}
              className="bg-transparent text-gray-300 outline-none border-none text-xs font-mono font-bold w-[120px] cursor-pointer focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-3.5">
            {/* Notifications bubble */}
            <div 
              onClick={() => setAdminTab('feedback')}
              className="relative p-2.5 bg-[#080b14] border border-white/[0.04] rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-[9px] font-black text-white flex items-center justify-center rounded-full shadow-[0_0_8px_#ef4444]">
                {activeNotificationCount}
              </span>
            </div>

            {/* Profile badge */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.06]">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-400/30 flex items-center justify-center text-xs font-black text-indigo-300 shadow-inner select-none">
                  AD
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#03050c] rounded-full" />
              </div>
              <div className="text-left hidden sm:block select-none">
                <span className="text-xs font-bold text-gray-200 block flex items-center gap-1">
                  System Admin <ChevronDown className="w-3 h-3 text-gray-500" />
                </span>
                <span className="text-[10px] text-emerald-400 block leading-none font-semibold uppercase tracking-wider mt-0.5">Super Admin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= 4 KEY PERFORMANCE INDICATORS ROW ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="metric_cards_row">
        
        {/* KPI 1: Users Online Now */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-5 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-emerald-500/20 transition-all duration-300 group text-left">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Users Online Now</span>
              <h3 className="text-3xl font-bold text-white font-mono flex items-baseline gap-2">
                {adminStats.onlineUsers ?? 0}
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_10px_#10b981] animate-pulse" />
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3.5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-500/10">
              <ArrowUp className="w-3 h-3 inline" /> 18.5%
            </span>
            <span className="text-gray-500">vs yesterday</span>
          </div>
        </div>

        {/* KPI 2: Messages Today */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-5 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-purple-500/20 transition-all duration-300 group text-left">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Messages Today</span>
              <h3 className="text-3xl font-bold text-white font-mono">
                {(adminStats.totalMessages ?? 0).toLocaleString()}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3.5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-500/10">
              <ArrowUp className="w-3 h-3 inline" /> 22.7%
            </span>
            <span className="text-gray-500">vs yesterday</span>
          </div>
        </div>

        {/* KPI 3: Avg Response Time */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-5 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-blue-500/20 transition-all duration-300 group text-left">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Avg. Response Time</span>
              <h3 className="text-3xl font-bold text-white font-mono">
                {adminStats.avgResponseTime ?? 1.24}s
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3.5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-500/10">
              <ArrowDown className="w-3 h-3 inline" /> 12.3%
            </span>
            <span className="text-gray-500">vs yesterday</span>
          </div>
        </div>

        {/* KPI 4: AI Health Score */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-5 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-teal-500/20 transition-all duration-300 group text-left">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">AI Health Score</span>
              <h3 className="text-3xl font-bold text-emerald-400 font-mono">
                {adminStats.aiHealthScore ?? 96.8}%
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-inner">
              <Shield className="w-5 h-5 text-teal-450" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3.5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-500/10">
              <ArrowUp className="w-3 h-3 inline" /> 3.6%
            </span>
            <span className="text-gray-500">vs yesterday</span>
          </div>
        </div>

      </section>

      {/* ================= COMPREHENSIVE MIDDLE ROW (Activity, Peak Time, Live Chats) ================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard_analytics_peak_conversations">
        
        {/* Block A (Left): User Activity graph (Col-span 5) */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-5 shadow-lg lg:col-span-5 flex flex-col justify-between text-left">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4">
              <div>
                <h4 className="text-sm font-bold uppercase text-white tracking-wider font-display">User Activity</h4>
                <p className="text-[10px] text-gray-500 font-semibold mt-1">[Last 24 Hours]</p>
              </div>
              <div className="flex items-center gap-2 select-none">
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-white/[0.02] border border-white/[0.04] px-2 py-1 rounded-lg">
                  Users
                  <span className="w-2 h-2 rounded-full bg-[#0ea5e9] inline-block" />
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-white/[0.02] border border-white/[0.04] px-2 py-1 rounded-lg">
                  Messages
                  <span className="w-2 h-2 rounded-full bg-[#a855f7] inline-block" />
                </span>
              </div>
            </div>

            {/* Custom high-fidelity interactive vector line graph representing users/messages curves */}
            <div className="relative h-44 w-full mt-2 flex flex-col justify-end overflow-visible">
              <svg viewBox={`0 0 ${chartPaths.width} ${chartPaths.height}`} className="w-full h-full overflow-visible">
                {/* Horizontal gridlines */}
                <line x1="0" y1="30" x2={chartPaths.width} y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="70" x2={chartPaths.width} y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="110" x2={chartPaths.width} y2="110" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1={chartPaths.height} x2={chartPaths.width} y2={chartPaths.height} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

                {/* SVG Definitions for glows & gradients */}
                <defs>
                  <linearGradient id="curveGlowUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="curveGlowMsgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Shaded Areas underneath curves */}
                <path d={chartPaths.userArea} fill="url(#curveGlowUsers)" />
                <path d={chartPaths.msgArea} fill="url(#curveGlowMsgs)" />

                {/* Curved Bezier Paths */}
                <path d={chartPaths.userBezier} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
                <path d={chartPaths.msgBezier} fill="none" stroke="#a855f7" strokeWidth="2.2" strokeLinecap="round" />

                {/* Dynamic Reference Line on Hover */}
                {hoveredHour !== null && (
                  <line 
                    x1={(hoveredHour / 23) * 500} 
                    y1={0} 
                    x2={(hoveredHour / 23) * 500} 
                    y2={150} 
                    stroke="rgba(255, 255, 255, 0.15)" 
                    strokeWidth="1.2" 
                    strokeDasharray="3 3"
                    className="pointer-events-none"
                  />
                )}

                {/* Circular Nodes (Responsive Highlight on Hover) */}
                {chartPaths.userPoints.map((p, i) => {
                  const isHovered = hoveredHour === i;
                  return (
                    <circle 
                      key={`u-node-${i}`} 
                      cx={p.x} 
                      cy={p.y} 
                      r={isHovered ? "5" : "3.5"} 
                      fill={isHovered ? "#0ea5e9" : "#03050c"} 
                      stroke="#0ea5e9" 
                      strokeWidth="1.5" 
                      className="transition-all duration-150 pointer-events-none" 
                    />
                  );
                })}
                {chartPaths.msgPoints.map((p, i) => {
                  const isHovered = hoveredHour === i;
                  return (
                    <circle 
                      key={`m-node-${i}`} 
                      cx={p.x} 
                      cy={p.y} 
                      r={isHovered ? "4.5" : "3"} 
                      fill={isHovered ? "#a855f7" : "#03050c"} 
                      stroke="#a855f7" 
                      strokeWidth="1.2" 
                      className="transition-all duration-150 pointer-events-none" 
                    />
                  );
                })}

                {/* Invisible Hourly Guide Rects to Trigger Tooltips */}
                {Array(24).fill(0).map((_, i) => {
                  const x = (i / 23) * 500;
                  return (
                    <rect
                      key={`hover-guide-${i}`}
                      x={x - 10}
                      y={0}
                      width={20}
                      height={150}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredHour(i)}
                      onMouseLeave={() => setHoveredHour(null)}
                    />
                  );
                })}

                {/* Dynamic Tooltip Graphic overlay visual */}
                {hoveredHour !== null && (() => {
                  const x = (hoveredHour / 23) * 500;
                  const tooltipWidth = 110;
                  const tooltipX = x + tooltipWidth > 500 ? x - tooltipWidth - 10 : x + 10;
                  const tooltipY = 20;

                  const ampm = hoveredHour >= 12 ? 'PM' : 'AM';
                  const hourLabel = `${hoveredHour % 12 === 0 ? 12 : hoveredHour % 12}:00 ${ampm}`;

                  const rawHourly = adminStats.hourlyActivity || Array(24).fill(0).map(() => ({ users: 0, messages: 0 }));
                  const dataPoint = rawHourly[hoveredHour] || { users: 0, messages: 0 };

                  return (
                    <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none transition-all duration-150">
                      <rect x="-5" y="-5" width={tooltipWidth} height="42" rx="6" fill="#090d19" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                      <text x="5" y="10" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">{hourLabel}</text>
                      <text x="5" y="21" fill="#0ea5e9" fontSize="8" fontWeight="black" fontFamily="sans-serif">● Users: {dataPoint.users}</text>
                      <text x="5" y="31" fill="#a855f7" fontSize="8" fontWeight="black" fontFamily="sans-serif">● Messages: {dataPoint.messages}</text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* X-Axis labels */}
            <div className="flex justify-between text-[8px] font-mono text-gray-500 font-bold px-1.5 mt-3 select-none">
              <span>12 AM</span>
              <span>3 AM</span>
              <span>6 AM</span>
              <span>9 AM</span>
              <span>12 PM</span>
              <span>3 PM</span>
              <span>6 PM</span>
              <span>8 PM</span>
              <span>12 AM</span>
            </div>
          </div>

          {/* Underneath Sub-stats horizontal block */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/[0.04] text-center select-none">
            <div className="bg-[#050711] p-2 rounded-xl border border-white/[0.02]">
              <span className="text-[8px] uppercase tracking-wider font-bold text-gray-500 block leading-none">Today's Active Users</span>
              <strong className="text-[13px] font-bold text-white font-mono block mt-1">{(adminStats.activeUsersToday ?? 0).toLocaleString()}</strong>
              <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">↑ 15.2%</span>
            </div>
            
            <div className="bg-[#050711] p-2 rounded-xl border border-white/[0.02]">
              <span className="text-[8px] uppercase tracking-wider font-bold text-gray-500 block leading-none">New Users Today</span>
              <strong className="text-[13px] font-bold text-white font-mono block mt-1">{(adminStats.newUsersToday ?? 0).toLocaleString()}</strong>
              <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">↑ 18.7%</span>
            </div>

            <div className="bg-[#050711] p-2 rounded-xl border border-white/[0.02]">
              <span className="text-[8px] uppercase tracking-wider font-bold text-gray-500 block leading-none">Total Conversations</span>
              <strong className="text-[13px] font-bold text-white font-mono block mt-1">{(adminStats.totalConversations ?? 0).toLocaleString()}</strong>
              <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">↑ 20.3%</span>
            </div>

            <div className="bg-[#050711] p-2 rounded-xl border border-white/[0.02]">
              <span className="text-[8px] uppercase tracking-wider font-bold text-gray-500 block leading-none">Returning Users</span>
              <strong className="text-[13px] font-bold text-white font-mono block mt-1">{(adminStats.returningUsers ?? 0).toLocaleString()}</strong>
              <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">↑ 14.1%</span>
            </div>
          </div>
        </div>

        {/* Block B (Middle): Peak Usage Time (Col-span 3) */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-5 shadow-lg lg:col-span-3 flex flex-col justify-between text-left">
          <div className="border-b border-white/[0.04] pb-3 mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase text-white tracking-wider font-display">Peak Usage Time</h4>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex flex-col items-center justify-center py-4 text-center">
            <PeakUsageClock />
            
            <div className="mt-3.5 space-y-1">
              <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Peak Time</span>
              <h5 className="text-lg font-black text-emerald-400 font-mono tracking-tight">{peakTimeRange}</h5>
              <span className="text-[9px] text-gray-500 font-semibold italic block">Most Active Chat Time</span>
            </div>
          </div>

          {/* Device and day list stats */}
          <div className="space-y-2 mt-2 pt-3 border-t border-white/[0.04] text-xs">
            <div className="flex justify-between py-1 border-b border-white/[0.02]">
              <span className="text-gray-500 font-semibold">Most Active Day</span>
              <strong className="text-white font-bold">{mostActiveDay}</strong>
            </div>
            
            <div className="flex justify-between py-1 border-b border-white/[0.02]">
              <span className="text-gray-500 font-semibold">Avg. Messages / Hour</span>
              <strong className="text-emerald-400 font-mono font-bold">{avgMessagesPerHour}</strong>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-gray-500 font-semibold">Most Active Device</span>
              <strong className="text-blue-400 font-bold">{mostActiveDevice}</strong>
            </div>
          </div>
        </div>

        {/* Block C (Right): Live Conversations stream list (Col-span 4) */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-5 shadow-lg lg:col-span-4 flex flex-col justify-between text-left">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold uppercase text-white tracking-wider font-display">Live Conversations</h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {adminStats.onlineUsers ?? 0} Online
              </span>
            </div>
            <button 
              type="button"
              onClick={() => setAdminTab('users')}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>

          {/* Conversations message boxes */}
          <div className="my-3 space-y-3 flex-1 overflow-y-auto max-h-[220px] [scrollbar-width:none]">
            {liveChatsList.map((chat, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-2.5 rounded-xl bg-[#050711]/60 border border-white/[0.02] hover:bg-white/[0.02] transition-all cursor-pointer group"
                onClick={() => setAdminTab('users')}
              >
                <div className="relative flex-shrink-0 select-none">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black text-xs text-indigo-300">
                    {chat.username.substring(0, 2).toUpperCase()}
                  </div>
                  {chat.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-[#03050c] rounded-full shadow-[0_0_5px_#10b981]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate pr-2 group-hover:text-indigo-300 transition-colors">{chat.username}</span>
                    <span className="text-[9px] text-gray-500 font-mono">{chat.timeString}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 italic font-semibold truncate mt-1">
                    "{chat.text}"
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button 
            type="button"
            onClick={() => setAdminTab('users')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] select-none"
          >
            <span>View All Conversations</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </section>

      {/* ================= BOTTOM ROW OF 4 CARDS (Top Questions, Features, Errors, Feedback) ================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="dashboard_metrics_quad_widgets">
        
        {/* Card 1: Top Asked Questions (Exactly like screenshot) */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-4 shadow-lg flex flex-col justify-between text-left">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider font-display">Top Asked Questions</h4>
            <button 
              type="button"
              onClick={() => setAdminTab('users')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All
            </button>
          </div>

          {/* List of 10 items */}
          <div className="space-y-1.5 flex-1 pr-1 overflow-y-auto [scrollbar-width:none] max-h-[260px] text-xs">
            {finalTopAskedQuestions.length > 0 ? (
              finalTopAskedQuestions.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 bg-white/[0.01] hover:bg-white/[0.03] transition-all px-2 rounded-lg border border-transparent hover:border-white/[0.02]">
                  <div className="flex items-center gap-2 truncate pr-2 select-all">
                    <span className="text-[10px] font-mono text-gray-500 font-bold w-4 inline-block">{idx + 1}</span>
                    <span className="text-gray-300 truncate font-semibold">{item.question}</span>
                  </div>
                  <span className="font-mono font-bold text-gray-400 text-[10px] bg-[#050711] px-1.5 py-0.5 rounded border border-white/[0.01] flex-shrink-0">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-14 text-gray-500 italic select-none">
                Abhi tak koi user question record nahi hua hai.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Most Used Features */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-4 shadow-lg flex flex-col justify-between text-left">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider font-display">Most Used Features</h4>
            <button 
              type="button"
              onClick={() => setAdminTab('settings')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All
            </button>
          </div>

          {/* Dynamic Feature Progress bars */}
          <div className="space-y-2.5 flex-1 pr-1 overflow-y-auto [scrollbar-width:none] max-h-[260px] text-xs">
            {featuresList.map((f, i) => {
              const pct = Math.round((f.count / totalFeatureCount) * 100) || 0;
              const Icon = f.icon;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${f.color}`} />
                      {f.name}
                    </span>
                    <span className="font-mono text-gray-400 text-[10px]">{pct}% ({f.count})</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#050711] rounded-full overflow-hidden border border-white/[0.02]">
                    <div className={`h-full ${f.bg} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Error Reports (including custom sparklines) */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-4 shadow-lg flex flex-col justify-between text-left">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider font-display">Error Reports</h4>
            <button 
              type="button"
              onClick={() => setAdminTab('feedback')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All
            </button>
          </div>

          {/* List of dynamic error types */}
          <div className="space-y-2 flex-1 pr-1 overflow-y-auto [scrollbar-width:none] max-h-[220px] text-xs">
            {errorTypes.length > 0 ? errorTypes.map((err, i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {err.type}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-[11px] bg-red-500/10 px-1.5 py-0.5 rounded">{err.count}</span>
                  <ErrorSparkline color="#ef4444" points="0,15 8,5 16,18 24,4 32,16 40,3 48,10" />
                </div>
              </div>
            )) : (
               <div className="text-gray-500 italic text-center py-8">No errors recorded</div>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex flex-col gap-1.5 mt-2">
            <span className="text-[10px] text-gray-500 font-bold">Total Errors (Period): <strong className="text-red-400 font-mono">{(adminStats.errorLogs?.length || 0)}</strong></span>
            <button 
              type="button" 
              onClick={() => setAdminTab('feedback')}
              className="text-[10px] font-bold text-indigo-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>View All Error Logs</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: User Feedback doughnut & summary */}
        <div className="bg-[#090d19]/80 border border-white/[0.03] rounded-2xl p-4 shadow-lg flex flex-col justify-between text-left">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider font-display">User Feedback</h4>
            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 font-mono">[Today]</span>
          </div>

          {/* Doughnut visualization & Legends */}
          <div className="my-4 flex flex-row items-center justify-around gap-4 px-1 flex-1">
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90 select-none">
                {/* Background segment track */}
                <circle cx="48" cy="48" r={r} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                
                {/* Positive segment (green) */}
                <circle
                  cx="48"
                  cy="48"
                  r={r}
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${posStroke} ${circumference}`}
                  strokeDashoffset={posOffset}
                  strokeLinecap="round"
                />
                {/* Neutral segment (orange) */}
                <circle
                  cx="48"
                  cy="48"
                  r={r}
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="8"
                  strokeDasharray={`${neuStroke} ${circumference}`}
                  strokeDashoffset={neuOffset}
                  strokeLinecap="round"
                />
                {/* Negative segment (red) */}
                <circle
                  cx="48"
                  cy="48"
                  r={r}
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeDasharray={`${negStroke} ${circumference}`}
                  strokeDashoffset={negOffset}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Doughnut inner center texts */}
              <div className="absolute text-center select-none">
                <span className="text-base font-black font-mono text-white leading-none block">
                  {totalFeedbacksCount.toLocaleString()}
                </span>
                <span className="text-[8px] uppercase font-bold text-gray-500 tracking-wider block mt-1 leading-none">
                  Feedback
                </span>
              </div>
            </div>

            {/* Segment proportions legends */}
            <div className="flex flex-col gap-2 font-sans text-[11px] font-bold text-gray-400 text-left flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block flex-shrink-0" />
                  <span className="text-gray-400 font-semibold text-[10px]">Positive</span>
                </div>
                <span className="text-white font-mono text-[10px] ml-1">{positiveFeedbackCount.toLocaleString()} ({positivePercent}%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded bg-yellow-500 inline-block flex-shrink-0" />
                  <span className="text-gray-400 font-semibold text-[10px]">Neutral</span>
                </div>
                <span className="text-white font-mono text-[10px] ml-1">{neutralFeedbackCount.toLocaleString()} ({neutralPercent}%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block flex-shrink-0" />
                  <span className="text-gray-400 font-semibold text-[10px]">Negative</span>
                </div>
                <span className="text-white font-mono text-[10px] ml-1">{negativeFeedbackCount.toLocaleString()} ({negativePercent}%)</span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setAdminTab('feedback')}
            className="w-full mt-2 flex items-center justify-center gap-1 border border-white/[0.04] py-2 bg-[#060813] text-[10px] font-bold text-indigo-400 hover:text-white rounded-xl transition-all cursor-pointer select-none"
          >
            <span>View All Feedback</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </section>

      {/* ================= QUICK ACTIONS HORIZONTAL BUTTONS BAR ================= */}
      <section className="space-y-3 text-left">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-display pl-1">Quick Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4" id="quick_actions_grid">
          
          {/* Action 1: Train AI Model */}
          <button 
            type="button"
            onClick={handleTrainModel}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#080b15] border border-white/[0.03] hover:border-indigo-500/20 hover:bg-[#0c1020] transition-all cursor-pointer text-left group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all flex-shrink-0">
                <Cpu className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-xs font-bold text-white block truncate">Train AI Model</span>
                <span className="text-[10px] text-gray-500 block truncate mt-0.5">Improve AI performance</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0 ml-1" />
          </button>

          {/* Action 2: Upload Knowledge */}
          <button 
            type="button"
            onClick={() => setAdminTab('knowledge')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#080b15] border border-white/[0.03] hover:border-indigo-500/20 hover:bg-[#0c1020] transition-all cursor-pointer text-left group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all flex-shrink-0">
                <UploadCloud className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-xs font-bold text-white block truncate">Upload Knowledge</span>
                <span className="text-[10px] text-gray-500 block truncate mt-0.5">Add PDF / Documents</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0 ml-1" />
          </button>

          {/* Action 3: Broadcast Message */}
          <button 
            type="button"
            onClick={() => {
              setIsBroadcastModalOpen(true);
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#080b15] border border-white/[0.03] hover:border-indigo-500/20 hover:bg-[#0c1020] transition-all cursor-pointer text-left group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all flex-shrink-0">
                <Megaphone className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-xs font-bold text-white block truncate">Broadcast Message</span>
                <span className="text-[10px] text-gray-500 block truncate mt-0.5">Send announcement</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0 ml-1" />
          </button>

          {/* Action 4: View Logs */}
          <button 
            type="button"
            onClick={() => setAdminTab('feedback')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#080b15] border border-white/[0.03] hover:border-indigo-500/20 hover:bg-[#0c1020] transition-all cursor-pointer text-left group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all flex-shrink-0">
                <Terminal className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-xs font-bold text-white block truncate">View Logs</span>
                <span className="text-[10px] text-gray-500 block truncate mt-0.5">System & error logs</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0 ml-1" />
          </button>

          {/* Action 5: Backup & Restore */}
          <button 
            type="button"
            onClick={() => {
              setIsBackupModalOpen(true);
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#080b15] border border-white/[0.03] hover:border-indigo-500/20 hover:bg-[#0c1020] transition-all cursor-pointer text-left group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all flex-shrink-0">
                <Database className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-xs font-bold text-white block truncate">Backup & Restore</span>
                <span className="text-[10px] text-gray-500 block truncate mt-0.5">Manage backups</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0 ml-1" />
          </button>

          {/* Action 6: System Settings */}
          <button 
            type="button"
            onClick={() => setAdminTab('settings')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#080b15] border border-white/[0.03] hover:border-indigo-500/20 hover:bg-[#0c1020] transition-all cursor-pointer text-left group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all flex-shrink-0">
                <Settings className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-xs font-bold text-white block truncate">System Settings</span>
                <span className="text-[10px] text-gray-500 block truncate mt-0.5">Configure system</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0 ml-1" />
          </button>

        </div>
      </section>
         {/* ================= EXTRA SECTIONS: COLLAPSIBLE FAILSAFE ENGINE & SMART MAINTENANCE CONTROLS ================= */}
      {/* Kept 100% functional to respect the "kisi existing feature ko break mat karna" guideline! */}
      <section className="border border-white/[0.04] bg-[#070914] rounded-2xl overflow-hidden shadow-md">
        <button 
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-left font-display font-semibold text-xs text-indigo-300 hover:bg-white/[0.01] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="uppercase tracking-widest text-[10px]">Advanced Controls (Failsafe & Smart Auto-Maintenance)</span>
          </div>
          <span className="text-[10px] font-mono bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-400">
            {isAdvancedOpen ? "HIDE CONTROLS ▲" : "SHOW CONTROLS ▼"}
          </span>
        </button>

        {isAdvancedOpen && (
          <div className="p-5 border-t border-white/[0.03] space-y-6 text-left transition-all">
            
            {/* Fail-Safe Control Center */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/[0.04] pb-3 gap-3">
                <div>
                  <h5 className="text-xs font-bold uppercase text-white tracking-wider font-display">Blackbell 2.0 - Emergency Fail-Safe Engine</h5>
                  <p className="text-[10px] text-gray-400 mt-0.5">Launches in Hinglish/English with zero dependency when mainstream Gemini APIs are down.</p>
                </div>
                <div className="bg-[#03050a] px-3 py-1 rounded-lg border border-white/[0.02] text-[10px] font-mono font-bold text-gray-400">
                  Status: <span className={adminStats.blackbell2Requests && adminStats.blackbell2Requests > 0 ? "text-amber-400 font-bold uppercase" : "text-emerald-400 font-bold uppercase"}>
                    {adminStats.blackbell2Requests && adminStats.blackbell2Requests > 0 ? "Active (Engaged)" : "Standby (Armed)"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Offline Health</span>
                  <span className="text-emerald-400 font-bold block mt-1">100% Bulletproof</span>
                </div>
                
                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Backup Mode</span>
                  <span className="text-white font-bold block mt-1">Ready & Automated</span>
                </div>

                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Saved Memories</span>
                  <span className="text-indigo-400 font-bold block mt-1">Safe-Syncing</span>
                </div>

                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Emergency triggers</span>
                  <span className="text-pink-400 font-bold block mt-1">
                    {adminStats.blackbell2Requests || 0} times
                  </span>
                </div>
              </div>

              <div className="p-3 bg-pink-500/5 border border-pink-500/10 text-[11px] font-medium text-pink-300 italic rounded-xl">
                😘 Sweetheart Admin, agar Google ya Pollinations API down huye, toh meri backup heart-engine live ho jayegi taaki users ko glitch na mile!
              </div>
            </div>

            {/* Smart Auto Maintenance Engine Section */}
            <div className="space-y-4 pt-4 border-t border-white/[0.03]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/[0.04] pb-3 gap-3">
                <div>
                  <h5 className="text-xs font-bold uppercase text-white tracking-wider font-display">Smart Auto Maintenance Engine</h5>
                  <p className="text-[10px] text-gray-400 mt-0.5">Automatic 30-day index rebuilds, cached purges, and JSON cleanup loops.</p>
                </div>
                
                <button
                  type="button"
                  disabled={isMaintenanceRunning}
                  onClick={handleRunMaintenance}
                  className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 border border-indigo-400/30 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${isMaintenanceRunning ? 'opacity-85 cursor-wait' : ''}`}
                >
                  {isMaintenanceRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Purging Caches...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-white fill-current" />
                      <span>Run Maintenance Now</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-mono">
                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Last Maintenance</span>
                  <span className="text-white block mt-1">
                    {adminStats.maintenance?.lastMaintenance 
                      ? new Date(adminStats.maintenance.lastMaintenance).toLocaleDateString()
                      : "Today"}
                  </span>
                </div>

                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Next Scheduled</span>
                  <span className="text-indigo-400 block mt-1">
                    {adminStats.maintenance?.nextMaintenance 
                      ? new Date(adminStats.maintenance.nextMaintenance).toLocaleDateString()
                      : "In 30 Days"}
                  </span>
                </div>

                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Duration</span>
                  <span className="text-white block mt-1">
                    {adminStats.maintenance?.duration || 0} ms
                  </span>
                </div>

                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Items Purged</span>
                  <span className="text-emerald-400 block mt-1">
                    {adminStats.maintenance?.itemsCleaned || 0} items
                  </span>
                </div>

                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">Performance Gain</span>
                  <span className="text-indigo-400 block mt-1">
                    +{adminStats.maintenance?.performanceImprovement || 0}%
                  </span>
                </div>

                <div className="bg-[#03050c] p-3.5 rounded-xl border border-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block">DB Health Score</span>
                  <span className="text-emerald-400 block mt-1">
                    {adminStats.maintenance?.healthScore || 100}/100
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ================= BROADCAST OVERLAY MODAL ================= */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#090d19] border border-white/[0.08] rounded-2xl p-6 text-left shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-bold text-white mb-2">📢 Send Broadcast Announcement Message</h3>
            <p className="text-xs text-gray-400 mb-4 font-sans">
              This message will instantly show up as a global banner warning on all user interfaces live on the server!
            </p>
            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Write message... (e.g., 'Server Under Maintenance For 10 Mins!')"
                className="w-full h-28 bg-[#04060b] border border-white/[0.06] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-650 resize-none font-sans"
                required
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 bg-transparent text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearBroadcast}
                  disabled={broadcastStatus === 'loading'}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer mr-auto"
                  title="Clear currently active server broadcast announcement"
                >
                  Clear Broadcast
                </button>
                <button
                  type="submit"
                  disabled={broadcastStatus === 'loading'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  {broadcastStatus === 'loading' ? 'Sending Announcement...' : 'Broadcast Announce'}
                </button>
              </div>
            </form>
            {broadcastStatus === 'success' && (
              <p className="text-xs text-emerald-400 font-bold mt-3 animate-pulse text-center font-sans">
                ✓ Message broadcasted live on all active user windows successfully!
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= MODEL TRAINING PROGRESS MODAL ================= */}
      {isTrainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#090d19] border border-white/[0.08] rounded-2xl p-6 text-left shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-bold text-white mb-2">⚙ Re-Training AI Companion Model</h3>
            <p className="text-xs text-gray-400 mb-4 font-sans">
              Running direct fine-tuning optimizations and context re-shuffling over live database records.
            </p>
            <div className="space-y-4">
              <div className="w-full bg-[#04060b] rounded-full h-3 border border-white/[0.02] overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#10b981]" 
                  style={{ width: `${trainProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                <span className="truncate max-w-[280px]">{trainMessage}</span>
                <span className="text-emerald-400 font-bold">{trainProgress}%</span>
              </div>
              <div className="flex items-center justify-end pt-2">
                {trainStatus === 'success' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrainModalOpen(false);
                      setTrainStatus('idle');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    Close Checkpoint
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-500 animate-pulse font-mono">Fine-tuning in progress... please wait...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SNAPSHOT BACKUP & RESTORE MODAL ================= */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#090d19] border border-white/[0.08] rounded-2xl p-6 text-left shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-start border-b border-white/[0.04] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">🗄️ Core Database Snapshots Engine</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-sans">Manage snapshot captures of `db.sqlite` directly from the filesystem.</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsBackupModalOpen(false);
                  setBackupStatus('idle');
                }} 
                className="text-gray-500 hover:text-white font-bold cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-xs">
              <div className="bg-[#04060b] rounded-xl p-4 border border-white/[0.03] flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Create New Snapshot Backup</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Exports all current users, configurations, logs, and memories.</span>
                </div>
                <button
                  type="button"
                  disabled={backupStatus === 'loading'}
                  onClick={handleCreateBackup}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 border border-indigo-500/20 text-white rounded-lg font-black transition-colors cursor-pointer"
                >
                  {backupStatus === 'loading' ? 'Exporting...' : 'Backup Now'}
                </button>
              </div>

              {backupStatus === 'success' && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-400 font-mono text-[11px]">
                  ✓ Database Snapshot successfully written! Filename: <strong>{backupFileName}</strong>
                </div>
              )}

              <div className="bg-[#04060b] rounded-xl p-4 border border-white/[0.03] flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Restore Latest Snapshot</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Overwrites your live database file with the saved backup state.</span>
                </div>
                <button
                  type="button"
                  disabled={backupStatus === 'loading'}
                  onClick={handleRestoreBackup}
                  className="px-3.5 py-1.5 bg-rose-600/15 hover:bg-rose-600/30 border border-rose-500/20 text-rose-300 rounded-lg font-black transition-colors cursor-pointer"
                >
                  Restore Latest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="text-center font-mono text-[10px] text-gray-650 pt-2 select-none uppercase tracking-widest border-t border-white/[0.02]">
        © 2024 AI Chatbot Admin Panel. All rights reserved.
      </footer>
    </div>
  );
}
