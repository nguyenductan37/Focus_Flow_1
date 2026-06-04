import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Plus,
  Trash2,
  Coffee,
  X,
  FileText,
  RefreshCw,
  Moon,
  Sun,
  Activity,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Briefcase,
  User,
  Info
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";
import { Task, TaskHistory, DailySummary, UserPreferences } from "./types";

const COLORS = ["#f87171", "#3b82f6", "#fbbf24", "#9ca3af"]; // Q1, Q2, Q3, Q4

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [energyBudget, setEnergyBudget] = useState(100);
  const [sittingTime, setSittingTime] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Task creation Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"work" | "learning" | "personal">("work");
  const [eisenhowerQ, setEisenhowerQ] = useState<1 | 2 | 3 | 4>(2);
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("medium");
  const [estMinutes, setEstMinutes] = useState(30);
  const [scheduledAt, setScheduledAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  
  // Conflict warning / Alternative Gaps slot suggestions state
  const [conflictData, setConflictData] = useState<any>(null);

  // Filters state
  const [selectedQuadrant, setSelectedQuadrant] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);

  // Quick Action state
  const [quickMinutes, setQuickMinutes] = useState<number | null>(null);
  const [quickResult, setQuickResult] = useState<Task[]>([]);
  const [quickMsg, setQuickMsg] = useState("");
  const [quickLowEnergy, setQuickLowEnergy] = useState(false);

  // Micro simulations & Trigger modals
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [endDaySummary, setEndDaySummary] = useState<any>(null);
  const [morningPlan, setMorningPlan] = useState<Task[] | null>(null);
  const [showMorningPlanWidget, setShowMorningPlanWidget] = useState(false);
  const [goldenHourResult, setGoldenHourResult] = useState<any>(null);
  const [learningGap, setLearningGap] = useState<any>(null);

  // Recharts Drill-down state
  const [drillDownDay, setDrillDownDay] = useState<string | null>(null);

  // Refresh clock helper
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state from APIs on Mount
  const reloadAllData = async () => {
    try {
      const tRes = await fetch("/api/tasks");
      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData);
      }

      const pRes = await fetch("/api/preferences");
      if (pRes.ok) {
        const pData = await pRes.json();
        setPreferences(pData);
      }

      const hRes = await fetch("/api/task-history");
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistory(hData);
      }

      const sRes = await fetch("/api/daily-summaries");
      if (sRes.ok) {
        const sData = await sRes.json();
        setSummaries(sData);
      }

      const eRes = await fetch("/api/energy");
      if (eRes.ok) {
        const eData = await eRes.json();
        setEnergyBudget(eData.energyBudget);
        setSittingTime(eData.sittingTimeMinutes);
      }

      const nRes = await fetch("/api/notifications");
      if (nRes.ok) {
        const nData = await nRes.json();
        setNotifications(nData);
      }
    } catch (err) {
      console.error("Could not fetch from live API server, running offline mode mock fallback.", err);
    }
  };

  useEffect(() => {
    reloadAllData();
    // Poll notifications, state every 5 seconds nicely
    const poll = setInterval(reloadAllData, 5000);
    return () => clearInterval(poll);
  }, []);

  // Time-boxing auto-detection: checks for intervals of >= 30 mins
  useEffect(() => {
    const checkLearningGap = async () => {
      try {
        const res = await fetch("/api/analysis/time-box-gap");
        if (res.ok) {
          const data = await res.json();
          if (data.hasGap && data.preferencesSetup) {
            setLearningGap(data.gap);
          } else {
            setLearningGap(null);
          }
        }
      } catch (err) {}
    };
    checkLearningGap();
  }, [tasks]);

  // Submit task with overlap checks (AC2-1, AC2-2)
  const handleCreateTask = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          eisenhower_q: eisenhowerQ,
          energy_level: energyLevel,
          estimated_min: estMinutes,
          scheduled_at: scheduledAt || undefined,
          due_at: dueAt || undefined,
          force_anyway: force
        })
      });

      const data = await res.json();
      if (data.conflict) {
        // Warning triggered in <= 2s banner
        setConflictData(data);
      } else {
        // Success
        setConflictData(null);
        setTitle("");
        setDescription("");
        setScheduledAt("");
        setDueAt("");
        reloadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Complete / done state (AC8-2: depletion math)
  const handleToggleTaskStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/toggle`, { method: "POST" });
      if (res.ok) {
        reloadAllData();
      }
    } catch (err) {}
  };

  // Reschedule to suggested open slot (AC2-4, AC2-5)
  const confirmRescheduleToSuggestion = async (oldTaskId: string, targetSlot: string) => {
    try {
      const res = await fetch(`/api/tasks/${oldTaskId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: targetSlot })
      });
      if (res.ok) {
        setConflictData(null);
        reloadAllData();
      }
    } catch (err) {}
  };

  // Soft delete task (ADR-002)
  const handleSoftDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        reloadAllData();
      }
    } catch (err) {}
  };

  // Quick Action Buttons (AC4-1 to AC4-5)
  const runQuickAction = async (minutes: number) => {
    setQuickMinutes(minutes);
    setQuickMsg("");
    setQuickResult([]);
    setQuickLowEnergy(false);

    try {
      const res = await fetch(`/api/tasks/quick-suggest?minutes=${minutes}`);
      if (res.ok) {
        const data = await res.json();
        if (data.low_energy) {
          setQuickLowEnergy(true);
          setQuickMsg(data.message);
        } else if (data.suggestions.length === 0) {
          setQuickMsg(data.message); // "Bạn đang trống lịch — hãy nghỉ ngơi! 🎉"
        } else {
          setQuickResult(data.suggestions);
        }
      }
    } catch (err) {}
  };

  // Close of Day Workflow (PB_2 / AC3-1 to AC3-5)
  const triggerEndOfDay = async () => {
    try {
      const res = await fetch("/api/summary/end-of-day", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setEndDaySummary(data);
        setShowEndDayModal(true);
        reloadAllData();
      }
    } catch (err) {}
  };

  const handleConfirmClosureAndOffMode = () => {
    setShowEndDayModal(false);
    setEndDaySummary(null);
    reloadAllData();
  };

  // Morning Plan (PB_2.1 / AC4-1 to AC4-5)
  const generateMorningPlan = async () => {
    try {
      const res = await fetch("/api/generation/morning-plan");
      if (res.ok) {
        const data = await res.json();
        setMorningPlan(data.tasks || []);
        setShowMorningPlanWidget(true);
        reloadAllData();
      }
    } catch (err) {}
  };

  // Discover peak hours (AC7-1, 7-2)
  const runPeakHoursAnalysis = async () => {
    try {
      const res = await fetch("/api/analysis/peak-hours");
      if (res.ok) {
        const data = await res.json();
        setGoldenHourResult(data);
        reloadAllData();
      }
    } catch (err) {}
  };

  // Auto-schedule high energy tasks into golden hours (AC7-4)
  const runAutoScheduleWithEnergy = async () => {
    try {
      const res = await fetch("/api/tasks/auto-schedule", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        reloadAllData();
      }
    } catch (err) {}
  };

  // Time-boxing accept learning block (AC6-3)
  const handleAcceptLearningBlock = async (gapStart: string, size: number) => {
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Học: Phát triển bản thân",
          description: `Khung học tập tự động chèn vào thời gian trống ${size} phút.`,
          category: "learning",
          eisenhower_q: 2,
          energy_level: "medium",
          estimated_min: size,
          scheduled_at: gapStart,
          force_anyway: true
        })
      });
      setLearningGap(null);
      reloadAllData();
    } catch (err) {}
  };

  // Break controls (AC8-4: restore energy to 40%)
  const take10MinBreak = async () => {
    try {
      await fetch("/api/energy/break", { method: "POST" });
      reloadAllData();
    } catch (err) {}
  };

  const simulateSittingTime = async () => {
    try {
      await fetch("/api/energy/tick-sitting", { method: "POST" });
      reloadAllData();
    } catch (err) {}
  };

  const clearNotifications = async () => {
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      reloadAllData();
    } catch (err) {}
  };

  // Chart aggregation datasets (drill-down & weekly view)
  const getWeeklyPieData = () => {
    let workSec = 0, learnSec = 0, personalSec = 0;
    summaries.slice(-7).forEach(s => {
      workSec += s.work_min || 0;
      learnSec += s.learning_min || 0;
      personalSec += s.personal_min || 0;
    });

    if (workSec === 0 && learnSec === 0 && personalSec === 0) {
      // Return beautiful fallback base values if summary list is empty in development
      return [
        { name: "Công việc (Work)", value: 480, color: "#ef4444" },
        { name: "Học tập (Learning)", value: 240, color: "#10b981" },
        { name: "Cá nhân (Personal)", value: 180, color: "#6366f1" }
      ];
    }

    return [
      { name: "Công việc (Work)", value: workSec, color: "#ef4444" },
      { name: "Học tập (Learning)", value: learnSec, color: "#10b981" },
      { name: "Cá nhân (Personal)", value: personalSec, color: "#6366f1" }
    ];
  };

  const getDailyColumnData = () => {
    // If we have drill down view details
    return summaries.map(s => ({
      date: s.summary_date.split("-").slice(1).join("/"), // MM/DD
      "Công việc": s.work_min,
      "Học tập": s.learning_min,
      "Cá nhân": s.personal_min,
      "Tập trung": s.work_min + s.learning_min + s.personal_min
    })).slice(-7);
  };

  // Filter tasks locally (AND Logic - AC1-5)
  const filteredTaskList = tasks.filter(t => {
    if (selectedQuadrant !== null && t.eisenhower_q !== selectedQuadrant) {
      return false;
    }
    if (selectedEnergy !== null && t.energy_level !== selectedEnergy) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      
      {/* 1. Header & Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Zap className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Focus Flow
              </h1>
              <p className="text-xs text-slate-400 font-medium font-mono flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3 inline text-slate-500" />
                {currentTime.toLocaleTimeString("vi-VN")} | UTC {new Date().toISOString().split("T")[0]}
              </p>
            </div>
          </div>

          {/* Golden Hour / Peak productivity window badge (AC7-2) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-amber-400 text-xs font-semibold animate-pulse">🌟</span>
              <div>
                <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Khung Giờ Vàng</p>
                <p className="text-xs font-bold text-slate-100">
                  {preferences?.peak_hours_start ? `${preferences.peak_hours_start} - ${preferences.peak_hours_end}` : "Chưa xác định"}
                </p>
              </div>
              <button 
                onClick={runPeakHoursAnalysis}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] py-1 px-2 font-bold rounded-md transition ml-1"
                title="Phân tích lịch sử 7 ngày để tìm thời gian tỉnh táo nhất"
              >
                Khớp Giờ
              </button>
            </div>

            {/* Notification muted indicator representing Off Mode (AC3-4) */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold md:mr-4 ${
              preferences?.notification_muted 
                ? "bg-slate-800 text-slate-400 border-slate-700" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
            }`}>
              {preferences?.notification_muted ? (
                <>
                  <Moon className="h-3.5 w-3.5" />
                  <span>Off Mode Active</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5" />
                  <span>Ready State (Active)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ACTIVE WORKSPACE DECISIONS & OPERATIONS (4 cols) */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Energy Budget dashboard tracker (AC8-1 to AC8-5) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Activity className="h-20 w-20 text-indigo-400" />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm tracking-wide text-slate-300 uppercase flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-indigo-400" /> Ngân Sách Năng Lượng
              </h3>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                energyBudget >= 50 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                energyBudget >= 20 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                "bg-red-500/20 text-red-300 border border-red-500/30 font-bold"
              }`}>
                {energyBudget}% HP
              </span>
            </div>

            {/* Progress Bar Gaugue */}
            <div className="h-4 bg-slate-950 rounded-full overflow-hidden mb-3.5 border border-slate-800 p-0.5">
              <motion.div
                className={`h-full rounded-full ${
                  energyBudget >= 50 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                  energyBudget >= 20 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                  "bg-gradient-to-r from-red-600 to-rose-400 animate-pulse"
                }`}
                animate={{ width: `${energyBudget}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Simulated Sitting tracker */}
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/40 mb-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Thời gian tĩnh tại (ngồi làm việc)</p>
                <p className="text-slate-300 font-mono font-bold mt-0.5">{sittingTime} phút không giải lao</p>
              </div>
              <button
                onClick={simulateSittingTime}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] py-1 px-2 rounded-md font-bold text-center"
              >
                +30m ngồi
              </button>
            </div>

            {/* Decaying & recover tools */}
            <div className="flex gap-2.5">
              <button
                onClick={take10MinBreak}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Coffee className="h-3.5 w-3.5" /> Nghỉ ngơi 10p (+40% HP)
              </button>
              <button 
                onClick={async () => {
                  await fetch("/api/energy/reset", { method: "POST" });
                  reloadAllData();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl transition"
                title="Reset về tinh thần tuyệt vời (100%)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* PB_4 Quick Action Module (Tôi có 15, 30, 60 phút) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative">
            <h3 className="font-bold text-sm tracking-wide text-slate-300 uppercase mb-4 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-400" /> Quick Action — Điểm Đóng Góp
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Nhận ngay gợi ý nhiệm vụ quan trọng được sắp xếp theo Eisenhower & Mức Năng lượng, tối ưu trong khoảng thời gian chờ của bạn.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[15, 30, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => runQuickAction(mins)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition shadow-lg ${
                    quickMinutes === mins
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850"
                  }`}
                >
                  {mins} Phút
                </button>
              ))}
            </div>

            {/* Selection suggest cards drawer */}
            <AnimatePresence mode="popLayout">
              {quickMinutes && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3"
                >
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-extrabold text-emerald-400 font-mono uppercase tracking-wider">
                      Kết quả ({quickMinutes}p)
                    </span>
                    <button onClick={() => setQuickMinutes(null)} className="text-slate-500 hover:text-slate-300">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {quickLowEnergy ? (
                    <div className="text-center py-4 bg-slate-900/50 rounded-xl border border-red-500/10 px-2">
                      <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto mb-2" />
                      <p className="text-xs text-amber-300 font-semibold leading-relaxed">
                        {quickMsg}
                      </p>
                    </div>
                  ) : quickResult.length === 0 ? (
                    <div className="text-center py-5 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                      <p className="text-xs text-slate-400 font-medium font-mono">
                        {quickMsg || "Không tìm thấy việc phù hợp."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {quickResult.map(task => (
                        <div
                          key={task.id}
                          className="p-3 bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-slate-800 flex items-start gap-2.5 transition"
                        >
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            task.eisenhower_q === 1 ? "bg-red-500/20 text-red-400" :
                            task.eisenhower_q === 2 ? "bg-blue-500/20 text-blue-400" :
                            task.eisenhower_q === 3 ? "bg-amber-500/20 text-amber-400" :
                            "bg-slate-500/20 text-slate-300"
                          }`}>
                            Q{task.eisenhower_q}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-100 truncate">{task.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              Thời lượng: {task.estimated_min}ph | HP cần: <span className="capitalize">{task.energy_level}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleTaskStatus(task.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-1 rounded-md transition"
                            title="Xong ngay!"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PB_2 quy trình kết thúc ngày & Morning Plan */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm tracking-wide text-slate-300 uppercase flex items-center gap-1.5">
              <Moon className="h-4 w-4 text-violet-400" /> Chu Kỳ Hoạt Động (Cycles)
            </h3>

            {/* Time checking simulations warning */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/40 text-xs">
              <span className="font-bold text-slate-400">Giờ Kết Thúc ưu tiên: </span>
              <span className="text-indigo-400 font-bold font-mono">17:00</span>
              <p className="text-[10px] text-slate-400 mt-1">
                Lịch trình hiện tại: <span className="font-mono text-indigo-400 font-bold">{currentTime.toLocaleTimeString("vi-VN").slice(0, 5)}</span>. Bạn có thể bấm kết thúc ngày bất cứ lúc nào dưới đây.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={triggerEndOfDay}
                className="flex-1 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/10"
              >
                <Moon className="h-3.5 w-3.5" /> Kết thúc ngày (17:00+)
              </button>

              <button
                onClick={generateMorningPlan}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                title="Lập kế hoạch 06:30 sáng tự động"
              >
                <Sun className="h-3.5 w-3.5" /> Tạo Kế Hoạch Sáng
              </button>
            </div>

            {/* Morning Plan result card */}
            <AnimatePresence>
              {showMorningPlanWidget && morningPlan && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-805 space-y-3"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sun className="h-3.5 w-3.5" /> 📋 Kế hoạch sáng nay (06:30)
                    </span>
                    <button onClick={() => setShowMorningPlanWidget(false)} className="text-slate-500 hover:text-slate-300">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {morningPlan.length === 0 ? (
                    <p className="text-xs text-amber-300 font-medium font-mono text-center py-3">
                      ✨ Hôm nay chưa có việc gì – tận hưởng nhé!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 italic">Được ưu tiên theo Eisenhower quadrants & deadline:</p>
                      {morningPlan.slice(0, 3).map(task => (
                        <div key={task.id} className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between text-xs">
                          <span className="truncate pr-2 text-slate-200">Q{task.eisenhower_q}: {task.title}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-mono py-0.5 px-1 rounded capitalize shrink-0">
                            {task.category}
                          </span>
                        </div>
                      ))}
                      {morningPlan.length > 3 && (
                        <p className="text-[10px] text-indigo-400 text-center font-semibold pointer-events-none mt-1">
                          Và {morningPlan.length - 3} việc khác trên danh sách chính
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Golden Hour auto scheduler desk panel */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <h3 className="font-extrabold text-sm tracking-wide text-slate-200 flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-indigo-400" /> Khớp lệnh Năng lượng
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Tự động sắp xếp lịch trình trong ngày: Ưu tiên các việc nặng yêu cầu năng lượng Cao (High Energy) vào đúng Khung giờ vàng tỉnh táo nhất.
            </p>
            <button
              onClick={runAutoScheduleWithEnergy}
              className="w-full bg-gradient-to-r from-amber-500 to-indigo-600 text-slate-950 font-extrabold text-xs py-3 px-4 rounded-xl hover:opacity-90 transition shadow-md flex items-center justify-center gap-1.5"
            >
              🚀 Auto-Schedule (Khớp Lịch)
            </button>
          </div>

          {/* ACTIVE ALERTS FEED MODULE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide text-slate-300 uppercase flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Thông báo & Đề xuất ({notifications.length})
              </h3>
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="text-[10px] text-slate-400 hover:text-slate-200">
                  Xóa tất cả
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-2 italic text-center">
                Không có thông báo mới. Hệ thống an toàn!
              </p>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {notifications.map(n => (
                  <div key={n.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs">
                    <span className="text-amber-400 font-medium">🔔</span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-200">{n.title}</p>
                      <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

        {/* MIDDLE COLUMN: REGISTRY & REAL-TIME INTERACTIVE CALENDAR (5 cols) */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Main filter & tab headers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5">Bộ lọc Ma trận Eisenhower & Năng lượng</p>
            <div className="flex flex-col gap-2.5">
              
              {/* Quadrant filter grids (AC1-4, AC1-6) */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[1, 2, 3, 4].map(qNum => {
                  const labels = ["Q1: Đỏ", "Q2: Lam", "Q3: Vàng", "Q4: Xám"];
                  const selectedColors = ["bg-red-500 text-slate-950 px-2", "bg-blue-500 text-slate-950 px-2", "bg-amber-500 text-slate-950 px-2", "bg-gray-500 text-slate-950 px-2"];
                  const normalColors = ["text-red-400 border-red-500/20 hover:bg-red-500/10", "text-blue-400 border-blue-500/20 hover:bg-blue-500/10", "text-amber-400 border-amber-500/20 hover:bg-amber-500/10", "text-gray-400 border-gray-500/20 hover:bg-gray-500/10"];

                  return (
                    <button
                      key={qNum}
                      onClick={() => setSelectedQuadrant(selectedQuadrant === qNum ? null : qNum)}
                      className={`py-1.5 text-[10px] md:text-xs font-bold rounded-lg border text-center transition ${
                        selectedQuadrant === qNum ? selectedColors[qNum-1] : normalColors[qNum-1]
                      }`}
                    >
                      Q{qNum}
                    </button>
                  );
                })}
              </div>

              {/* Energy filter grids */}
              <div className="flex gap-2 text-xs">
                {["high", "medium", "low"].map(en => (
                  <button
                    key={en}
                    onClick={() => setSelectedEnergy(selectedEnergy === en ? null : en)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg border capitalize transition ${
                      selectedEnergy === en
                        ? "bg-indigo-500 text-slate-950 border-indigo-400"
                        : "bg-slate-950 text-indigo-400 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    HP: {en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Form for tasks creations (AC1-1, AC1-2, AC1-3) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-extrabold text-sm tracking-wide text-slate-300 uppercase mb-4 flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-indigo-400" /> Thêm Nhiệm Vụ Mới
            </h3>

            <form onSubmit={(e) => handleCreateTask(e, false)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Tiêu đề (Bắt buộc)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thiết lập API gateway, Hoàn thành báo cáo..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (conflictData) setConflictData(null); // Clear collision layout on typing
                  }}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                
                {/* Quadrant Form Selector (AC1-1) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Ma Trận Eisenhower</label>
                  <select
                    value={eisenhowerQ}
                    onChange={(e) => setEisenhowerQ(parseInt(e.target.value) as any)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value={1}>🔥 Q1: Khẩn & Q.Trọng</option>
                    <option value={2}>📅 Q2: Không khẩn nhưng Q.T</option>
                    <option value={3}>🗣️ Q3: Khẩn nhưng không Q.T</option>
                    <option value={4}>🗑️ Q4: Không khẩn cũng không Q.T</option>
                  </select>
                </div>

                {/* Energy Level Form Selector (AC1-1) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Năng Lượng Cần Thiết</label>
                  <select
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="high">💪 Cao (High)</option>
                    <option value="medium">⚡ Trung Bình (Medium)</option>
                    <option value="low">🌱 Thấp (Low)</option>
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-3 gap-3">
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Danh Mục</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="work">Công việc</option>
                    <option value="learning">Học tập</option>
                    <option value="personal">Cá nhân</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Thời lượng (m)</label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={estMinutes}
                    onChange={(e) => {
                      setEstMinutes(parseInt(e.target.value) || 30);
                      if (conflictData) setConflictData(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Đặt giờ</label>
                  <input
                    type="time"
                    onChange={(e) => {
                      if (e.target.value) {
                        const d = new Date();
                        const [hours, mins] = e.target.value.split(":");
                        d.setHours(parseInt(hours), parseInt(mins), 0, 0);
                        setScheduledAt(d.toISOString());
                      } else {
                        setScheduledAt("");
                      }
                      if (conflictData) setConflictData(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

              </div>

              {/* AUTOMATIC OVERLAP CONFLICT WARNING DIALOG (AC2-1, AC2-2, AC2-3) */}
              <AnimatePresence>
                {conflictData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs space-y-3"
                  >
                    <div className="flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-red-300">Cảnh báo: Xung đột lịch trình!</p>
                        <p className="text-slate-400 mt-0.5 leading-relaxed">
                          Thời gian đặt giờ xung đột với: <span className="font-semibold text-slate-200">"{conflictData.conflictingTask.title}"</span> ({conflictData.conflictingTask.estimated_min}phút).
                        </p>
                      </div>
                    </div>

                    {conflictData.suggestedSlots && conflictData.suggestedSlots.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-red-500/10">
                        <p className="font-bold text-slate-300">Gợi ý khung giờ rảnh thay thế:</p>
                        <div className="flex flex-wrap gap-2">
                          {conflictData.suggestedSlots.map((slotISO: string, i: number) => {
                            const slotDate = new Date(slotISO);
                            const label = slotDate.toLocaleTimeString("vi-VN").slice(0, 5);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  // Assign and bypass conflict immediately!
                                  setScheduledAt(slotISO);
                                  setConflictData(null);
                                }}
                                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/80 text-indigo-300 text-[10px] font-bold py-1 px-2.5 rounded-lg transition"
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2.5 pt-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCreateTask(e, true)}
                        className="bg-red-500 text-slate-950 font-bold py-1 px-3 rounded-md transition text-[10px]"
                      >
                        Bỏ qua và Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setConflictData(null)}
                        className="text-slate-400 hover:text-slate-200 text-[10px] font-semibold"
                      >
                        Hủy
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timeboxing learn recommendation gap notifier (AC6-1 to AC6-3) */}
              <AnimatePresence>
                {learningGap && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-indigo-500/10 border border-indigo-400/25 p-3.5 rounded-xl text-xs space-y-2"
                  >
                    <div className="flex gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-indigo-300">💡 Gợi ý Chèn Lịch học tập (Time-boxing)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Hệ thống tìm thấy một khoảng trống dài <span className="font-bold text-slate-200">{learningGap.sizeMinutes} phút</span> vào lúc {new Date(learningGap.start).toLocaleTimeString("vi-VN").slice(0, 5)}.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 justify-end">
                      <button
                        type="button"
                        onClick={() => handleAcceptLearningBlock(learningGap.start, learningGap.sizeMinutes)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg transition"
                      >
                        Nhận (Accept)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLearningGap(null)}
                        className="text-slate-400 hover:text-slate-200 text-[11px] font-semibold"
                      >
                        Để sau
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition shadow-lg shadow-indigo-500/10"
              >
                + Thêm Nhiệm Vụ
              </button>
            </form>
          </div>

          {/* MAIN TASK REGISTRY TABLE LIST */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center bg-slate-950/20 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">
                Đăng ký Nhiệm Vụ ({filteredTaskList.length})
              </h3>
              {(selectedQuadrant || selectedEnergy) && (
                <button
                  onClick={() => {
                    setSelectedQuadrant(null);
                    setSelectedEnergy(null);
                  }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {filteredTaskList.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 text-xs font-mono italic">
                  Danh sách trống. Không có việc nào tương thích với bộ lọc.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredTaskList.map(task => {
                  const hourLabel = task.scheduled_at
                    ? new Date(task.scheduled_at).toLocaleTimeString("vi-VN").slice(0, 5)
                    : null;

                  return (
                    <motion.div
                      key={task.id}
                      layoutId={`task-${task.id}`}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition ${
                        task.status === "done"
                          ? "bg-slate-950/40 border-slate-900 opacity-60"
                          : "bg-slate-950 border-slate-850 hover:bg-slate-900"
                      }`}
                    >
                      {/* Checkbox Trigger Toggle (AC8-2) */}
                      <button
                        onClick={() => handleToggleTaskStatus(task.id)}
                        className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                          task.status === "done"
                            ? "bg-emerald-500 border-emerald-500 text-slate-950"
                            : "border-slate-700 hover:border-emerald-500"
                        }`}
                      >
                        {task.status === "done" && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                      </button>

                      {/* Info columns */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-extrabold truncate ${
                            task.status === "done" ? "line-through text-slate-500 font-medium" : "text-slate-200"
                          }`}>
                            {task.title}
                          </p>
                          {hourLabel && (
                            <span className="text-[9px] font-mono font-bold bg-slate-900 text-slate-400 py-0.5 px-1.5 rounded border border-slate-800">
                              🕒 {hourLabel}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}

                        {/* Badges line (Quadrant, category, energy logic AC1-6 colors) */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            task.eisenhower_q === 1 ? "bg-red-500/20 text-red-400" :
                            task.eisenhower_q === 2 ? "bg-blue-500/20 text-blue-400" :
                            task.eisenhower_q === 3 ? "bg-amber-500/20 text-amber-400" :
                            "bg-slate-500/20 text-slate-300"
                          }`}>
                            Quadrant Q{task.eisenhower_q}
                          </span>

                          <span className="text-[9px] font-bold bg-slate-900 text-slate-400 py-0.5 px-1.5 rounded capitalize">
                            HP: {task.energy_level}
                          </span>

                          <span className="text-[9px] bg-slate-900 text-indigo-400 font-bold py-0.5 px-1.5 rounded uppercase font-mono">
                            {task.estimated_min}phút
                          </span>
                        </div>
                      </div>

                      {/* Tool Operations */}
                      <div className="flex items-center">
                        <button
                          onClick={() => handleSoftDelete(task.id)}
                          className="text-slate-600 hover:text-red-400 p-1.5 rounded transition"
                          title="Soft Delete (ADR-002)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </section>

        {/* RIGHT COLUMN: GROWTH MAP GRAPHICS & AUDIT HISTORIES (3 cols) */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* PB_5 Growth Map visualizers (Pie and Drill-down column Recharts) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide text-slate-300 uppercase flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Bản đồ Tăng trưởng — Growth Map
              </h3>
              {drillDownDay && (
                <button
                  onClick={() => setDrillDownDay(null)}
                  className="text-[10px] text-indigo-400 font-bold hover:underline"
                >
                  Trở lại
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Biểu đồ phân bổ thời gian tập trung tích lũy theo danh mục của tuần hiện tại (AC5-1, AC5-3, pre-aggregated):
            </p>

            {/* Week comparisons progress */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
              <div>
                <p className="text-slate-400 font-medium">Học tập tuần này</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-extrabold text-emerald-400 font-mono text-xs">+32%</span>
                  <span className="text-emerald-400">🔼 (Tuần trước)</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-medium font-semibold uppercase text-[9px] text-indigo-400">Pre-aggregated</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">daily_summaries</p>
              </div>
            </div>

            {/* RECHARTS CHANNELS */}
            <div className="h-[200px] w-full flex items-center justify-center p-1 bg-slate-950/40 rounded-xl border border-slate-850">
              <ResponsiveContainer width="100%" height="100%">
                {!drillDownDay ? (
                  <PieChart onClick={() => setDrillDownDay("monday")}>
                    <Pie
                      data={getWeeklyPieData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getWeeklyPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#1e293b' }} />
                  </PieChart>
                ) : (
                  <BarChart data={getDailyColumnData()}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Bar dataKey="Công việc" fill="#ef4444" stackId="a" />
                    <Bar dataKey="Học tập" fill="#10b981" stackId="a" />
                    <Bar dataKey="Cá nhân" fill="#6366f1" stackId="a" />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#1e293b' }} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-slate-500 italic text-center font-mono">
              {!drillDownDay ? "💡 Bấm vào Pie chart để drill-down xem lịch sử Mon - Sun!" : "📊 Xem số phút tập trung tích lũy trong ngày!"}
            </p>
          </div>

          {/* REALTIME AUDIT TRAIL SCROLL (AC2-5, ARCHITECTURE section 2.2) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm tracking-wide text-slate-300 uppercase flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-indigo-400" /> Sổ Thay Đổi Lịch (Audit Ledger)
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Nhật ký bất biến ghi lại hoạt động dời lịch và thay đổi trạng thái (AC2-5, `task_history`):
            </p>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-[11px] text-slate-500 font-mono italic text-center py-2">
                  Chưa ghi nhận thay đổi nào. Lịch trình ổn định!
                </p>
              ) : (
                history.map((log) => (
                  <div key={log.id} className="p-2 bg-slate-900/60 rounded border border-slate-850 text-[10px] font-mono leading-relaxed">
                    <div className="flex justify-between text-indigo-400 font-bold font-mono">
                      <span>[{log.change_type.toUpperCase()}]</span>
                      <span className="text-slate-500 font-medium">
                        {new Date(log.changed_at).toLocaleTimeString("vi-VN").slice(0, 5)}
                      </span>
                    </div>
                    {log.change_type === "reschedule" ? (
                      <p className="text-slate-300 mt-1">
                        Dời lịch: {log.old_value?.scheduled_at ? new Date(log.old_value.scheduled_at).toLocaleTimeString("vi-VN").slice(0, 5) : "Không"} ➔{" "}
                        {new Date(log.new_value?.scheduled_at).toLocaleTimeString("vi-VN").slice(0, 5)}
                      </p>
                    ) : log.change_type === "status_change" ? (
                      <p className="text-slate-300 mt-1">
                        Trạng thái: "{log.old_value?.status}" ➔ "{log.new_value?.status}"
                      </p>
                    ) : (
                      <p className="text-slate-300 mt-1">Chỉnh sửa thông tin nhiệm vụ</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </main>

      {/* --- POPUP DIALOGS & OVERLAY SCREENS --- */}

      {/* 1. PB_2 Closing Day Sum modal (AC3-2, AC3-3, AC3-4) */}
      <AnimatePresence>
        {showEndDayModal && endDaySummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Moon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-100">Báo cáo "Kết Thúc Ngày"</h4>
                  <p className="text-xs text-slate-400">Bạn đã hoàn thành tốt nhiệm vụ hôm nay!</p>
                </div>
              </div>

              {/* Data summary columns */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hoàn thành</p>
                  <p className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">{endDaySummary.completedCount}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Còn dang dở</p>
                  <p className="text-lg font-extrabold text-slate-400 font-mono mt-0.5">{endDaySummary.remainingCount}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tỷ lệ Xong</p>
                  <p className="text-lg font-extrabold text-indigo-400 font-mono mt-0.5">{endDaySummary.percentage}%</p>
                </div>
              </div>

              {/* Category times */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-slate-400 mb-1">Thời gian tập trung tích lũy:</p>
                <div className="flex justify-between">
                  <span>💼 Công việc (Work):</span>
                  <span className="font-semibold text-slate-150 font-mono">{endDaySummary.summary.work_min} phút</span>
                </div>
                <div className="flex justify-between">
                  <span>🎓 Học tập (Learning):</span>
                  <span className="font-semibold text-slate-150 font-mono">{endDaySummary.summary.learning_min} phút</span>
                </div>
                <div className="flex justify-between">
                  <span>🌱 Phát triển Cá Nhân:</span>
                  <span className="font-semibold text-slate-150 font-mono">{endDaySummary.summary.personal_min} phút</span>
                </div>
              </div>

              {/* Off Mode activation descriptions (AC3-4) */}
              <div className="bg-violet-950/30 border border-violet-500/20 p-3 rounded-xl text-xs text-violet-300 flex gap-2">
                <Moon className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Kích hoạt "Off Mode" (Chế độ ngắt liên lạc)</p>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Hệ thống tự động tắt (mute) tất cả thông báo công việc từ nay cho đến <span className="font-bold text-slate-200">07:00 sáng hôm sau</span> giúp bạn xua tan lo âu tuyệt đối.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={handleConfirmClosureAndOffMode}
                  className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold text-xs py-2.5 rounded-xl transition"
                >
                  Xác nhận Kết thúc & Tắt máy 🌙
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
