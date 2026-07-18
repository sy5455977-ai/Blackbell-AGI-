import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { Menu, LogOut, Terminal, Mic, MicOff, AlertCircle, X, Shield, Plus, MessageSquare, Sun, Moon, Send, Eye, EyeOff, RefreshCw, Users, BookOpen, Activity, AlertTriangle, Layers, ThumbsUp, CheckCircle, BarChart3, Database, MessageCircle, Settings, Megaphone } from 'lucide-react';
import AuthScreen from './AuthScreen';
import AdminDashboardView from './components/AdminDashboardView';

type Message = { 
  role: 'user'|'ai'; 
  content: string; 
  isImage?: boolean; 
  winner?: string; 
  latency?: string;
  isAttachment?: boolean; 
  imageBytes?: string; 
  mimeType?: string; 
  fileName?: string;
};

// Relative last seen formatter
function getRelativeTime(timestamp: number) {
  if (!timestamp) return "Never";
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 35000) return "Active now"; // treated as online
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min === 1) return `1 minute ago`;
  if (min < 60) return `${min} minutes ago`;
  const hrs = Math.floor(min / 60);
  if (hrs === 1) return `1 hour ago`;
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return `1 day ago`;
  return `${days} days ago`;
}

// Extract questions block from the raw AI response
function parseAiResponse(content: string) {
  if (!content) return { mainText: '', questions: [] as string[] };
  const marker = '[QUESTIONS]';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    return { mainText: content, questions: [] as string[] };
  }
  const mainText = content.substring(0, idx).trim();
  const qText = content.substring(idx + marker.length).trim();
  const questions = qText
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^[-\*\d\.\)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  return { mainText, questions };
}

function ImageWithProgress({ src, alt, theme }: { src: string; alt: string; theme: 'dark' | 'light' }) {
  const [progress, setProgress] = useState(10);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setProgress(10);
    setIsLoaded(false);

    // Increment progress smoothly to simulate image loading percentage
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 30) return prev + 10; // 10 -> 20 -> 30
        if (prev < 65) return prev + 15; // 30 -> 45 -> 60 -> 65
        if (prev < 95) return prev + 5;  // 65 -> ... -> 95
        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [src]);

  const handleImageLoad = () => {
    setProgress(100);
    setTimeout(() => {
      setIsLoaded(true);
    }, 200); // Small sweet delay to let user see 100%
  };

  return (
    <div className="relative min-h-[220px] w-full max-w-md bg-black/30 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 shadow-inner">
      {/* Hidden/preloaded image to calculate actual loading click of the browser */}
      <img
        src={src}
        alt={alt}
        onLoad={handleImageLoad}
        className={`rounded-xl w-full object-cover transition-opacity duration-500 ease-in-out ${
          isLoaded ? 'opacity-100 block' : 'opacity-0 absolute w-0 h-0 overflow-hidden'
        }`}
        referrerPolicy="no-referrer"
      />

      {/* Progress indicators while generating/loading */}
      {!isLoaded && (
        <div className="flex flex-col items-center justify-center gap-4 py-8 px-4 w-full text-center">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Outer SVG progress circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                className={`stroke-current ${theme === 'light' ? 'text-gray-200' : 'text-gray-800'}`}
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-current text-purple-500 transition-all duration-300 ease-out"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={213.6}
                strokeDashoffset={213.6 - (213.6 * progress) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-black font-mono text-purple-400 select-none">
              {progress}%
            </span>
          </div>

          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest animate-pulse">
              Generating Masterpiece...
            </span>
            <div className={`text-[10px] font-mono text-gray-500 px-2 py-0.5 rounded border ${
              theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/10'
            }`}>
              Blackbell Ai Image Engine
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StreamingText({ 
  content, 
  onComplete, 
  active = true 
}: { 
  content: string; 
  onComplete?: () => void; 
  active?: boolean; 
}) {
  const [displayedText, setDisplayedText] = useState(active ? "" : content);
  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setDisplayedText(content);
      if (onComplete) onComplete();
      return;
    }

    // Split words but keep space characters so formatting/line breaks are perfect
    const words = content.split(/(\s+)/);
    wordsRef.current = words;
    currentIndexRef.current = 0;
    setDisplayedText("");

    let timer: any;
    const streamWords = () => {
      if (currentIndexRef.current < words.length) {
        let nextIndex = currentIndexRef.current + 1;
        // Grab space characters with the word together so spacing is smooth
        if (words[currentIndexRef.current] && words[currentIndexRef.current].trim() === "" && nextIndex < words.length) {
          nextIndex++;
        }
        
        currentIndexRef.current = nextIndex;
        const currentSlice = words.slice(0, nextIndex).join("");
        setDisplayedText(currentSlice);

        // Word spacing interval: 35ms to 65ms per word chunk makes it look extremely fast and satisfying
        timer = setTimeout(streamWords, 30 + Math.random() * 35);
      } else {
        if (onComplete) onComplete();
      }
    };

    timer = setTimeout(streamWords, 40);

    return () => {
      clearTimeout(timer);
    };
  }, [content, active]);

  return <span className="transition-all duration-150">{displayedText}</span>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('blackbell_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.sessionToken) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('blackbell_theme') as 'dark' | 'light') || 'dark';
  });

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    isConfirm: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isConfirm: false
  });

  const showAlert = (title: string, message: string) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      isConfirm: false
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      onConfirm,
      isConfirm: true
    });
  };

  useEffect(() => {
    localStorage.setItem('blackbell_theme', theme);
  }, [theme]);

  const [isBanned, setIsBanned] = useState(false);
  const [viewMode, setViewMode] = useState<'app' | 'admin'>('app');
  
  // Existing Voice state
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection lock and sync refs to prevent race conditions during rapid toggles
  const isConnectingRef = useRef(false);
  const isRecordingRef = useRef(false);
  
  // New Text AI State
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // New Voice, Memory, and Speech States
  const [voiceTranscription, setVoiceTranscription] = useState('');
  const [memories, setMemories] = useState<string[]>([]);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [openingUrlInfo, setOpeningUrlInfo] = useState<{ url: string; label: string } | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [completedStreams, setCompletedStreams] = useState<{ [key: string]: boolean }>({});

  const attemptSilentRestore = async (): Promise<boolean> => {
    const savedUser = localStorage.getItem('blackbell_user');
    const savedPassword = localStorage.getItem('blackbell_password');
    if (!savedUser || !savedPassword) {
      return false;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      const email = parsedUser.email;
      const username = parsedUser.username;

      // Try logging in first
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: savedPassword })
      });

      // If login fails (user does not exist because DB was reset), register
      if (!res.ok) {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password: savedPassword })
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('blackbell_user', JSON.stringify(data.user));
          
          // Re-push local sessions/chats to the server so they are persistent
          const currentSessions = localStorage.getItem(`blackbell_sessions_${email}`);
          if (currentSessions) {
            try {
              const parsedSessions = JSON.parse(currentSessions);
              await fetch('/api/users/sessions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-session-token': data.user.sessionToken || ''
                },
                body: JSON.stringify({ email, sessions: parsedSessions })
              });
            } catch (err) {
              console.error("Error re-syncing sessions after auto-restore:", err);
            }
          }
          return true;
        }
      }
    } catch (e) {
      console.error("Silent restoration failed:", e);
    }
    return false;
  };

  const fetchMemories = async () => {
    if (!currentUser?.email) return;
    try {
      let res = await fetch(`/api/users/memories?email=${encodeURIComponent(currentUser.email)}`, {
        headers: { 'x-session-token': currentUser.sessionToken || '' }
      });
      if (res.status === 401) {
        const restored = await attemptSilentRestore();
        if (restored) {
          const newUser = JSON.parse(localStorage.getItem('blackbell_user') || '{}');
          res = await fetch(`/api/users/memories?email=${encodeURIComponent(currentUser.email)}`, {
            headers: { 'x-session-token': newUser.sessionToken || '' }
          });
        } else {
          handleLogout();
          return;
        }
      }
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (e) {
      console.error("Error fetching memories:", e);
    }
  };

  useEffect(() => {
    if (currentUser?.email) {
      fetchMemories();
    }
  }, [currentUser?.email]);

  // Public Announcement Broadcast Banner
  const [announcement, setAnnouncement] = useState<string>('');
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string>('');

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch('/api/announcement');
        if (res.ok) {
          const data = await res.json();
          const msg = data.message || "";
          setAnnouncement(prev => {
            if (msg === "") return "";
            if (msg === dismissedAnnouncement) return "";
            return msg;
          });
        }
      } catch (err) {
        console.error("Error fetching announcement:", err);
      }
    };
    fetchAnnouncement();
    const interval = setInterval(fetchAnnouncement, 15000); // Poll every 15 seconds to be fully reliable
    return () => clearInterval(interval);
  }, [dismissedAnnouncement]);
  
  // Admin Data State
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>({ 
    totalUsers: 0, 
    onlineUsers: 0, 
    bannedUsers: 0, 
    returningUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    avgResponseTime: 1.24,
    aiHealthScore: 98.6,
    traffic: [], 
    topAskedQuestions: [],
    featureUsage: { textChat: 0, voiceChat: 0, imageGen: 0, fileUpload: 0, knowledgeSearch: 0 },
    errorLogs: [],
    userFeedback: [],
    knowledgeList: [],
    systemSettings: { aiPersonality: 'Charming & Flirty Girlfriend', modelName: 'gemini-3.5-flash', maxDailyImages: 5 },
    blackbell2Requests: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [selectedUserChats, setSelectedUserChats] = useState<any | null>(null);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number>(0);
  
  // Expanded Admin Panel & Feedback States
  const [adminTab, setAdminTab] = useState<'dashboard' | 'users' | 'feedback' | 'knowledge' | 'settings'>('dashboard');
  const [dateFilter, setDateFilter] = useState({
    type: 'today',
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [settingsPersonality, setSettingsPersonality] = useState('Charming & Flirty Girlfriend');
  const [settingsModel, setSettingsModel] = useState('gemini-3.5-flash');
  const [settingsMaxImages, setSettingsMaxImages] = useState(5);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<'positive' | 'neutral' | 'negative'>('positive');
  const [feedbackText, setFeedbackText] = useState('');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  interface Session {
    id: string;
    title: string;
    messages: Message[];
    isPinned?: boolean;
    createdAt?: number;
    updatedAt?: number;
  }

  // Pinned context menus states
  const [activeContextMenu, setActiveContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Enforces the 15 session limit (deletes oldest unpinned sessions first)
  const enforceSessionLimits = (list: Session[]): Session[] => {
    if (list.length <= 15) return list;
    
    const pinned = list.filter(s => s.isPinned);
    const unpinned = list.filter(s => !s.isPinned);
    
    const maxAllowedUnpinned = 15 - pinned.length;
    if (unpinned.length > maxAllowedUnpinned) {
      // Sort unpinned by age/updatedAt descending (newest first), and slice to keep only newest
      const sortedUnpinned = [...unpinned].sort((a, b) => {
        const timeA = a.updatedAt || parseInt(a.id) || 0;
        const timeB = b.updatedAt || parseInt(b.id) || 0;
        return timeB - timeA;
      });
      const keptUnpinned = sortedUnpinned.slice(0, Math.max(0, maxAllowedUnpinned));
      
      return sortSessions([...pinned, ...keptUnpinned]);
    }
    return list;
  };

  const sortSessions = (list: Session[]): Session[] => {
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = a.updatedAt || parseInt(a.id) || 0;
      const timeB = b.updatedAt || parseInt(b.id) || 0;
      return timeB - timeA;
    });
  };

  const isFetchingRef = useRef(false);
  const isInitialSyncDoneRef = useRef(false);

  const lastSavedUserEmailRef = useRef<string | null>(() => {
    try {
      const savedUser = localStorage.getItem('blackbell_user');
      return savedUser ? JSON.parse(savedUser)?.email || null : null;
    } catch (e) {
      console.error("Failed to parse last saved user email", e);
      return null;
    }
  });

  const [sessions, setSessions] = useState<Session[]>(() => {
    let email = '';
    try {
      const savedUser = localStorage.getItem('blackbell_user');
      email = savedUser ? JSON.parse(savedUser)?.email : '';
    } catch (e) {
      console.error("Failed to extract user email for sessions", e);
    }
    if (email) {
      const saved = localStorage.getItem(`blackbell_sessions_${email}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return sortSessions(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      const saved = localStorage.getItem('blackbell_sessions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return sortSessions(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    }
    // Check if initialized user is admin for welcome message
    const isAdminForWelcome = email === 'sy5455977@gmail.com';
    const welcomeText = isAdminForWelcome 
      ? "Hello Admin. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt."
      : "Hello. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt.";

    const defaultSession: Session = {
      id: 'default',
      title: 'Welcome Session',
      messages: [
        { 
          role: 'ai', 
          content: welcomeText
        }
      ],
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return [defaultSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    let email = '';
    try {
      const savedUser = localStorage.getItem('blackbell_user');
      email = savedUser ? JSON.parse(savedUser)?.email : '';
    } catch (e) {
      console.error("Failed to extract email for activeSessionId", e);
    }
    if (email) {
      const saved = localStorage.getItem(`blackbell_active_session_id_${email}`);
      if (saved) return saved;
    } else {
      const saved = localStorage.getItem('blackbell_active_session_id');
      if (saved) return saved;
    }
    return 'default';
  });

  // Synchronize/Load sessions when currentUser changes
  useEffect(() => {
    const email = currentUser?.email;
    if (!email) {
      lastSavedUserEmailRef.current = null;
      return;
    }

    const sessionKey = `blackbell_sessions_${email}`;
    const activeKey = `blackbell_active_session_id_${email}`;

    // Mark as false immediately to pause Hook 2 from writing to server while we sync
    isInitialSyncDoneRef.current = false;

    let currentLocalSessions: Session[] = [];

    if (lastSavedUserEmailRef.current !== email) {
      const saved = localStorage.getItem(sessionKey);
      let loadedSessions: Session[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedSessions = sortSessions(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (loadedSessions.length === 0) {
        const isAdminForWelcome = email === 'sy5455977@gmail.com';
        const welcomeText = isAdminForWelcome 
          ? "Hello Admin. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt."
          : "Hello. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt.";

        const defaultSession: Session = {
          id: 'default',
          title: 'Welcome Session',
          messages: [{ role: 'ai', content: welcomeText }],
          isPinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        loadedSessions = [defaultSession];
      }

      currentLocalSessions = loadedSessions;
      setSessions(loadedSessions);

      const savedActiveId = localStorage.getItem(activeKey);
      if (savedActiveId && loadedSessions.some(s => s.id === savedActiveId)) {
        setActiveSessionId(savedActiveId);
      } else {
        setActiveSessionId(loadedSessions[0]?.id || 'default');
      }

      // Optimistic sync tracker update
      lastSavedUserEmailRef.current = email;
    } else {
      currentLocalSessions = sessions;
    }

    // Always fetch multi-device synced chats from the server
    const fetchSessionsFromServer = async () => {
      try {
        let res = await fetch(`/api/users/sessions?email=${encodeURIComponent(email)}`, {
          headers: { 'x-session-token': currentUser?.sessionToken || '' }
        });
        if (res.status === 401) {
          const restored = await attemptSilentRestore();
          if (restored) {
            const newUser = JSON.parse(localStorage.getItem('blackbell_user') || '{}');
            res = await fetch(`/api/users/sessions?email=${encodeURIComponent(email)}`, {
              headers: { 'x-session-token': newUser.sessionToken || '' }
            });
          } else {
            handleLogout();
            return;
          }
        }
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
            isFetchingRef.current = true;
            const sorted = sortSessions(data.sessions);
            setSessions(sorted);
            localStorage.setItem(sessionKey, JSON.stringify(sorted));
            setActiveSessionId(prev => {
              if (sorted.some(s => s.id === prev)) return prev;
              const savedActiveId = localStorage.getItem(activeKey);
              if (savedActiveId && sorted.some(s => s.id === savedActiveId)) return savedActiveId;
              return sorted[0]?.id || 'default';
            });
          } else {
            // Server has no chat sessions, so push our current local sessions (loaded from localStorage or default)
            if (currentLocalSessions.length > 0) {
              try {
                await fetch('/api/users/sessions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-session-token': currentUser?.sessionToken || ''
                  },
                  body: JSON.stringify({ email, sessions: currentLocalSessions })
                });
              } catch (saveErr) {
                console.error("Error saving initial offline sessions to server:", saveErr);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error fetching sessions from server:", e);
      } finally {
        isInitialSyncDoneRef.current = true;
      }
    };
    fetchSessionsFromServer();
  }, [currentUser?.email]);

  // Persists sessions on change, only if state matches the logged-in user email
  useEffect(() => {
    const email = currentUser?.email;
    if (email && lastSavedUserEmailRef.current === email) {
      localStorage.setItem(`blackbell_sessions_${email}`, JSON.stringify(sessions));

      // Guard saving to database until initial loading/sync from server is finished!
      if (!isInitialSyncDoneRef.current) {
        return;
      }

      if (isFetchingRef.current) {
        isFetchingRef.current = false;
        return;
      }

      // Sync to backend database
      const saveSessionsToServer = async () => {
        try {
          await fetch('/api/users/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-token': currentUser?.sessionToken || ''
            },
            body: JSON.stringify({ email, sessions })
          });
        } catch (e) {
          console.error("Error saving sessions to database:", e);
        }
      };
      saveSessionsToServer();
    }
  }, [sessions, currentUser?.email]);

  useEffect(() => {
    const email = currentUser?.email;
    if (email && lastSavedUserEmailRef.current === email) {
      localStorage.setItem(`blackbell_active_session_id_${email}`, activeSessionId);
    }
  }, [activeSessionId, currentUser?.email]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  const updateActiveSessionMessages = (newMessages: Message[]) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === (activeSession?.id || activeSessionId)) {
          let newTitle = s.title;
          if (s.title === 'Welcome Session' || s.title === 'New Session') {
            const firstUserMsg = newMessages.find(m => m.role === 'user');
            if (firstUserMsg) {
              newTitle = firstUserMsg.content.length > 25 
                ? firstUserMsg.content.substring(0, 25) + '...'
                : firstUserMsg.content;
            }
          }
          return {
            ...s,
            title: newTitle,
            messages: newMessages,
            updatedAt: Date.now()
          };
        }
        return s;
      });
      return sortSessions(updated);
    });
  };

  const handleNewSession = () => {
    const newSessionId = Date.now().toString();
    const isAdminNow = currentUser?.email === 'sy5455977@gmail.com';
    const welcomeContent = isAdminNow
      ? "Hello Admin. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt."
      : "Hello. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt.";

    const newSession: Session = {
      id: newSessionId,
      title: 'New Session',
      messages: [
        {
          role: 'ai',
          content: welcomeContent
        }
      ],
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setSessions(prev => {
      const list = [newSession, ...prev];
      return sortSessions(enforceSessionLimits(list));
    });
    setActiveSessionId(newSessionId);
    setIsSidebarOpen(false);
  };

  const handlePurgeSessions = () => {
    showConfirm(
      'Purge All Sessions', 
      'Are you sure you want to purge all sessions? This will reset your entire session history permanently.',
      () => {
        const isAdminNow = currentUser?.email === 'sy5455977@gmail.com';
        const welcomeContent = isAdminNow
          ? "Hello Admin. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt."
          : "Hello. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt.";

        const defaultSession: Session = {
          id: 'default',
          title: 'Welcome Session',
          messages: [
            { 
              role: 'ai', 
              content: welcomeContent 
            }
          ],
          isPinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setSessions([defaultSession]);
        setActiveSessionId('default');
      }
    );
  };

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const playMessageTTS = async (text: string, index: number) => {
    try {
      if (playingMessageId === index) {
        if ('speechSynthesis' in window) {
          try { window.speechSynthesis.cancel(); } catch (e) {}
        }
        activeSourcesRef.current.forEach(source => {
          try { source.stop(); } catch(e){}
        });
        activeSourcesRef.current = [];
        setPlayingMessageId(null);
        return;
      }

      setPlayingMessageId(index);

      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }

      if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === 'closed') {
        outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const outputCtx = outputAudioCtxRef.current;
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }

      activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e){}
      });
      activeSourcesRef.current = [];
      nextStartTimeRef.current = outputCtx.currentTime;

      let success = false;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000);

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'Zephyr' }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data.audio) {
            playAudioChunk(data.audio, () => {
              setPlayingMessageId(null);
            });
            success = true;
          }
        }
      } catch (err) {
        console.warn("Backend TTS connection failed or timed out. Falling back to browser Speech Synthesis:", err);
      }

      if (!success) {
        if ('speechSynthesis' in window) {
          // Speak clean content up to the questions section to avoid talking out loud the visual menu options
          const cleanText = text.split('[QUESTIONS]')[0].replace(/\*+/g, '').replace(/_+/g, '').trim();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          
          // Let's pick a beautiful expressive feminine / pleasant voice
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(v => 
            v.lang.startsWith('hi') || // Hindi
            (v.name.toLowerCase().includes('google') && v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
            v.name.toLowerCase().includes('female') || 
            v.name.toLowerCase().includes('zira') || 
            v.name.toLowerCase().includes('samantha')
          ) || voices[0];
          
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          utterance.rate = 1.05;
          utterance.pitch = 1.1; 
          utterance.onend = () => {
            setPlayingMessageId(null);
          };
          utterance.onerror = () => {
            setPlayingMessageId(null);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setPlayingMessageId(null);
        }
      }
    } catch (e) {
      console.error("TTS playback error:", e);
      setPlayingMessageId(null);
    }
  };

  // Pollinations Text API logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    const isTextFile = file.type.startsWith('text/') || 
                       file.type === 'application/json' || 
                       file.name.endsWith('.ts') || 
                       file.name.endsWith('.tsx') || 
                       file.name.endsWith('.js') || 
                       file.name.endsWith('.jsx');

    if (isTextFile) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const base64Content = window.btoa(unescape(encodeURIComponent(text)));
        setAttachedFile({
          base64: base64Content,
          mimeType: 'text/plain',
          name: file.name
        });
      };
      reader.readAsText(file);
    } else {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        reader.onload = (event) => {
          img.src = event.target?.result as string;
        };
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const commaIdx = dataUrl.indexOf(',');
            const rawBase64 = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;
            setAttachedFile({
              base64: rawBase64,
              mimeType: 'image/jpeg',
              name: file.name
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            const commaIdx = result.indexOf(',');
            const rawBase64 = commaIdx !== -1 ? result.substring(commaIdx + 1) : result;
            setAttachedFile({
              base64: rawBase64,
              mimeType: file.type || 'image/octet-stream',
              name: file.name
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (textOverride?: any) => {
    // Proactively unlock browser audio autoplay inside direct user event context
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      }
      if (outputAudioCtxRef.current.state === 'suspended') {
        outputAudioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn("Failed audio pre-init:", e);
    }

    const hasTextOverride = typeof textOverride === 'string';
    const textTarget = hasTextOverride ? textOverride : inputText;
    if (typeof textTarget !== 'string' || (!textTarget.trim() && !attachedFile) || isTyping) return;
    const currentText = textTarget.trim();
    const currentAttachment = hasTextOverride ? null : attachedFile;
    if (!hasTextOverride) {
      setAttachedFile(null);
    }

    let userMsgContent = currentText;
    if (!userMsgContent && currentAttachment) {
      userMsgContent = `Analyze this uploaded file: ${currentAttachment.name}`;
    }

    const newUserMsg: Message = { 
      role: 'user', 
      content: userMsgContent,
      ...(currentAttachment ? {
        imageBytes: currentAttachment.base64,
        mimeType: currentAttachment.mimeType,
        fileName: currentAttachment.name,
        isAttachment: true
      } : {})
    };

    const newMessages: Message[] = [...messages, newUserMsg];
    updateActiveSessionMessages(newMessages);
    if (!hasTextOverride) {
      setInputText('');
    }
    
    setIsTyping(true);
    try {
      let res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-token': currentUser?.sessionToken || ''
        },
        body: JSON.stringify({
          email: currentUser?.email,
          messages: newMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            ...(m.isAttachment ? {
              attachment: {
                base64: m.imageBytes,
                mimeType: m.mimeType,
                name: m.fileName
              }
            } : {})
          }))
        })
      });
      if (res.status === 401) {
        const restored = await attemptSilentRestore();
        if (restored) {
          const newUser = JSON.parse(localStorage.getItem('blackbell_user') || '{}');
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-session-token': newUser?.sessionToken || ''
            },
            body: JSON.stringify({
              email: newUser?.email,
              messages: newMessages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
                ...(m.isAttachment ? {
                  attachment: {
                    base64: m.imageBytes,
                    mimeType: m.mimeType,
                    name: m.fileName
                  }
                } : {})
              }))
            })
          });
        } else {
          handleLogout();
          throw new Error("Session expired. Please login again.");
        }
      }
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const winner = res.headers.get('x-model-winner') || '';
      const latency = res.headers.get('x-model-latency') || '';
      const isResponseImage = res.headers.get('x-is-image') === 'true';
      const aiText = await res.text();
      const finalMsg: Message = { role: 'ai', content: aiText, isImage: isResponseImage, winner, latency };
      updateActiveSessionMessages([...newMessages, finalMsg]);

      if (autoSpeak) {
        const parsed = parseAiResponse(aiText);
        playMessageTTS(parsed.mainText, newMessages.length);
      }

      setTimeout(fetchMemories, 1500);
    } catch (e: any) {
      const errorMsg = e?.message || "Error connecting to AI Server.";
      updateActiveSessionMessages([...newMessages, { role: 'ai', content: `Error: ${errorMsg}. Please try again.` }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Audio Refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Existing Voice API Logic
  const connectToLiveAPI = async () => {
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log("Connection already pending. Ignoring duplicate request.");
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);
      isConnectingRef.current = true;

      // Init Output context (GenAI response is 24kHz)
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;
      nextStartTimeRef.current = outputAudioCtx.currentTime;

      // Ensure AudioContext is resumed (browser policy)
      if (outputAudioCtx.state === 'suspended') {
        await outputAudioCtx.resume();
      }

      // Connect via WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const userMailStr = currentUser?.email ? encodeURIComponent(currentUser.email) : '';
      const userTokenStr = currentUser?.sessionToken ? encodeURIComponent(currentUser.sessionToken) : '';
      const wsUrl = `${protocol}//${window.location.host}/live?email=${userMailStr}&token=${userTokenStr}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setIsRecording(true);
        isRecordingRef.current = true;
        setIsConnecting(false);
        isConnectingRef.current = false;
        setVoiceTranscription('');
        try {
          // Init Input context (user mic is 16kHz) with echo cancellation and noise suppression
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          
          if (ws.readyState !== WebSocket.OPEN) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          
          streamRef.current = stream;
          
          const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
          inputAudioCtxRef.current = inputAudioCtx;
          
          const source = inputAudioCtx.createMediaStreamSource(stream);
          sourceRef.current = source;
          
          const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          
          source.connect(processor);
          processor.connect(inputAudioCtx.destination);
          
          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN && isRecordingRef.current) {
              const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };
        } catch (err) {
          setError("Microphone access denied.");
          setIsConnecting(false);
          isConnectingRef.current = false;
          disconnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
             setError(msg.error);
             disconnect();
          }
          if (msg.toolCall && msg.toolCall.name === "open_app") {
            const appName = msg.toolCall.args?.app_name?.toLowerCase().trim();
            const rawUrl = msg.toolCall.args?.url?.trim();
            const urls: Record<string, string> = {
              whatsapp: "whatsapp://send",
              youtube: "https://www.youtube.com",
              instagram: "https://www.instagram.com",
              maps: "https://maps.google.com",
              spotify: "https://open.spotify.com"
            };
            const targetUrl = urls[appName] || rawUrl;
            if (targetUrl) {
              console.log(`Intercepted open_app tool call. Redirecting to ${appName || targetUrl}:`, targetUrl);
              const newWindow = window.open(targetUrl, "_blank");
              if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                console.log("Popup blocked, falling back to window.location.href");
                window.location.href = targetUrl;
              }
            }
          }
          if (msg.audio) {
            playAudioChunk(msg.audio);
          }
          if (msg.text) {
             setVoiceTranscription(prev => prev + " " + msg.text);
          }
          if (msg.interrupted) {
             setVoiceTranscription('');
             // Stop playback of all pending/active buffers instantly
             activeSourcesRef.current.forEach(source => {
                try {
                  source.stop();
                } catch (e) {
                  // Ignore if already stopped
                }
             });
             activeSourcesRef.current = [];
             nextStartTimeRef.current = outputAudioCtxRef.current?.currentTime || 0;
          }
        } catch (err) {
          console.error("Message error:", err);
        }
      };

      ws.onerror = () => {
        setError("WebSocket error occurred.");
        setIsConnecting(false);
        isConnectingRef.current = false;
        disconnect();
      };
      
      ws.onclose = () => {
        setIsConnecting(false);
        isConnectingRef.current = false;
        disconnect();
      };
    } catch(err) {
       console.error(err);
       setError("Connection failed.");
       setIsConnecting(false);
       isConnectingRef.current = false;
       disconnect();
    }
  };

  const pcmToBase64 = (float32Array: Float32Array): string => {
    // Convert Float32Array to 16-bit PCM
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    // Encode to base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const playAudioChunk = (base64Audio: string, onEnded?: () => void) => {
    const outputCtx = outputAudioCtxRef.current;
    if (!outputCtx) {
      if (onEnded) onEnded();
      return;
    }

    // Decode base64 to ArrayBuffer
    const binaryString = window.atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert 16-bit PCM to Float32
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
    }

    const audioBuffer = outputCtx.createBuffer(1, float32.length, outputCtx.sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const source = outputCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputCtx.destination);

    const playTime = Math.max(outputCtx.currentTime, nextStartTimeRef.current);
    source.start(playTime);
    nextStartTimeRef.current = playTime + audioBuffer.duration;

    // Track active source to enable true, glitch-free interruption
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      if (onEnded) {
        onEnded();
      }
    };
  };

  const disconnect = () => {
    setIsConnected(false);
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsConnecting(false);
    isConnectingRef.current = false;
    
    // Stop and clear all active playing buffers
    if (activeSourcesRef.current) {
      activeSourcesRef.current.forEach(source => {
         try {
           source.stop();
         } catch(e) {}
      });
      activeSourcesRef.current = [];
    }

    if (wsRef.current) {
       wsRef.current.close();
       wsRef.current = null;
    }
    if (processorRef.current) {
       processorRef.current.disconnect();
       processorRef.current = null;
    }
    if (sourceRef.current) {
       sourceRef.current.disconnect();
       sourceRef.current = null;
    }
    if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
       try { inputAudioCtxRef.current.close(); } catch(e) {}
       inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
       try { outputAudioCtxRef.current.close(); } catch(e) {}
       outputAudioCtxRef.current = null;
    }
  };

  const toggleConnection = () => {
    if (isConnectingRef.current) return; // Ignore toggles during transit connecting

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const nextState = !isRecording;
      setIsRecording(nextState);
      isRecordingRef.current = nextState;
      
      // Keep socket open but pause/unpause microphone stream
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => {
          track.enabled = nextState;
        });
      }
    } else {
      connectToLiveAPI();
    }
  };

  const handleLogout = () => {
    disconnect();
    localStorage.removeItem('blackbell_user');
    setCurrentUser(null);
    setViewMode('app');
    setIsBanned(false);
    lastSavedUserEmailRef.current = null;
    
    const welcomeText = "Hello. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt.";
    const defaultSession: Session = {
      id: 'default',
      title: 'Welcome Session',
      messages: [
        { 
          role: 'ai', 
          content: welcomeText
        }
      ],
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setSessions([defaultSession]);
    setActiveSessionId('default');
    setCompletedStreams({});
  };

  // Keep-alive tracking & user checking interval
  useEffect(() => {
    if (!currentUser) return;

    const performPing = async () => {
      if (document.hidden) return; // Pause pings when tab is in the background
      try {
        let res = await fetch('/api/users/ping', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-session-token': currentUser?.sessionToken || ''
          },
          body: JSON.stringify({ email: currentUser.email })
        });
        if (res.status === 401) {
          const restored = await attemptSilentRestore();
          if (restored) {
            const newUser = JSON.parse(localStorage.getItem('blackbell_user') || '{}');
            res = await fetch('/api/users/ping', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-session-token': newUser?.sessionToken || ''
              },
              body: JSON.stringify({ email: currentUser.email })
            });
          } else {
            handleLogout();
            return;
          }
        }
        if (res.ok) {
          const data = await res.json();
          if (data.isBanned) {
            setIsBanned(true);
            disconnect();
          }
        }
      } catch (err) {
        // Safe check-in: suppress console.error during transient server restarts to avoid triggering AI Studio platform error dialogs
        console.warn("Keep-alive ping temporarily offline (expected during server restarts)");
      }
    };

    performPing();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        performPing(); // Immediately ping when tab becomes active
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(performPing, 25000); // 25 seconds is perfect and saves 60% bandwidth (server online threshold is 35s)
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser?.email]);

  // Fetch Admin Panel Data Controller
  const fetchAdminData = async (currentDateFilter = dateFilter) => {
    if (!currentUser || currentUser.email !== 'sy5455977@gmail.com') return;
    setIsAdminLoading(true);
    try {
      const { start, end } = currentDateFilter;
      let usersRes = await fetch(`/api/admin/users?adminEmail=${encodeURIComponent(currentUser.email)}`, {
        headers: { 'x-session-token': currentUser.sessionToken || '' }
      });
      let statsRes = await fetch(`/api/admin/stats?adminEmail=${encodeURIComponent(currentUser.email)}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, {
        headers: { 'x-session-token': currentUser.sessionToken || '' }
      });

      if (usersRes.status === 401 || statsRes.status === 401) {
        const restored = await attemptSilentRestore();
        if (restored) {
          const newUser = JSON.parse(localStorage.getItem('blackbell_user') || '{}');
          usersRes = await fetch(`/api/admin/users?adminEmail=${encodeURIComponent(currentUser.email)}`, {
            headers: { 'x-session-token': newUser.sessionToken || '' }
          });
          statsRes = await fetch(`/api/admin/stats?adminEmail=${encodeURIComponent(currentUser.email)}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, {
            headers: { 'x-session-token': newUser.sessionToken || '' }
          });
        } else {
          handleLogout();
          return;
        }
      }

      if (usersRes.ok && statsRes.ok) {
        const uData = await usersRes.json();
        const sData = await statsRes.json();
        setAdminUsers(uData);
        setAdminStats(sData);
        
        // Sync setting form defaults
        if (sData.systemSettings) {
          setSettingsPersonality(prev => prev === 'Charming & Flirty Girlfriend' ? sData.systemSettings.aiPersonality : prev);
          setSettingsModel(prev => prev === 'gemini-3.5-flash' ? sData.systemSettings.modelName : prev);
          setSettingsMaxImages(prev => prev === 5 ? sData.systemSettings.maxDailyImages : prev);
        }
      }
    } catch (err) {
      console.error("Error reading admin dashboard data:", err);
    } finally {
      setIsAdminLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode !== 'admin') return;

    const reloadAdminData = () => {
      if (document.hidden) return; // Pause admin data fetches when tab is in background
      fetchAdminData(dateFilter);
    };

    reloadAdminData();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        reloadAdminData(); // Immediately reload when user focuses back on tab
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(reloadAdminData, 18000); // 18 seconds (saves 66% server CPU and browser rendering load)
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [viewMode, dateFilter]);

  // Handle banning & unbanning user
  const handleToggleBan = async (userId: string, isCurrentlyBanned: boolean) => {
    if (!currentUser || currentUser.email !== 'sy5455977@gmail.com') return;
    const actionText = isCurrentlyBanned ? 'unban' : 'ban';
    showConfirm(
      `${actionText === 'ban' ? 'Ban' : 'Unban'} User`,
      `Are you sure you want to ${actionText} this user account?`,
      async () => {
        try {
          const res = await fetch('/api/admin/users/ban', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-session-token': currentUser.sessionToken || ''
            },
            body: JSON.stringify({
              adminEmail: currentUser.email,
              userId,
              ban: !isCurrentlyBanned
            })
          });
          if (res.status === 401) {
            handleLogout();
            return;
          }
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setAdminUsers(data.users);
              await fetchAdminData();
            }
          }
        } catch (err) {
          console.error("Error toggling user ban:", err);
        }
      }
    );
  };

  // Convert active duration seconds into readable hours / minutes
  const formatDuration = (secondsTotal: number) => {
    if (!secondsTotal || secondsTotal <= 0) return "0s";
    if (secondsTotal < 60) return `${secondsTotal}s`;
    const mins = Math.floor(secondsTotal / 60);
    const secs = secondsTotal % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Handle Voice commands to open Web App or external URLs
  useEffect(() => {
    if (voiceTranscription.includes("[OPEN_APP]")) {
       setVoiceTranscription(prev => prev.replace("[OPEN_APP]", "").trim());
       setTimeout(() => {
         setMode('text');
         disconnect();
       }, 1500);
    }
    
    // Check for [OPEN_URL: https://...] tag
    const urlMatch = voiceTranscription.match(/\[OPEN_URL:\s*(https?:\/\/[^\]]+)\]/i);
    if (urlMatch && urlMatch[1]) {
      const url = urlMatch[1];
      // Immediately remove the tag so we don't open it multiple times
      setVoiceTranscription(prev => prev.replace(urlMatch[0], "").trim());
      
      // Parse a beautiful label for the web app/website
      let label = "Web App";
      try {
        const hostname = new URL(url).hostname;
        const parts = hostname.replace('www.', '').split('.');
        if (parts[0]) {
          label = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
      } catch (e) {
        if (url.includes('youtube')) label = 'YouTube';
        else if (url.includes('google')) label = 'Google';
        else if (url.includes('github')) label = 'GitHub';
      }

      // Set the opening URL state to trigger the spectacular on-screen launcher feedback
      setOpeningUrlInfo({ url, label });
      setIsPopupBlocked(false);

      // Attempt to launch immediately
      try {
        const newWin = window.open(url, '_blank');
        if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
          setIsPopupBlocked(true);
        } else {
          setIsPopupBlocked(false);
        }
      } catch (err) {
        setIsPopupBlocked(true);
      }
    }
  }, [voiceTranscription]);

  // Terminate voice sessions and release microphone immediately when swapping mode to text
  useEffect(() => {
    if (mode === 'text') {
      disconnect();
    }
  }, [mode]);

  // Cancel any active Speech/TTS syntheses upon switching sessions to avoid voice spills
  useEffect(() => {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (activeSourcesRef.current) {
      activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      activeSourcesRef.current = [];
    }
    setPlayingMessageId(null);
  }, [activeSessionId]);

  // Banned full screen gate
  if (isBanned) {
    return (
      <div className="flex flex-col min-h-screen bg-[#111422] text-white px-4 py-8 items-center justify-center font-sans">
        <div className="w-full max-w-sm flex flex-col items-center bg-[#1A1D29] border border-red-500/20 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.25)] animate-pulse">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white mb-3">Account Banned</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Your account has been suspended or banned due to policy violations. Please contact the administrator.
          </p>
          <button 
            type="button"
            onClick={() => {
              localStorage.removeItem('blackbell_user');
              setCurrentUser(null);
              setIsBanned(false);
              lastSavedUserEmailRef.current = null;
              
              const welcomeText = "Hello. I'm Blackbell AGI.\n\nType your message below. To generate an image, use /Image followed by the prompt.";
              setSessions([{
                id: 'default',
                title: 'Welcome Session',
                messages: [{ role: 'ai', content: welcomeText }],
                isPinned: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
              }]);
              setActiveSessionId('default');
            }}
            className="w-full bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/20 font-semibold py-3 px-4 rounded-xl transition-colors cursor-pointer"
          >
            Go Back & Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLogin={(userData) => {
      setCurrentUser(userData);
      localStorage.setItem('blackbell_user', JSON.stringify(userData));
    }} />;
  }

  const renderVoiceUI = () => (
    <main className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full relative px-4 md:px-0">
      <div className="flex items-start justify-between w-full pt-4 md:pt-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase">BLACKBELL</h1>
          </div>
          <h2 className="text-3xl font-bold tracking-[0.2em] ml-4 uppercase">LIVE</h2>
        </div>
      </div>

      {/* Center Mic Button */}
      <div className="flex flex-col items-center justify-center flex-1 my-12 w-full">
        {error && (
          <div className="mb-8 flex items-center gap-2 text-red-400 text-sm border border-red-900/50 bg-red-950/20 px-4 py-2 rounded-lg">
             <AlertCircle className="w-4 h-4" />
             {error}
          </div>
        )}
        
        <button 
          onClick={toggleConnection}
          disabled={isConnecting}
          className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording 
              ? 'bg-purple-900/20 border-2 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.2)]' 
              : `${theme === 'light' ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 shadow-md' : 'bg-[#1A1A1A] hover:bg-[#222222] border-gray-800 shadow-xl'}`
          } ${isConnecting ? 'opacity-85 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isConnecting ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
          ) : isRecording ? (
            <div className="relative">
               <Mic className="w-12 h-12 text-purple-400" />
               <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-20"></div>
            </div>
          ) : (
            <MicOff className="w-12 h-12 text-gray-500" />
          )}
        </button>
        
        <p className={`mt-6 font-medium tracking-wide ${theme === 'light' ? 'text-gray-550' : 'text-[#888888]'}`}>
          {isConnecting ? 'Initializing Stream...' : isRecording ? 'Listening...' : 'Tap to Connect / Resume'}
        </p>

        {isConnected && (
          <div className="mt-6 max-w-md w-full text-center px-4 animate-fade-in">
            <span className="text-[9px] uppercase font-bold text-purple-400/80 tracking-widest block mb-2 select-none">LIVE SPEECH-TO-TEXT</span>
            <div className={`p-4 rounded-xl min-h-[64px] max-h-[110px] overflow-y-auto text-xs italic font-medium leading-relaxed shadow-inner [scrollbar-width:thin] ${theme === 'light' ? 'bg-white border-gray-200 text-gray-700' : 'bg-black/45 border border-white/5 text-gray-300'}`}>
              {voiceTranscription || (isRecording ? "Listening to your speech or translating voice stream..." : "Microphone muted. Tap button to resume.")}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pb-6 w-full">
        <p className={`text-xs font-semibold tracking-widest uppercase ${theme === 'light' ? 'text-gray-400' : 'text-[#333333]'}`}>
          SECURED BY Blackbell Ai
        </p>
      </div>
    </main>
  );

  const renderTextUI = () => (
    <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full px-4 md:px-8 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-4 pt-4 flex flex-col gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {messages.map((m, i) => {
          // Dynamic welcome cleaner for non-admin users
          const isAdmin = currentUser?.email === 'sy5455977@gmail.com';
          let displayContent = m.content;
          if (!isAdmin && displayContent && displayContent.includes("Hello Admin")) {
            displayContent = displayContent.replace("Hello Admin", "Hello");
          }

          let parsed = { mainText: displayContent, questions: [] as string[] };
          if (m.role === 'ai' && !m.isImage) {
            parsed = parseAiResponse(displayContent);
            displayContent = parsed.mainText;
          }

          return (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2 select-none">
                {m.role === 'user' ? 'USER' : 'BLACKBELL'}
              </span>
              <div className="flex items-end gap-2.5 max-w-[85%]">
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' 
                    ? 'bg-[#5b3eff] text-white rounded-tr-sm font-medium' 
                    : `${theme === 'light' ? 'bg-white text-gray-800 border-gray-200' : 'bg-[#1c1c1c] text-gray-300 border-white/5'} rounded-tl-sm border shadow-md font-medium`
                }`}>
                  {m.isImage ? (
                     <ImageWithProgress src={m.content} alt="Generated content" theme={theme} />
                  ) : m.role === 'ai' ? (
                     <StreamingText 
                       content={displayContent} 
                       active={i === messages.length - 1 && !completedStreams[`${activeSessionId}_${i}`]} 
                       onComplete={() => {
                         setCompletedStreams(prev => ({ ...prev, [`${activeSessionId}_${i}`]: true }));
                       }} 
                     />
                  ) : (
                     displayContent
                  )}

                  {/* Render inline attachment if this message uploaded a file/photo */}
                  {m.role === 'user' && m.isAttachment && m.imageBytes && (
                    <div className="mt-3 border-t border-white/10 pt-2.5 max-w-[320px]">
                      {m.mimeType?.startsWith('image/') ? (
                        <img src={`data:${m.mimeType};base64,${m.imageBytes}`} alt="uploaded attachment" className="rounded-lg w-full object-contain max-h-56 bg-black border border-white/10" />
                      ) : (
                        <div className="flex items-center gap-2.5 p-2 bg-black/40 border border-white/10 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center border border-indigo-500/20">
                            <svg className="w-4 h-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                          <span className="truncate text-xs font-bold text-gray-200">{m.fileName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {m.role === 'ai' && !m.isImage && (
                  <button 
                    onClick={() => playMessageTTS(displayContent, i)}
                    title="Speak this response"
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex-shrink-0 ${theme === 'light' ? 'border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900' : 'border-white/5 bg-[#141414] hover:bg-[#222] text-gray-400 hover:text-white'} ${playingMessageId === i ? 'animate-pulse text-purple-400 border-purple-500/40 bg-purple-950/20' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  </button>
                )}
              </div>

              {/* Related Follow-Up click questions cards */}
              {i === messages.length - 1 && m.role === 'ai' && parsed.questions.length > 0 && !isTyping && completedStreams[`${activeSessionId}_${i}`] && (
                <div className="flex flex-wrap gap-2 mt-3 max-w-[85%] animate-fade-in pl-1">
                  {parsed.questions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSendMessage(q)}
                      className={`text-xs px-3.5 py-2 rounded-xl transition-all shadow-md text-left cursor-pointer font-medium active:scale-95 animate-fade-in border ${
                        theme === 'light' 
                          ? 'bg-white hover:bg-gray-50 text-purple-650 border-purple-200 hover:border-purple-300' 
                          : 'bg-[#111] hover:bg-[#1a1a1a] text-purple-300 hover:text-white border border-[#a855f7]/15 hover:border-[#a855f7]/30'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isTyping && (
           <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">BLACKBELL</span>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm rounded-tl-sm border shadow-md flex gap-1 ${
              theme === 'light' ? 'bg-white text-gray-500 border-gray-200' : 'bg-[#1c1c1c] text-gray-400 border-white/5'
            }`}>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce delay-100" style={{animationDelay: '100ms'}}>.</span>
              <span className="animate-bounce delay-200" style={{animationDelay: '200ms'}}>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
           <div className="pt-4 pb-6 mt-auto">
        {/* Attachment selection preview pill */}
        {attachedFile && (
          <div className={`flex items-center gap-3 border p-2 px-3.5 rounded-xl mb-3.5 animate-fade-in ${
            theme === 'light' ? 'bg-white border-gray-200 text-gray-900 shadow-sm' : 'bg-[#111] border-white/5 text-white'
          }`}>
            {attachedFile.mimeType.startsWith('image/') ? (
              <img src={`data:${attachedFile.mimeType};base64,${attachedFile.base64}`} alt="preview" className="w-10 h-10 rounded-lg object-cover bg-black" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-indigo-900/40 border border-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold truncate ${theme === 'light' ? 'text-gray-950' : 'text-gray-200'}`}>{attachedFile.name}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{attachedFile.mimeType}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setAttachedFile(null)} 
              className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative group">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors cursor-pointer p-0.5 ${theme === 'light' ? 'text-gray-400 hover:text-[#5b3eff]' : 'text-gray-500 hover:text-white'}`}
            title="Upload photo or file (Gemini style)"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,text/*,application/json"
            className="hidden"
          />

          <input 
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') handleSendMessage() }}
            placeholder={attachedFile ? "Add a message or press enter to upload..." : "Type your message or ask Blackbell..."}
            className={`w-full border rounded-2xl py-4 pl-12 pr-14 outline-none transition-all text-sm ${
              theme === 'light' 
                ? 'bg-white hover:bg-gray-50/50 focus:bg-white text-gray-900 border-gray-200 focus:border-[#5b3eff]/30 placeholder-gray-400 shadow-sm' 
                : 'bg-[#111] hover:bg-[#151515] focus:bg-[#151515] text-white border-white/5 focus:border-white/10 placeholder-gray-600 shadow-lg'
            }`}
          />
          <button 
            onClick={handleSendMessage} 
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
              theme === 'light' 
                ? 'bg-purple-50 hover:bg-purple-100 text-[#5b3eff]' 
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
             <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Submit Feedback helper
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: currentUser?.email || 'anonymous@blackbell.ai',
          rating: feedbackRating,
          text: feedbackText
        })
      });
      if (res.ok) {
        setFeedbackText('');
        setIsFeedbackModalOpen(false);
        showToast("Success: Experience rating stored in database!");
        showAlert("Review Received!", "Danyavaad! Your feedback has been registered and is visible live inside the Admin Console Panel.");
        fetchAdminData();
      } else {
        const txt = await res.text();
        showAlert("Failed", txt || "Failed to post feedback.");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Unable to connect to backend server.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Submit Knowledge item helper
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeTitle || !knowledgeContent) return;
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser?.sessionToken || ''
        },
        body: JSON.stringify({
          adminEmail: currentUser?.email,
          title: knowledgeTitle,
          content: knowledgeContent
        })
      });
      if (res.ok) {
        setKnowledgeTitle('');
        setKnowledgeContent('');
        showToast("Success: New knowledge fact added to Blackbell!");
        fetchAdminData();
      } else {
        showToast("Error: Failed to save knowledge fact.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error: Connection failed.");
    }
  };

  // Submit System Settings config helper
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser?.sessionToken || ''
        },
        body: JSON.stringify({
          adminEmail: currentUser?.email,
          settings: {
            aiPersonality: settingsPersonality,
            modelName: settingsModel,
            maxDailyImages: settingsMaxImages
          }
        })
      });
      if (res.ok) {
        showToast("Success: Blackbell configurations updated!");
        fetchAdminData();
      } else {
        showToast("Error: Failed to save options.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error: Connection failed.");
    }
  };

  // Clear System Logs helper
  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to purge system error logs? This cannot be undone.")) return;
    try {
      const res = await fetch('/api/admin/logs/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser?.sessionToken || ''
        },
        body: JSON.stringify({ adminEmail: currentUser?.email })
      });
      if (res.ok) {
        showToast("Success: Error logs database cleared!");
        fetchAdminData();
      } else {
        showToast("Error: Failed to clear logs.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error: Connection failure.");
    }
  };

  // Run Smart Maintenance manually helper
  const handleRunMaintenance = async () => {
    if (!currentUser || currentUser.email !== 'sy5455977@gmail.com') return;
    setIsMaintenanceRunning(true);
    showToast("Starting Smart Auto Maintenance Engine background run...");
    try {
      const res = await fetch('/api/admin/maintenance/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': currentUser.sessionToken || ''
        },
        body: JSON.stringify({ adminEmail: currentUser.email })
      });
      if (res.ok) {
        showToast("Success: Smart Maintenance completed successfully!");
        fetchAdminData();
      } else {
        const errMsg = await res.text();
        console.error("Maintenance run failed:", errMsg);
        showToast(`Error: Maintenance failed - ${errMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Error: Connection failure or timeout.");
    } finally {
      setIsMaintenanceRunning(false);
    }
  };

  const renderAdminDashboard = () => {
    const filteredUsers = adminUsers.filter(u => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const email = String(u.email || '').toLowerCase();
      const username = String(u.username || '').toLowerCase();
      const id = String(u.id || '').toLowerCase();
      const password = String(u.password || '').toLowerCase();

      // Split search query by space into multiple search keywords
      const keywords = q.split(/\s+/).filter(Boolean);
      return keywords.every(kw =>
        email.includes(kw) ||
        username.includes(kw) ||
        id.includes(kw) ||
        password.includes(kw)
      );
    });

    const feedbacks = adminStats.userFeedback || [];
    const positiveCount = feedbacks.filter((f: any) => f.rating === 'positive').length;
    const neutralCount = feedbacks.filter((f: any) => f.rating === 'neutral').length;
    const negativeCount = feedbacks.filter((f: any) => f.rating === 'negative').length;
    const totalFeedback = feedbacks.length;

    // Feature Usage Percentages
    const features = adminStats.featureUsage || { textChat: 0, voiceChat: 0, imageGen: 0, fileUpload: 0, knowledgeSearch: 0 };
    const maxFeatureCount = Math.max(features.textChat, features.voiceChat, features.imageGen, features.fileUpload, 1);
    const sumFeatureCount = features.textChat + features.voiceChat + features.imageGen + features.fileUpload;

    const getPercentOfSum = (count: number) => {
      if (sumFeatureCount === 0) return 0;
      return Math.round((count / sumFeatureCount) * 100);
    };

    return (
      <div className="flex-1 flex flex-col lg:flex-row h-full bg-[#040612] text-gray-100 overflow-hidden font-sans">
        
        {/* Floating Toast Notification */}
        {adminToast && (
          <div className="fixed right-6 top-6 z-[9999] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-[0_4px_24px_rgba(124,58,237,0.3)] animate-fade-in border border-white/15 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{adminToast}</span>
          </div>
        )}

        {/* Left Side Navigation Sidebar - Hidden on Dashboard for Full Screen Width */}
        {adminTab !== 'dashboard' && (
          <aside className="w-full lg:w-68 bg-[#0a0d20] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-row lg:flex-col p-4.5 gap-2.5 flex-shrink-0 overflow-y-auto [scrollbar-width:thin] lg:overflow-x-visible select-none h-auto lg:h-full">
          
          {/* Header */}
          <div className="hidden lg:flex items-center gap-3 mb-6 px-1.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-emerald-600/20 flex items-center justify-center border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white tracking-widest uppercase leading-tight">AI Chatbot</h2>
              <p className="text-[9px] text-emerald-405 font-extrabold uppercase tracking-widest mt-0.5">Admin Panel</p>
            </div>
          </div>

          {/* Grouped Sidebar sections */}
          <div className="flex lg:flex-col gap-5 w-full">
            
            {/* ANALYTICS SECTION */}
            <div className="flex flex-col gap-1 w-full flex-shrink-0">
              <span className="hidden lg:block text-[9px] font-black tracking-widest uppercase text-gray-500 px-3 mb-1">Analytics</span>
              <button 
                onClick={() => setAdminTab('dashboard')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer leading-none ${adminTab === 'dashboard' ? 'bg-emerald-550/15 border border-emerald-500/20 text-emerald-450 font-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              
              <button 
                onClick={() => setAdminTab('dashboard')}
                className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button 
                onClick={() => setAdminTab('users')}
                className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Conversations</span>
              </button>

              <button 
                onClick={() => setAdminTab('users')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer leading-none ${adminTab === 'users' ? 'bg-emerald-550/15 border border-emerald-500/20 text-emerald-450 font-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users</span>
              </button>

              <button 
                onClick={() => setAdminTab('users')}
                className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Messages</span>
              </button>
            </div>

            {/* AI MANAGEMENT SECTION */}
            <div className="hidden lg:flex flex-col gap-1 w-full flex-shrink-0">
              <span className="text-[9px] font-black tracking-widest uppercase text-gray-500 px-3 mb-1">AI Management</span>
              <button 
                onClick={() => setAdminTab('knowledge')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer leading-none ${adminTab === 'knowledge' ? 'bg-emerald-550/15 border border-emerald-500/20 text-emerald-450 font-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Knowledge Base</span>
              </button>

              <button 
                onClick={() => setAdminTab('settings')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Train AI Model</span>
              </button>

              <button 
                onClick={() => setAdminTab('settings')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>AI Settings</span>
              </button>

              <button 
                onClick={() => setAdminTab('settings')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Features</span>
              </button>
            </div>

            {/* REPORTS LOGS SECTION */}
            <div className="flex lg:flex-col gap-1 w-full flex-shrink-0">
              <span className="hidden lg:block text-[9px] font-black tracking-widest uppercase text-gray-500 px-3 mb-1">Reports & Logs</span>
              
              <button 
                onClick={() => setAdminTab('dashboard')}
                className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Reports</span>
              </button>

              <button 
                onClick={handleClearLogs}
                className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Error Logs</span>
              </button>

              <button 
                onClick={() => setAdminTab('feedback')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer leading-none ${adminTab === 'feedback' ? 'bg-emerald-550/15 border border-emerald-500/20 text-emerald-450 font-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Feedback</span>
              </button>

              <button 
                onClick={handleClearLogs}
                className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>System Logs</span>
              </button>
            </div>

            {/* ADMINISTRATION SECTION */}
            <div className="hidden lg:flex flex-col gap-1 w-full flex-shrink-0">
              <span className="text-[9px] font-black tracking-widest uppercase text-gray-500 px-3 mb-1">Administration</span>
              <button 
                onClick={() => alert("Announce payload system operational! Ready to broadcast.")}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast</span>
              </button>

              <button 
                onClick={() => alert("Default user criteria set to Subscriber role.")}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-400 leading-none"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Roles & Permissions</span>
              </button>

              <button 
                onClick={() => setAdminTab('settings')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer leading-none ${adminTab === 'settings' ? 'bg-emerald-550/15 border border-emerald-500/20 text-emerald-450 font-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>

          </div>

          {/* System status details like in image */}
          <div className="hidden lg:flex flex-col gap-1 py-3 px-3.5 bg-emerald-950/10 border border-emerald-500/10 rounded-2xl mt-auto shadow-inner select-none font-sans">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase text-gray-400">System Status</span>
              <span className="flex items-center gap-1 text-[8.5px] text-emerald-400 font-bold">
                <CheckCircle className="w-3.5 h-3.5 inline text-emerald-400" /> Operational
              </span>
            </div>
            <p className="text-[9.5px] font-semibold text-gray-500 mt-0.5">All Systems Operational</p>
          </div>

          <div className="hidden lg:block mt-2 pt-2 select-none border-t border-white/5">
            <button 
              onClick={() => setViewMode('app')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 rounded-xl transition-all cursor-pointer border border-white/5 select-none"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin Panel</span>
            </button>
          </div>
        </aside>
        )}

        {/* Right main canvas area */}
        <main className="flex-1 flex flex-col h-full bg-[#050616] overflow-y-auto [scrollbar-width:thin] lg:[scrollbar-width:auto] p-4 lg:p-8">
          
          {/* Main Top Header bar - Hidden on Dashboard as it has its own custom high-fidelity header */}
          {adminTab !== 'dashboard' && (
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5 mb-6 gap-4">
            <div>
               <div className="flex items-center gap-2.5">
                 <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                   Ai Chatbot Admin Panel
                 </h1>
                 <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase select-none tracking-widest">
                   Operational
                 </span>
               </div>
               <p className="text-xs text-gray-400 mt-1">
                 {adminTab === 'dashboard' && "Welcome back, Admin! Real-time telemetry monitoring panel."}
                 {adminTab === 'users' && "Manage all registered user identities, password controls, and bans."}
                 {adminTab === 'feedback' && "Examine comments, ratings and user experiences recorded in database."}
                 {adminTab === 'knowledge' && "Inject facts and context instructions that the bot speaks directly to users."}
                 {adminTab === 'settings' && "Configure model parameter rules, speech parameters and personality details."}
               </p>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
               <span className="text-[10px] text-gray-500 font-mono select-none hidden md:inline-block">
                 UTC Time: {new Date().toLocaleTimeString()}
               </span>
               <button 
                 onClick={fetchAdminData}
                 title="Force telemetric sync recalculations"
                 className={`p-2.5 text-gray-400 hover:text-white bg-[#0e1124] border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isAdminLoading ? 'opacity-85' : ''}`}
               >
                 <RefreshCw className={`w-3.5 h-3.5 ${isAdminLoading ? 'animate-spin text-indigo-400' : ''}`} />
                 <span>{isAdminLoading ? 'Syncing...' : 'Sync Telemetry'}</span>
               </button>
            </div>
          </header>
          )}

          {/* TAB 1: DASHBOARD CONSOLE CARD */}
          {adminTab === 'dashboard' && (
            <AdminDashboardView
              adminStats={adminStats}
              adminUsers={adminUsers}
              setAdminTab={setAdminTab}
              fetchAdminData={fetchAdminData}
              isAdminLoading={isAdminLoading}
              handleClearLogs={handleClearLogs}
              setViewMode={setViewMode}
              handleRunMaintenance={handleRunMaintenance}
              isMaintenanceRunning={isMaintenanceRunning}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              currentUser={currentUser}
            />
          )}
          {false && adminTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Telemetry Numbers Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all shadow-md group">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Users Online Now</span>
                     <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,-185,129,0.7)] animate-pulse" />
                   </div>
                   <h3 className="text-2xl font-black text-white font-mono">{adminStats.onlineUsers}</h3>
                   <p className="text-[10px] text-gray-500 mt-1.5">Out of <span className="text-gray-300 font-bold font-mono">{adminStats.totalUsers}</span> total registered accounts</p>
                </div>

                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all shadow-md">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Messages Exchanged</span>
                     <MessageCircle className="w-4 h-4 text-purple-400" />
                   </div>
                   <h3 className="text-2xl font-black text-purple-300 font-mono">
                     {adminStats.totalMessages === 0 ? "0" : adminStats.totalMessages.toLocaleString()}
                   </h3>
                   <p className="text-[10px] text-gray-500 mt-1.5">Spread inside <span className="text-gray-300 font-bold font-mono">{adminStats.totalConversations}</span> active conversation logs</p>
                </div>

                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all shadow-md">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Response Speed</span>
                     <Activity className="w-4 h-4 text-yellow-400" />
                   </div>
                   <h3 className="text-2xl font-black text-yellow-400 font-mono">{adminStats.avgResponseTime}s</h3>
                   <p className="text-[10px] text-gray-500 mt-1.5">Real model race roundtrip latency measurements</p>
                </div>

                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all shadow-md">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Health Ratio</span>
                     <CheckCircle className="w-4 h-4 text-indigo-400" />
                   </div>
                   <h3 className="text-2xl font-black text-indigo-400 font-mono">{adminStats.aiHealthScore}%</h3>
                   <p className="text-[10px] text-gray-500 mt-1.5">Successful request execution rate vs socket drops</p>
                </div>
              </div>

              {/* Grid 1: Traffic Chart & Peak Usage */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Traffic Activity Graph */}
                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 shadow-md lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                     <span className="text-xs font-black text-gray-200 tracking-wider flex items-center gap-1.5 uppercase">
                       <BarChart3 className="w-4 h-4 text-indigo-400" /> User Traffic & Activity Charts
                     </span>
                     <div className="flex items-center gap-3 text-[10px] select-none font-semibold text-gray-400">
                       <span className="flex items-center gap-1.5">
                         <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm inline-block" /> Visits
                       </span>
                       <span className="flex items-center gap-1.5">
                         <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm inline-block" /> Chats Count
                       </span>
                     </div>
                  </div>

                  {adminStats.traffic && adminStats.traffic.length > 0 ? (
                    <div>
                      <div className="h-44 flex items-end justify-around gap-2 pt-2 pb-2">
                         {adminStats.traffic.slice(-6).map((e: any, i: number) => {
                           const maxVal = Math.max(...adminStats.traffic.map((t: any) => t.visits), 10);
                           const visitsPercent = (e.visits / maxVal) * 100;
                           const chatsPercent = (e.chatsCount / maxVal) * 100;

                           return (
                             <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                               {/* Hover Stats Window */}
                               <div className="absolute bottom-full mb-1 bg-[#101430] border border-white/10 text-[10px] text-gray-200 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap text-left shadow-2xl">
                                 <p className="font-bold border-b border-white/5 pb-1 mb-1 text-white">{e.date}</p>
                                 <p>Server Visits: <span className="text-indigo-400 font-bold font-mono">{e.visits}</span></p>
                                 <p>Conversations: <span className="text-purple-400 font-bold font-mono">{e.chatsCount}</span></p>
                                 <p>Uniques active: <span className="text-emerald-400 font-bold font-mono">{e.activeUsers?.length || 0}</span></p>
                               </div>

                               <div className="w-full flex items-end justify-center gap-1 h-full max-w-[32px]">
                                 <div 
                                   style={{ height: `${Math.max(6, visitsPercent)}%` }} 
                                   className="flex-1 bg-indigo-600 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-lg" 
                                 />
                                 <div 
                                   style={{ height: `${Math.max(4, chatsPercent)}%` }} 
                                   className="flex-1 bg-purple-500 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-lg" 
                                 />
                               </div>
                               <span className="text-[9px] text-gray-500 mt-2 font-mono whitespace-nowrap bg-white/5 px-1.5 py-0.5 rounded-md mt-1.5">{e.date.substring(5)}</span>
                             </div>
                           );
                         })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                       <p className="text-xs text-gray-500 font-medium">No Traffic Logs Available Yet</p>
                    </div>
                  )}
                </div>

                {/* Peak Usage & Diagnostcs Clock widget */}
                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 shadow-md flex flex-col justify-between">
                   <div className="border-b border-white/5 pb-4">
                     <span className="text-xs font-black text-gray-200 tracking-wider flex items-center gap-1.5 uppercase">
                       <Activity className="w-4 h-4 text-emerald-400" /> Peak Hours & Actions
                     </span>
                     <p className="text-[10px] text-gray-500 mt-1">Telemetry systems activity diagnostics state</p>
                   </div>

                   <div className="my-3 py-2 border-b border-white/[0.02]">
                     <div className="flex justify-between text-xs py-1.5">
                       <span className="text-gray-400">Database Engine Uptime:</span>
                       <span className="text-indigo-400 font-mono font-bold">100% Operational</span>
                     </div>
                     <div className="flex justify-between text-xs py-1.5">
                       <span className="text-gray-400">Returning Users rate:</span>
                       <span className="text-white font-mono font-bold">{adminStats.totalUsers > 0 ? Math.round((adminStats.returningUsers / adminStats.totalUsers) * 100) : 0}%</span>
                     </div>
                     <div className="flex justify-between text-xs py-1.5">
                       <span className="text-gray-400">Banned Accounts:</span>
                       <span className="text-red-500 font-mono font-bold">{adminStats.bannedUsers}</span>
                     </div>
                   </div>

                   <div>
                     <button 
                       onClick={handleClearLogs}
                       className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/15 hover:border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                     >
                       <AlertTriangle className="w-3.5 h-3.5" />
                       Purge Error Logs database
                     </button>
                   </div>
                </div>
              </div>

              {/* Grid 2: Top Asked dynamic questions & popularity layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Dynamic Top Asked Questions extracted from real User chats! */}
                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 shadow-md flex flex-col">
                   <div className="border-b border-white/5 pb-4 mb-4 select-none">
                     <span className="text-xs font-black text-gray-200 tracking-wider flex items-center gap-1.5 uppercase">
                       <MessageSquare className="w-4 h-4 text-purple-400" /> Dynamic Top Asked Questions
                     </span>
                     <p className="text-[10px] text-gray-500 mt-1">Parsed dynamically from real user chat messages ending on '?'</p>
                   </div>

                   <div className="flex-1 overflow-y-auto max-h-60 space-y-2 [scrollbar-width:thin] pr-1">
                     {adminStats.topAskedQuestions && adminStats.topAskedQuestions.length > 0 ? (
                       adminStats.topAskedQuestions.map((q: any, i: number) => (
                         <div key={i} className="flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 p-3 rounded-xl transition-all">
                            <span className="text-xs font-bold text-gray-300 pr-4 italic truncate max-w-[80%]">"{q.question}"</span>
                            <span className="px-2.5 py-1 bg-purple-900/10 text-purple-400 text-[10px] font-black tracking-widest rounded-lg border border-purple-500/15 font-mono">
                              {q.count} ASKED
                            </span>
                         </div>
                       ))
                     ) : (
                       <div className="h-full min-h-[160px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                         <p className="text-xs text-gray-500 font-bold">No active questions recorded yet</p>
                         <p className="text-[10px] text-gray-600 mt-1">Start chatting with Blackbell using '?' (Hinglish questions) to populate!</p>
                       </div>
                     )}
                   </div>
                </div>

                {/* Popularity ranking */}
                <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 shadow-md flex flex-col">
                   <div className="border-b border-white/5 pb-4 mb-4 select-none">
                     <span className="text-xs font-black text-gray-200 tracking-wider flex items-center gap-1.5 uppercase">
                       <Layers className="w-4 h-4 text-emerald-400" /> Interactive Feature Popularity
                     </span>
                     <p className="text-[10px] text-gray-500 mt-1">Calculated ratio from actual live clicks and clicks logs</p>
                   </div>

                   <div className="flex-1 space-y-3 justify-center flex flex-col">
                     <div>
                       <div className="flex justify-between text-xs font-bold text-gray-400 mb-1.5">
                         <span>Text Chat Capability</span>
                         <span className="text-indigo-400 font-mono font-bold">{features.textChat} clicks ({getPercentOfSum(features.textChat)}%)</span>
                       </div>
                       <div className="w-full bg-[#161a3c]/35 rounded-full h-2 overflow-hidden border border-white/[0.02]">
                         <div style={{ width: `${getPercentOfSum(features.textChat)}%` }} className="bg-indigo-500 h-full rounded-full transition-all duration-500" />
                       </div>
                     </div>

                     <div>
                       <div className="flex justify-between text-xs font-bold text-gray-400 mb-1.5">
                         <span>Voice Chat Capability</span>
                         <span className="text-emerald-400 font-mono font-bold">{features.voiceChat} clicks ({getPercentOfSum(features.voiceChat)}%)</span>
                       </div>
                       <div className="w-full bg-[#161a3c]/35 rounded-full h-2 overflow-hidden border border-white/[0.02]">
                         <div style={{ width: `${getPercentOfSum(features.voiceChat)}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-500" />
                       </div>
                     </div>

                     <div>
                       <div className="flex justify-between text-xs font-bold text-gray-400 mb-1.5">
                         <span>AI Image Generation</span>
                         <span className="text-purple-400 font-mono font-bold">{features.imageGen} clicks ({getPercentOfSum(features.imageGen)}%)</span>
                       </div>
                       <div className="w-full bg-[#161a3c]/35 rounded-full h-2 overflow-hidden border border-white/[0.02]">
                         <div style={{ width: `${getPercentOfSum(features.imageGen)}%` }} className="bg-purple-500 h-full rounded-full transition-all duration-500" />
                       </div>
                     </div>

                     <div>
                       <div className="flex justify-between text-xs font-bold text-gray-400 mb-1.5">
                         <span>Multimodal File Upload</span>
                         <span className="text-yellow-400 font-mono font-bold">{features.fileUpload} clicks ({getPercentOfSum(features.fileUpload)}%)</span>
                       </div>
                       <div className="w-full bg-[#161a3c]/35 rounded-full h-2 overflow-hidden border border-white/[0.02]">
                         <div style={{ width: `${getPercentOfSum(features.fileUpload)}%` }} className="bg-yellow-500 h-full rounded-full transition-all duration-500" />
                       </div>
                     </div>
                   </div>
                </div>

              </div>

              {/* Error Logs Console */}
              <div className="bg-[#0b0e24] rounded-2xl p-5 border border-white/5 shadow-md">
                 <div className="border-b border-white/5 pb-4 mb-4 flex items-center justify-between">
                   <div>
                     <span className="text-xs font-black text-gray-200 tracking-wider flex items-center gap-1.5 uppercase">
                       <AlertCircle className="w-4 h-4 text-red-500" /> Live Exception & Error Logs
                     </span>
                     <p className="text-[10px] text-gray-500 mt-1">Real-time captured network and backend server exception threads</p>
                   </div>
                   {adminStats.errorLogs && adminStats.errorLogs.length > 0 && (
                     <button 
                       onClick={handleClearLogs}
                       className="px-2.5 py-1.5 bg-red-950/25 hover:bg-red-950/40 border border-red-500/15 text-red-400 hover:text-red-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                     >
                       Flush logs
                     </button>
                   )}
                 </div>

                 <div className="overflow-y-auto max-h-48 space-y-1.5 [scrollbar-width:thin] pr-1 bg-[#060817] p-3 rounded-xl border border-white/5">
                   {adminStats.errorLogs && adminStats.errorLogs.length > 0 ? (
                     [...adminStats.errorLogs].reverse().map((err: any, i: number) => (
                       <div key={i} className="flex flex-col md:flex-row text-[11px] py-1 text-gray-400 hover:text-gray-200 border-b border-white/[0.02] last:border-0 pb-1 gap-2 md:gap-5 font-mono select-all">
                          <span className="text-red-500 font-bold whitespace-nowrap">[{new Date(err.timestamp).toLocaleTimeString()}]</span>
                          <span className="text-yellow-500/80 font-bold uppercase whitespace-nowrap">[{err.type}]</span>
                          <span className="break-all">{err.message}</span>
                       </div>
                     ))
                   ) : (
                     <div className="h-20 flex items-center justify-center text-xs text-gray-500 font-bold">
                       Exception list is clean! 0 errors recorded.
                     </div>
                   )}
                 </div>
              </div>

            </div>
          )}

          {/* TAB 2: DETAILED USERS LIST */}
          {adminTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              {/* Filter / Search tool */}
              <div className="relative">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Query users by username, email address, password value..."
                  className="w-full bg-[#0b0e24] border border-white/5 focus:border-[#5b3eff]/30 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-md focus:shadow-[0_0_15px_rgba(91,62,255,0.1)]"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>

              {/* Grid database of users */}
              <div className="bg-[#0b0e24] rounded-2xl border border-white/5 overflow-hidden shadow-lg w-full">
                <div className="p-4 border-b border-white/5 bg-[#0f122e] flex items-center justify-between">
                  <h2 className="text-xs font-black text-gray-200 uppercase tracking-widest flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-400" /> Users Table ({filteredUsers.length} matches)
                  </h2>
                </div>

                <div className="overflow-x-auto w-full [scrollbar-width:thin]">
                  <table className="w-full min-w-[950px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black tracking-widest text-gray-500 uppercase bg-[#07091a] select-none">
                        <th className="py-4 px-6">USER IDENTITY</th>
                        <th className="py-4 px-6">EMAIL CONTROL</th>
                        <th className="py-4 px-6">CREDENTIAL DISPLAY</th>
                        <th className="py-4 px-6">SOCKET</th>
                        <th className="py-4 px-6">TELEMETRY SEEN</th>
                        <th className="py-4 px-6">LOGGED ACTIVE DURATION</th>
                        <th className="py-4 px-6 text-right">SYSTEM ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user: any) => {
                          const isUserAdmin = user.email === 'sy5455977@gmail.com';
                          const activeRelative = getRelativeTime(user.lastPing);

                          return (
                            <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-[#131737] text-indigo-400 border border-white/5 flex items-center justify-center font-bold text-xs uppercase select-none font-mono">
                                    {user.username ? user.username.charAt(0) : '?'}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1">
                                      @{user.username || 'user'}
                                      {isUserAdmin && (
                                        <Shield className="w-3 h-3 text-yellow-500 fill-yellow-500/20" />
                                      )}
                                    </p>
                                    <p className="text-[10px] text-gray-500">ID: {user.id.substring(0, 8)}...</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-6 font-mono text-xs select-all">
                                {user.email}
                              </td>

                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <span className="bg-[#06081c] border border-white/5 text-gray-400 px-2 py-1 rounded-md font-mono text-[11px] select-all shadow-sm">
                                    {showPassword[user.id] ? (user.password || '••••••••') : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePasswordVisibility(user.id)}
                                    className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {showPassword[user.id] ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              <td className="py-4 px-6 select-none">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full inline-block ${user.online ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-600'}`} />
                                  <span className={`text-[11px] font-bold ${user.online ? 'text-emerald-400' : 'text-gray-500'}`}>
                                    {user.online ? 'ONLINE' : 'OFFLINE'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-6 text-gray-400 font-medium font-mono text-[10px]">
                                {user.online ? 'ACTIVE NOW' : activeRelative.toUpperCase()}
                              </td>

                              <td className="py-4 px-6 font-mono text-gray-400">
                                {formatDuration(user.activeDuration)}
                              </td>

                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <button
                                    onClick={() => {
                                      setSelectedUserChats(user);
                                      setSelectedSessionIndex(0);
                                    }}
                                    className="px-3 py-1.5 bg-[#4f46e5]/10 hover:bg-[#4f46e5] border border-[#4f46e5]/20 text-indigo-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm select-none"
                                  >
                                    View Chats
                                  </button>
                                  {isUserAdmin ? (
                                    <span className="text-[10px] font-black tracking-widest text-yellow-500 flex items-center gap-1 select-none uppercase">
                                      Owner
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => handleToggleBan(user.id, user.isBanned)}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        user.isBanned 
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
                                          : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25'
                                      }`}
                                    >
                                      {user.isBanned ? 'Unban' : 'Ban'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 font-bold">
                            No Registered Accounts Found Matching Search Query
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* USER CHAT LOGS VIEWER OVERLAY MODAL */}
          {selectedUserChats && (() => {
            let sessionsList: any[] = [];
            if (selectedUserChats.sessions) {
              try {
                sessionsList = typeof selectedUserChats.sessions === 'string' 
                  ? JSON.parse(selectedUserChats.sessions) 
                  : selectedUserChats.sessions;
              } catch (e) {
                sessionsList = [];
              }
            }

            const currentSession = sessionsList[selectedSessionIndex] || null;
            const messages = currentSession?.messages || [];

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                <div className="w-full max-w-4xl h-[85vh] bg-[#090d19] border border-white/[0.08] rounded-2xl flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                  
                  {/* Modal Header */}
                  <div className="p-4 border-b border-white/[0.06] bg-[#0c1125] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        💬 Conversational Log: @{selectedUserChats.username || selectedUserChats.email}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{selectedUserChats.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedUserChats(null)}
                      className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Close Viewer
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Sessions List */}
                    <div className="w-1/3 border-r border-white/[0.06] bg-[#04060c] p-3 overflow-y-auto space-y-2 [scrollbar-width:thin]">
                      <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2 px-1">Chat Sessions</h4>
                      {sessionsList.length > 0 ? (
                        sessionsList.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedSessionIndex(idx)}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                              selectedSessionIndex === idx
                                ? 'bg-indigo-600/15 border-indigo-500/30 text-white'
                                : 'bg-[#090d19]/50 border-white/[0.03] text-gray-400 hover:bg-[#090d19] hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-bold truncate block">{s.name || `Session ${idx + 1}`}</span>
                            <span className="text-[9px] font-mono text-gray-500">
                              {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : 'N/A'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic p-4 text-center">No recorded active sessions.</p>
                      )}
                    </div>

                    {/* Right Panel: Messages Stream */}
                    <div className="flex-1 bg-[#020306] flex flex-col overflow-hidden">
                      <div className="p-3 border-b border-white/[0.04] bg-[#04060c] flex justify-between items-center select-none">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          {currentSession ? (currentSession.name || 'Active Session') : 'Session Messages'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 font-bold bg-[#0a0f24] px-1.5 py-0.5 rounded border border-white/[0.02]">
                          {messages.length} messages
                        </span>
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto space-y-4 [scrollbar-width:thin]">
                        {messages.length > 0 ? (
                          messages.map((m: any, mIdx: number) => {
                            const isUser = m.role === 'user';
                            return (
                              <div
                                key={mIdx}
                                className={`flex flex-col max-w-[85%] ${
                                  isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                                }`}
                              >
                                <span className="text-[9px] text-gray-500 font-mono font-bold mb-1 uppercase">
                                  {isUser ? 'User' : 'Blackbell Companion'}
                                </span>
                                <div
                                  className={`p-3 rounded-2xl text-xs font-medium leading-relaxed font-sans ${
                                    isUser
                                      ? 'bg-[#4f46e5] text-white rounded-tr-none shadow-[0_4px_12px_rgba(79,70,229,0.15)]'
                                      : 'bg-[#0c1125] border border-white/[0.05] text-gray-200 rounded-tl-none'
                                  }`}
                                >
                                  {m.isAttachment && (
                                    <div className="mb-2 p-2 bg-black/40 rounded-lg flex items-center gap-2 border border-white/5 select-none">
                                      <span className="text-[10px] font-mono text-[#4f46e5] font-bold uppercase">📎 FILE</span>
                                      <span className="text-[10px] text-gray-400 truncate max-w-xs">{m.attachmentName || 'Attachment'}</span>
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap select-text">{m.content}</p>
                                </div>
                                {m.timestamp && (
                                  <span className="text-[8px] text-gray-600 font-mono mt-1">
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
                            <span className="text-3xl mb-2">💬</span>
                            <p className="text-xs text-gray-500 italic">Select a session on the left to inspect conversation transcript.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 3: USER FEEDBACK & COMMENTS */}
          {adminTab === 'feedback' && (
            <div className="space-y-6 animate-fade-in">
              {/* Sentiment Card Statistics bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0b0e24] p-5 rounded-2xl border border-white/5 shadow-md">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Reviews</p>
                  <h3 className="text-3xl font-black mt-1 text-white font-mono">{totalFeedback}</h3>
                </div>
                <div className="bg-[#0b0e24] p-5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Positive (Sweet)</p>
                    <h3 className="text-3xl font-black mt-1 text-emerald-400 font-mono">{positiveCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                    {totalFeedback > 0 ? Math.round((positiveCount/totalFeedback)*100) : 0}%
                  </div>
                </div>
                <div className="bg-[#0b0e24] p-5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Neutral (Normal)</p>
                    <h3 className="text-3xl font-black mt-1 text-indigo-400 font-mono">{neutralCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono font-bold text-xs">
                    {totalFeedback > 0 ? Math.round((neutralCount/totalFeedback)*100) : 0}%
                  </div>
                </div>
                <div className="bg-[#0b0e24] p-5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Negative (Gussa)</p>
                    <h3 className="text-3xl font-black mt-1 text-red-400 font-mono">{negativeCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono font-bold text-xs">
                    {totalFeedback > 0 ? Math.round((negativeCount/totalFeedback)*100) : 0}%
                  </div>
                </div>
              </div>

              {/* Feedbacks list */}
              <div className="bg-[#0b0e24] rounded-2xl border border-white/5 p-5 shadow-lg space-y-4">
                 <h3 className="text-xs font-black text-gray-200 uppercase tracking-widest border-b border-white/5 pb-3 flex items-center gap-2">
                   <ThumbsUp className="w-4 h-4 text-indigo-400" /> Recent User Experience Log Submissions
                 </h3>

                 <div className="space-y-3.5 max-h-[450px] overflow-y-auto [scrollbar-width:thin] pr-1">
                   {feedbacks.length > 0 ? (
                     [...feedbacks].reverse().map((fb: any, i: number) => (
                       <div key={i} className="p-4 bg-[#060818]/60 border border-white/5 hover:border-white/10 rounded-2xl transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/[0.03] pb-2 mb-2">
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-indigo-400 font-bold">{fb.email}</span>
                               <span className="text-[10px] text-gray-600 font-mono">{new Date(fb.createdAt).toLocaleString()}</span>
                             </div>
                             
                             <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase border inline-block select-none ${
                               fb.rating === 'positive' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                               fb.rating === 'neutral' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' :
                               'bg-red-500/10 border-red-500/25 text-red-500'
                             }`}>
                               {fb.rating}
                             </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed italic select-text">"{fb.text}"</p>
                       </div>
                     ))
                   ) : (
                     <div className="h-44 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">No User Feedback Collected Yet</p>
                        <p className="text-[11px] text-gray-600 mt-1">Users can submit feedback directly from their chat sidebar.</p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          )}

          {/* TAB 4: KNOWLEDGE BASE FACT ITEMS */}
          {adminTab === 'knowledge' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              
              {/* Form loader */}
              <div className="bg-[#0b0e24] rounded-2xl border border-white/5 p-5 shadow-lg flex flex-col gap-4 self-start">
                 <div>
                    <h3 className="text-xs font-black text-gray-200 uppercase tracking-widest flex items-center gap-1.5">
                      <Plus className="w-4.5 h-4.5 text-indigo-400" /> Create Knowledge Fact
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1">Inject facts which the chatbot accesses dynamically during user conversations.</p>
                 </div>

                 <form onSubmit={handleAddKnowledge} className="space-y-4">
                   <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Fact Title / Concept</label>
                     <input 
                       type="text"
                       required
                       value={knowledgeTitle}
                       onChange={e => setKnowledgeTitle(e.target.value)}
                       placeholder="e.g. Mahabharat Gyan, System personality"
                       className="w-full bg-[#060818] border border-white/5 hover:border-white/10 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all shadow-inner"
                     />
                   </div>

                   <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Core Content Details</label>
                     <textarea 
                       required
                       rows={5}
                       value={knowledgeContent}
                       onChange={e => setKnowledgeContent(e.target.value)}
                       placeholder="Write custom context parameters, definitions, lore or details. Keep it clear and literal under 400 characters."
                       className="w-full bg-[#060818] border border-white/5 hover:border-white/10 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all shadow-inner resize-none leading-relaxed"
                     />
                   </div>

                   <button 
                     type="submit"
                     className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer text-center select-none"
                   >
                     Deploy Fact to Blackbell
                   </button>
                 </form>
              </div>

              {/* Created Facts collection log */}
              <div className="bg-[#0b0e24] p-5 rounded-2xl border border-white/5 shadow-lg lg:col-span-2 flex flex-col gap-4">
                 <div>
                    <h3 className="text-xs font-black text-gray-200 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-400" /> Deployed Fact Articles
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1">A directory of all injected knowledge pieces currently active globally.</p>
                 </div>

                 <div className="space-y-3.5 max-h-[430px] overflow-y-auto [scrollbar-width:thin] pr-1">
                   {adminStats.knowledgeList && adminStats.knowledgeList.length > 0 ? (
                     [...adminStats.knowledgeList].reverse().map((fact: any, i: number) => (
                       <div key={i} className="p-4 bg-[#060818]/70 border border-white/5 hover:border-white/10 rounded-2xl transition-all">
                          <div className="flex justify-between items-center border-b border-white/[0.03] pb-2 mb-2 font-mono">
                             <span className="text-xs font-bold text-white uppercase">{fact.title}</span>
                             <span className="text-[9px] text-gray-650">{new Date(fact.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-400 select-text leading-relaxed">{fact.content}</p>
                       </div>
                     ))
                   ) : (
                     <div className="h-44 flex items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01] text-xs text-gray-500 font-bold">
                       Knowledge Base is empty. Enter a custom fact to deploy!
                     </div>
                   )}
                 </div>
              </div>

            </div>
          )}

          {/* TAB 5: SYSTEM AND AI MODEL CONFIGURATIONS */}
          {adminTab === 'settings' && (
            <div className="max-w-2xl bg-[#0b0e24] rounded-2xl border border-white/5 p-6 shadow-xl animate-fade-in space-y-6">
              <div>
                 <h3 className="text-xs font-black text-gray-200 uppercase tracking-widest flex items-center gap-1.5">
                   <Settings className="w-4.5 h-4.5 text-indigo-400" /> System Model Configuration Suite
                 </h3>
                 <p className="text-[10px] text-gray-500 mt-1">Enforce limits, voice speech genders, model aliases and personality matrices.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Active Companion Personality Matrix</label>
                   <input 
                     type="text"
                     required
                     value={settingsPersonality}
                     onChange={e => setSettingsPersonality(e.target.value)}
                     placeholder="e.g. Charming flirty Girlfriend, scolding logic helper"
                     className="w-full bg-[#060818] border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs text-white outline-none transition-all"
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">AI Engine LLM Speed Choice</label>
                     <select 
                       value={settingsModel}
                       onChange={e => setSettingsModel(e.target.value)}
                       className="w-full bg-[#060818] border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs text-white outline-none transition-all cursor-pointer"
                     >
                       <option value="gemini-3.5-flash">Gemini 3.5 Flash (Ultralight, instant)</option>
                       <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Hinglish hyper-response speed)</option>
                     </select>
                  </div>

                  <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Max Daily Photos / Image limit</label>
                     <input 
                       type="number"
                       required
                       min={1}
                       max={100}
                       value={settingsMaxImages}
                       onChange={e => setSettingsMaxImages(Number(e.target.value))}
                       className="w-full bg-[#060818] border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs text-white outline-none transition-all"
                     />
                  </div>
                </div>

                <div className="pt-2">
                   <button 
                     type="submit"
                     className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer select-none text-center"
                   >
                     Update blackbell system criteria
                   </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>
    );
  };

  return (
    <div className={`flex h-[100dvh] font-sans overflow-hidden ${theme === 'light' ? 'bg-[#f9fafb] text-gray-900 border-gray-200' : 'bg-[#050505] text-white'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${theme === 'light' ? 'bg-white border-r border-gray-200 text-gray-900 shadow-sm' : 'bg-[#09090b] border-r border-white/5 text-white'}`}> 
        <div className="flex items-center justify-between p-4 pl-6">
           <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded flex items-center justify-center border ${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-white/10 border-white/10'}`}>
                 <span className={`text-xs font-serif font-bold ${theme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>B</span>
              </div>
              <h1 className="font-bold tracking-widest text-sm uppercase">Blackbell AGI</h1>
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:bg-white/5 rounded-lg transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>

        {/* Top sidebar area with dynamic admin toggle button placed exactly where requested */}
        <div className="px-4 mt-2">
           {currentUser?.email === 'sy5455977@gmail.com' && (
              <button 
                onClick={() => {
                  setViewMode(viewMode === 'admin' ? 'app' : 'admin');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-bold ${
                  viewMode === 'admin' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/35 shadow-md' 
                    : 'bg-purple-900/15 border border-purple-500/20 text-purple-400 hover:bg-purple-900/25'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin Panel</span>
              </button>
           )}
           
           <button onClick={handleNewSession} className={`w-full flex items-center gap-3 mt-4 px-4 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${theme === 'light' ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-950' : 'bg-[#111] hover:bg-[#1a1a1a] border-white/5 text-white'}`}>
             <Plus className="w-4 h-4" />
             New Session
           </button>
           
           <div className={`flex items-center mt-4 p-1 rounded-xl border ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#111] border-white/5'}`}>
             <button onClick={() => setMode('text')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-colors ${mode === 'text' ? (theme === 'light' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'bg-[#1a1a1a] text-white shadow-sm') : 'text-gray-500 hover:text-gray-300'}`}>
               <Terminal className="w-3.5 h-3.5" /> TEXT
             </button>
             <button onClick={() => setMode('voice')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-colors ${mode === 'voice' ? (theme === 'light' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'bg-[#1a1a1a] text-white shadow-sm') : 'text-gray-500 hover:text-gray-300'}`}>
               <Mic className="w-3.5 h-3.5" /> VOICE
             </button>
           </div>

           {/* AI Learned Memories Panel */}
           {/* AI Learned Memories Panel hidden as requested */}
           {false && memories.length > 0 && (
             <div className="mt-6 border-t border-white/[0.03] pt-4">
               <div className="flex items-center gap-1.5 mb-2 px-1 text-purple-400 font-bold uppercase tracking-widest text-[10px]">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v14"/></svg>
                 <span>Learned Memories ({memories.length})</span>
               </div>
               <div className="bg-[#111425]/35 border border-[#a855f7]/15 p-3 rounded-xl max-h-36 overflow-y-auto space-y-2 [scrollbar-width:thin] text-[11px] font-medium leading-relaxed">
                 {memories.map((m, idx) => (
                   <div key={idx} className="flex gap-1.5 text-gray-400 border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0">
                     <span className="text-purple-400 font-mono select-none">•</span>
                     <span>{m}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

        <div className="flex-1 mt-6 overflow-y-auto px-2 space-y-1 pb-4">
           {sessions.map((s) => {
             let touchTimeout = null;

             const handleTouchStart = (e) => {
               if (renamingSessionId) return;
               const x = e.touches ? e.touches[0].clientX : e.clientX;
               const y = e.touches ? e.touches[0].clientY : e.clientY;
               touchTimeout = setTimeout(() => {
                 setActiveContextMenu({ id: s.id, x, y });
               }, 600);
             };

             const handleTouchEnd = () => {
               if (touchTimeout) {
                 clearTimeout(touchTimeout);
                 touchTimeout = null;
               }
             };

             const saveRename = (sId) => {
               if (!renameValue.trim()) return;
               setSessions(prev => prev.map(item => {
                 if (item.id === sId) {
                   return { ...item, title: renameValue.trim(), updatedAt: Date.now() };
                 }
                 return item;
               }));
               setRenamingSessionId(null);
             };

             return (
               <div key={s.id} className="relative group overflow-visible">
                 {renamingSessionId === s.id ? (
                   <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-lg border border-purple-500/25">
                     <input 
                       type="text"
                       value={renameValue}
                       onChange={e => setRenameValue(e.target.value)}
                       onKeyDown={e => {
                         if (e.key === 'Enter') saveRename(s.id);
                         if (e.key === 'Escape') setRenamingSessionId(null);
                       }}
                       className="bg-transparent text-xs text-white border-none outline-none w-full p-0 focus:ring-0 focus:outline-none focus:border-none"
                       autoFocus
                     />
                     <button 
                       onClick={() => saveRename(s.id)}
                       className="p-1 hover:bg-white/10 rounded text-emerald-400 cursor-pointer"
                     >
                       <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                     </button>
                     <button 
                       onClick={() => setRenamingSessionId(null)}
                       className="p-1 hover:bg-white/10 rounded text-red-400 cursor-pointer"
                     >
                       <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                     </button>
                   </div>
                 ) : (
                   <div 
                     role="button"
                     tabIndex={0}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' || e.key === ' ') {
                         setActiveSessionId(s.id);
                         setIsSidebarOpen(false);
                         setViewMode('app');
                       }
                     }}
                     className={`w-full flex items-center justify-between pl-3.5 pr-2.5 py-3 rounded-xl text-xs transition-all text-left font-bold border cursor-pointer outline-none ${
                       s.id === activeSessionId && viewMode === 'app'
                         ? 'bg-purple-950/20 text-purple-400 border-purple-500/25 shadow-lg shadow-purple-900/[0.04]' 
                         : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border-transparent'
                     }`}
                     onMouseDown={handleTouchStart}
                     onMouseUp={handleTouchEnd}
                     onMouseLeave={handleTouchEnd}
                     onTouchStart={handleTouchStart}
                     onTouchEnd={handleTouchEnd}
                     onContextMenu={(e) => {
                       e.preventDefault();
                       setActiveContextMenu({ id: s.id, x: e.clientX, y: e.clientY });
                     }}
                     onClick={() => {
                       setActiveSessionId(s.id);
                       setIsSidebarOpen(false);
                       setViewMode('app');
                     }}
                   >
                     <div className="flex items-center gap-2.5 truncate max-w-[210px] select-none">
                       <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-40 group-hover:opacity-65" />
                       <span className="truncate pr-1">{s.title}</span>
                       {s.isPinned && (
                         <span className="text-[10px]" title="Pinned (Can't be auto-deleted)">📌</span>
                       )}
                     </div>
                     
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           const rect = e.currentTarget.getBoundingClientRect();
                           setActiveContextMenu({ id: s.id, x: rect.left, y: rect.bottom + 5 });
                         }}
                         className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-100 cursor-pointer"
                         title="Options"
                       >
                         <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                       </button>
                     </div>
                   </div>
                 )}
               </div>
             );
           })}
        
        </div>
        
        <div className={`p-4 border-t flex items-center justify-between gap-1.5 ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#09090b]'}`}>
          <button 
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${theme === 'light' ? 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          </button>

          <button 
            type="button"
            onClick={() => setIsFeedbackModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${theme === 'light' ? 'bg-[#5b3eff]/5 border-[#5b3eff]/15 text-[#5b3eff] hover:bg-[#5b3eff]/10' : 'bg-purple-500/10 border-purple-500/15 text-purple-400 hover:bg-purple-500/20'}`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>

          <button 
            type="button"
            onClick={handlePurgeSessions} 
            className={`text-xs font-bold px-2 py-1.5 rounded transition-colors tracking-widest uppercase cursor-pointer ${theme === 'light' ? 'text-red-650 hover:bg-red-50' : 'text-red-500 hover:bg-red-500/10'}`}
          >
            Purge
          </button>
        </div>
      </aside>

      {/* Main Screen Stage */}
      <div className={`flex-1 flex flex-col min-w-0 relative h-full ${theme === 'light' ? 'bg-[#f3f4f6]' : 'bg-[#050505]'}`}>
         {/* Mobile UI Overlay */}
         {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
         
         {viewMode === 'admin' ? (
           renderAdminDashboard()
         ) : (
           <>
             <header className={`flex justify-between items-center p-4 md:px-8 border-b ${theme === 'light' ? 'bg-white border-gray-200/60 text-gray-900 shadow-sm' : 'bg-[#050505] border-white/5 text-white'}`}><div className="flex items-center gap-2">
               <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg md:hidden transition-colors">
                 <Menu className="w-6 h-6" />
               </button>
               <div style={{display: 'none'}}></div>
                  <button 
                    onClick={() => {
                      setAutoSpeak(!autoSpeak);
                      try {
                        if (!outputAudioCtxRef.current) {
                          outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
                         }
                         if (outputAudioCtxRef.current.state === 'suspended') {
                           outputAudioCtxRef.current.resume();
                         }
                       } catch (e) {
                         console.warn("Failed audio pre-init on speak toggle:", e);
                       }
                    }}
                    title={autoSpeak ? "Disable Auto Read Aloud" : "Enable Auto Read Aloud"}
                    className={`p-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                      autoSpeak 
                        ? 'bg-purple-950/30 border-purple-500/30 text-purple-400 font-bold shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-pulse' 
                        : theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-500 hover:text-gray-900' : 'bg-[#111] hover:bg-[#181818] border-white/5 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {autoSpeak ? (
                      <Mic className="w-4 h-4 text-purple-400" />
                    ) : (
                      <MicOff className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-[10px] uppercase tracking-wider font-bold select-none pr-1 hidden sm:inline-block">
                      {autoSpeak ? "Speak ON" : "Speak OFF"}
                    </span>
                  </button>
                </div>
                <div className="hidden md:block"></div>
               <button 
                 onClick={handleLogout}
                 className="flex items-center gap-2 px-4 py-2 border border-purple-500/30 bg-purple-500/10 rounded-full text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-colors tracking-widest ml-auto cursor-pointer"
               >
                 <LogOut className="w-3.5 h-3.5" />
                 {currentUser?.username?.toUpperCase() || 'SACHIN'}
               </button>
             </header>

             {announcement && (
               <div className={`mx-4 md:mx-8 mt-4 p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-md transition-all duration-300 ${
                 theme === 'light' 
                   ? 'bg-purple-50 border-purple-200 text-purple-950' 
                   : 'bg-[#0b0c16] border-purple-500/25 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.05)]'
               }`}>
                 <div className="flex items-center gap-2.5 min-w-0">
                   <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0">
                     <Megaphone className="w-4 h-4 animate-bounce" />
                   </div>
                   <p className="text-xs font-semibold leading-relaxed truncate select-text">
                     <span className="font-extrabold tracking-wider uppercase text-[9px] mr-2 px-1.5 py-0.5 rounded bg-purple-500/20">Broadcast:</span>
                     {announcement}
                   </p>
                 </div>
                 <button 
                   onClick={() => {
                     setDismissedAnnouncement(announcement);
                     setAnnouncement('');
                   }}
                   className="p-1 hover:bg-purple-500/10 rounded-lg text-purple-400 transition-colors cursor-pointer flex-shrink-0 font-bold"
                   title="Dismiss"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>
             )}

             {mode === 'voice' && renderVoiceUI()}
             {mode === 'text' && renderTextUI()}
            </>
          )}
      </div>

      {/* Floating ChatGPT Style Actions Menu Triggered by Context-Menu or Long Press */}
      {activeContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[999] bg-transparent font-sans" 
            onClick={() => setActiveContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setActiveContextMenu(null); }}
          />
          <div 
            style={{ 
              position: 'fixed', 
              top: Math.min(activeContextMenu.y, window.innerHeight - 200),
              left: Math.min(activeContextMenu.x, window.innerWidth - 180), 
            }}
            className={`border rounded-xl p-1 z-[1000] shadow-2xl min-w-[160px] animate-fade-in font-sans ${theme === 'light' ? 'bg-white border-gray-200 text-gray-900 shadow-xl' : 'bg-[#121214] border-white/10 text-white'}`}
          >
            <button 
              onClick={() => {
                const s = sessions.find(item => item.id === activeContextMenu.id);
                if (s) {
                  setSessions(prev => {
                    if (s.isPinned) {
                      const updated = prev.map(item => item.id === s.id ? { ...item, isPinned: false } : item);
                      return sortSessions(updated);
                    } else {
                      const pinnedCount = prev.filter(item => item.isPinned).length;
                      if (pinnedCount >= 5) {
                        showAlert("Pin Limit Reached", "You can pin a maximum of 5 sessions. Please unpin another session first.");
                        return prev;
                      }
                      const updated = prev.map(item => item.id === s.id ? { ...item, isPinned: true } : item);
                      return sortSessions(updated);
                    }
                  });
                }
                setActiveContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors text-left cursor-pointer ${theme === 'light' ? 'text-gray-700 hover:text-gray-950 hover:bg-gray-100' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              <svg className="w-3.5 h-3.5 text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{sessions.find(s => s.id === activeContextMenu.id)?.isPinned ? 'Unpin Session' : 'Pin Session'}</span>
            </button>
            <button 
              onClick={() => {
                const s = sessions.find(item => item.id === activeContextMenu.id);
                if (s) {
                  setRenamingSessionId(s.id);
                  setRenameValue(s.title);
                }
                setActiveContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors text-left cursor-pointer ${theme === 'light' ? 'text-gray-700 hover:text-gray-950 hover:bg-gray-100' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              <svg className="w-3.5 h-3.5 text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Rename Title</span>
            </button>
            <div className={`h-px my-1 ${theme === 'light' ? 'bg-gray-200' : 'bg-white/5'}`} />
            <button 
              onClick={() => {
                const s = sessions.find(item => item.id === activeContextMenu.id);
                if (s) {
                  if (s.isPinned) {
                    showAlert("Session Pinned", "This session is pinned. You cannot delete a pinned session until you unpin it.");
                  } else {
                    showConfirm(
                      'Delete Session',
                      `Are you sure you want to delete the session "${s.title}"?`,
                      () => {
                        const remaining = sessions.filter(item => item.id !== s.id);
                        setSessions(remaining);
                        if (activeSessionId === s.id) {
                          setActiveSessionId(remaining[0]?.id || 'default');
                        }
                      }
                    );
                  }
                }
                setActiveContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors text-left cursor-pointer ${theme === 'light' ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-red-400 hover:bg-red-500/10'}`}
            >
              <svg className="w-3.5 h-3.5 text-red-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              <span>Delete Session</span>
            </button>
          </div>
        </>
      )}

      {/* Spectacular Web App Launcher Overlay */}
      {openingUrlInfo && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 font-sans">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className={`relative w-full max-w-md rounded-2xl border p-8 shadow-2xl flex flex-col items-center text-center ${
            theme === 'light' ? 'bg-white border-gray-200 text-gray-900 shadow-purple-100' : 'bg-[#0a0a0f] border-purple-500/20 text-white shadow-purple-950/40'
          }`}>
            
            {/* Pulsing visual halo or ring */}
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              {isPopupBlocked ? (
                <>
                  <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-pulse" />
                  <div className="relative w-14 h-14 rounded-full bg-amber-900/30 border border-amber-500/40 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-6 h-6 text-amber-400 animate-bounce" />
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-dashed border-emerald-500/30 animate-spin" style={{ animationDuration: '6s' }} />
                  <div className="absolute inset-4 rounded-full border border-emerald-500/50 animate-pulse" />
                  <div className="relative w-14 h-14 rounded-full bg-emerald-900/30 border border-emerald-500/40 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                </>
              )}
            </div>

            <span className={`text-[10px] font-black font-mono uppercase tracking-widest mb-1 animate-pulse ${isPopupBlocked ? 'text-amber-500' : 'text-emerald-500'}`}>
              {isPopupBlocked ? 'Action Required: Popup Blocked' : 'System Telemetry: Triggered Successfully'}
            </span>
            
            <h3 className="text-xl font-bold tracking-tight mb-2">
              Opening <span className="text-purple-400">{openingUrlInfo.label}</span>
            </h3>
            
            <p className={`text-xs max-w-xs mb-6 leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              {isPopupBlocked 
                ? "Your browser blocked the automatic new tab. Please click the button below to open it immediately!"
                : `We launched ${openingUrlInfo.label} in a new tab! If it did not appear, your browser may have blocked it. Click below to open.`}
            </p>

            {/* Custom moving loading indicator */}
            <div className="w-full max-w-xs h-1.5 bg-gray-800/60 rounded-full overflow-hidden mb-8 relative border border-white/5">
              <div className={`absolute top-0 bottom-0 left-0 w-full rounded-full animate-pulse ${isPopupBlocked ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-purple-500'}`} />
            </div>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <a 
                href={openingUrlInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpeningUrlInfo(null)}
                className={`w-full py-3 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer text-center block ${
                  isPopupBlocked 
                    ? 'bg-amber-650 hover:bg-amber-600 animate-pulse shadow-amber-950/20' 
                    : 'bg-purple-650 hover:bg-purple-600'
                }`}
              >
                Open Website Now
              </a>
              <button 
                onClick={() => setOpeningUrlInfo(null)}
                className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  theme === 'light' ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-400'
                }`}
              >
                Close & Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Confirm Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
          />
          <div className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl animate-fade-in font-sans ${theme === 'light' ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#121214] border-white/10 text-white'}`}>
            <h3 className="text-base font-bold mb-2 flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`} />
              {modalConfig.title}
            </h3>
            <p className={`text-xs mb-6 font-medium leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              {modalConfig.message}
            </p>
            <div className="flex gap-2.5 justify-end">
              {modalConfig.isConfirm && (
                <button 
                  type="button"
                  onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                >
                  Cancel
                </button>
              )}
              <button 
                type="button"
                onClick={() => {
                  const callback = modalConfig.onConfirm;
                  setModalConfig(prev => ({ ...prev, isOpen: false }));
                  if (callback) callback();
                }}
                className="px-4 py-2 bg-[#5b3eff] hover:bg-[#482ee6] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Feedback Submission Modal Dialog */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setIsFeedbackModalOpen(false)}
          />
          <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl ${theme === 'light' ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0f1122] border-white/10 text-white'}`}>
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="text-xs font-black flex items-center gap-1.5 uppercase tracking-wider text-purple-400">
                <ThumbsUp className="w-4 h-4" /> Share Your Experience
              </h3>
              <button 
                onClick={() => setIsFeedbackModalOpen(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 font-mono">How was your session with Blackbell?</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFeedbackRating('positive')}
                    className={`py-2.5 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                      feedbackRating === 'positive'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-md font-extrabold'
                        : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-base select-none">😊</span>
                    <span>Positive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackRating('neutral')}
                    className={`py-2.5 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                      feedbackRating === 'neutral'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-md font-extrabold'
                        : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-base select-none">😐</span>
                    <span>Neutral</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackRating('negative')}
                    className={`py-2.5 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                      feedbackRating === 'negative'
                        ? 'bg-red-500/10 border-red-500/40 text-red-500 shadow-md font-extrabold'
                        : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-base select-none">😠</span>
                    <span>Negative</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 font-mono">Comments</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you liked or how we can improve. Your comments are visible live in the Admin dashboard!"
                  className="w-full bg-black/25 border border-white/5 hover:border-white/10 focus:border-indigo-500/40 rounded-xl p-3 text-xs text-white placeholder-gray-600 outline-none transition-all leading-normal resize-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedbackText.trim()}
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingFeedback ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
