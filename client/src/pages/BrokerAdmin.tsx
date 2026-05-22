/**
 * Broker Admin Page — view all leads and their AI-generated reports
 * Route: /harborviewreports
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  FileText, Phone, Mail, Calendar, TrendingDown,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Loader2,
  User, Building2, DollarSign, Percent, Ban,
} from "lucide-react";
import type { BrokerReport, LenderOption } from "../../../server/routers";
import type { Lead, BlockedSlot } from "../../../drizzle/schema";

// ── Date helpers ──────────────────────────────────────────────────────────────
// Local-date YYYY-MM-DD key (avoids UTC-shift bugs for AEST users at midnight).
function dateToLocalKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Find the Monday of the week containing the given date.
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

// Hour buckets shown in the weekly grid (9 AM through 4 PM, since slots end at 4:30 PM).
const HOUR_BUCKETS = [
  { key: "09:00", label: "9 AM" },
  { key: "10:00", label: "10 AM" },
  { key: "11:00", label: "11 AM" },
  { key: "12:00", label: "12 PM" },
  { key: "13:00", label: "1 PM" },
  { key: "14:00", label: "2 PM" },
  { key: "15:00", label: "3 PM" },
  { key: "16:00", label: "4 PM" },
];

// Parse a stored bookingDate string like "Sat, 24 May" against an anchor year + month.
// The survey stores bookingDate as a display string, not ISO — we have to reverse it.
// Returns YYYY-MM-DD for matching against the weekly grid, or null on parse failure.
function parseBookingDateKey(display: string | null | undefined, today: Date): string | null {
  if (!display) return null;
  // Format: "Sat, 24 May" — extract day + month
  const m = display.match(/(\d{1,2})\s+([A-Za-z]+)/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthName = m[2].toLowerCase().slice(0, 3);
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const month = months[monthName];
  if (month === undefined) return null;
  // Pick the year that puts the date closest to today (handles year-end wrap-around).
  const thisYear = today.getFullYear();
  const candidate = new Date(thisYear, month, day);
  const diffNow = Math.abs(candidate.getTime() - today.getTime());
  const diffNext = Math.abs(new Date(thisYear + 1, month, day).getTime() - today.getTime());
  const year = diffNext < diffNow ? thisYear + 1 : thisYear;
  return dateToLocalKey(new Date(year, month, day));
}

// Parse a stored bookingTime string like "1:00 PM – 1:30 PM" to its hour-bucket key "13:00".
function parseBookingTimeToHourKey(slot: string | null | undefined): string | null {
  if (!slot) return null;
  const start = slot.split("–")[0].trim();
  const m = start.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:00`;
}

// ── Weekly Calendar ───────────────────────────────────────────────────────────
function WeeklyCalendar({ leads, blockedSlots }: { leads: Lead[]; blockedSlots: BlockedSlot[] }) {
  const [weekAnchor, setWeekAnchor] = useState(() => getMondayOfWeek(new Date()));
  const utils = trpc.useUtils();

  const addMutation = trpc.survey.addBlockedSlot.useMutation({
    onSuccess: () => utils.survey.getBlockedSlots.invalidate(),
  });
  const removeMutation = trpc.survey.removeBlockedSlot.useMutation({
    onSuccess: () => utils.survey.getBlockedSlots.invalidate(),
  });

  // The 5 weekdays for the current view (Mon-Fri)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekAnchor]);

  // Group blocked slots into a fast-lookup structure.
  const blockedDayKeys = useMemo(
    () => new Set(blockedSlots.filter(b => b.hourKey === null).map(b => b.dateKey)),
    [blockedSlots]
  );
  const blockedHourMap = useMemo(() => {
    const m = new Map<string, true>();
    for (const b of blockedSlots) {
      if (b.hourKey !== null) m.set(`${b.dateKey}|${b.hourKey}`, true);
    }
    return m;
  }, [blockedSlots]);

  // Group bookings by dateKey|hourKey.
  const bookingMap = useMemo(() => {
    const m = new Map<string, Lead[]>();
    const today = new Date();
    for (const lead of leads) {
      const dateKey = parseBookingDateKey(lead.bookingDate, today);
      const hourKey = parseBookingTimeToHourKey(lead.bookingTime);
      if (!dateKey || !hourKey) continue;
      const k = `${dateKey}|${hourKey}`;
      const arr = m.get(k) ?? [];
      arr.push(lead);
      m.set(k, arr);
    }
    return m;
  }, [leads]);

  const handleHourClick = (dateKey: string, hourKey: string) => {
    const cellKey = `${dateKey}|${hourKey}`;
    if (blockedHourMap.has(cellKey)) {
      removeMutation.mutate({ dateKey, hourKey });
    } else {
      addMutation.mutate({ dateKey, hourKey });
    }
  };

  const handleDayClick = (dateKey: string) => {
    if (blockedDayKeys.has(dateKey)) {
      removeMutation.mutate({ dateKey, hourKey: null });
    } else {
      addMutation.mutate({ dateKey, hourKey: null });
    }
  };

  const goPrevWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() - 7);
    setWeekAnchor(d);
  };
  const goNextWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + 7);
    setWeekAnchor(d);
  };
  const goToday = () => setWeekAnchor(getMondayOfWeek(new Date()));

  const weekRangeLabel = `${weekDays[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${weekDays[4].toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[#0D9E8F]" />
          <p className="text-sm font-bold text-gray-700">Booking Calendar</p>
          <span className="text-xs text-gray-400">· {weekRangeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrevWeek}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="text-xs font-semibold text-gray-500 hover:text-[#0D5C55] transition-colors px-2.5 py-1 rounded-lg hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={goNextWeek}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day-header row */}
          <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-gray-100">
            <div className="px-2 py-2.5 text-xs text-gray-300" />
            {weekDays.map((d, i) => {
              const dateKey = dateToLocalKey(d);
              const isToday = dateToLocalKey(new Date()) === dateKey;
              const isDayBlocked = blockedDayKeys.has(dateKey);
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(dateKey)}
                  className={`px-2 py-2.5 text-center border-l border-gray-100 transition-colors group ${
                    isDayBlocked ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                  }`}
                  title={isDayBlocked ? "Click to unblock entire day" : "Click to block entire day"}
                >
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-[#0D9E8F]" : "text-gray-400"}`}>
                    {d.toLocaleDateString("en-AU", { weekday: "short" })}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-[#0D9E8F]" : isDayBlocked ? "text-red-500" : "text-gray-700"}`}>
                    {d.getDate()}
                  </p>
                  {isDayBlocked && (
                    <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] text-red-500 font-semibold">
                      <Ban className="w-2.5 h-2.5" /> Blocked
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Hour rows */}
          {HOUR_BUCKETS.map(bucket => (
            <div key={bucket.key} className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-gray-50">
              <div className="px-2 py-3 text-xs text-gray-400 font-medium flex items-center">
                {bucket.label}
              </div>
              {weekDays.map((d, i) => {
                const dateKey = dateToLocalKey(d);
                const cellKey = `${dateKey}|${bucket.key}`;
                const isDayBlocked = blockedDayKeys.has(dateKey);
                const isHourBlocked = blockedHourMap.has(cellKey);
                const bookings = bookingMap.get(cellKey) ?? [];
                const showBlockedOverlay = (isDayBlocked || isHourBlocked) && bookings.length === 0;
                const hasConflict = (isDayBlocked || isHourBlocked) && bookings.length > 0;

                return (
                  <button
                    key={i}
                    onClick={() => handleHourClick(dateKey, bucket.key)}
                    disabled={isDayBlocked}
                    className={`relative min-h-[58px] border-l border-gray-100 px-1.5 py-1.5 text-left transition-colors group ${
                      isDayBlocked
                        ? "bg-red-50/40 cursor-not-allowed"
                        : isHourBlocked
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-gray-50"
                    }`}
                    title={
                      isDayBlocked
                        ? "Whole day is blocked"
                        : isHourBlocked
                          ? "Click to unblock this hour"
                          : "Click to block this hour"
                    }
                  >
                    {/* Empty-blocked overlay */}
                    {showBlockedOverlay && (
                      <div className="absolute inset-1 rounded flex items-center justify-center pointer-events-none">
                        <Ban className="w-3.5 h-3.5 text-red-300" />
                      </div>
                    )}

                    {/* Booking pills (always render — even inside blocked slots) */}
                    <div className="space-y-1 relative">
                      {bookings.map(lead => (
                        <div
                          key={lead.id}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-semibold leading-tight ${
                            hasConflict
                              ? "bg-white text-red-600 ring-2 ring-red-500"
                              : "bg-[#0D5C55] text-white"
                          }`}
                        >
                          {hasConflict && <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />}
                          <span className="truncate">{lead.name}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Helper text */}
      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400">
        Click any hour to block or unblock it. Click a day header to block the whole day. Bookings inside blocked slots are shown with a red ring as a conflict warning.
      </div>
    </div>
  );
}

// ── Lead card pieces ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready:      "bg-green-100 text-green-700 border border-green-200",
    generating: "bg-amber-100 text-amber-700 border border-amber-200",
    pending:    "bg-gray-100 text-gray-500 border border-gray-200",
    failed:     "bg-red-100 text-red-600 border border-red-200",
  };
  const icons: Record<string, React.ReactNode> = {
    ready:      <CheckCircle className="w-3 h-3" />,
    generating: <Loader2 className="w-3 h-3 animate-spin" />,
    pending:    <Clock className="w-3 h-3" />,
    failed:     <AlertCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? styles.pending}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function LenderCard({ lender, rank }: { lender: LenderOption; rank: number }) {
  return (
    <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-[#0D5C55] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-800">{lender.lenderName}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#0D5C55]">{lender.estimatedRate}</span>
            <span className="text-xs text-gray-400">{lender.rateType}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-green-600 font-semibold">{lender.estimatedMonthlySaving}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-green-600">{lender.annualSaving}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{lender.suitability}</p>
        {lender.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lender.features.map((f, i) => (
              <span key={i} className="text-xs bg-[#0D5C55]/8 text-[#0D5C55] px-2 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false);
  const report = lead.aiReport as BrokerReport | null;
  const createdAt = new Date(lead.createdAt);

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors border-gray-100"
    >
      <div className="flex items-start gap-3 p-5">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0D5C55]/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-[#0D5C55]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-800">{lead.name}</p>
                <StatusBadge status={lead.reportStatus} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Building2 className="w-3 h-3" /> {lead.bankName}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <DollarSign className="w-3 h-3" /> {lead.loanSize}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Percent className="w-3 h-3" /> {lead.interest}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" /> {lead.timeline}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Phone className="w-3 h-3" /> {lead.phone}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Mail className="w-3 h-3" /> {lead.email}
                </span>
                {lead.bookingDate && (
                  <span className="flex items-center gap-1 text-xs text-[#0D9E8F] font-medium">
                    <Calendar className="w-3 h-3" /> {lead.bookingDate} {lead.bookingTime}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-xs text-gray-300">{createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(e => !e)} className="text-gray-300 hover:text-gray-500 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && report && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 p-5 space-y-5">
              <div className="bg-[#0D5C55] rounded-xl px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-white/70" />
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">AI Broker Report</p>
                </div>
                <p className="text-white text-sm leading-relaxed mb-3">{report.summary}</p>
                <p className="text-white/70 text-xs leading-relaxed mb-3">{report.currentSituation}</p>
                {report.potentialSaving && (
                  <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
                    <TrendingDown className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs font-bold">Potential saving: {report.potentialSaving}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
                  Recommended Lenders ({report.recommendedLenders.length})
                </p>
                <div className="space-y-2.5">
                  {report.recommendedLenders.map((lender, i) => (
                    <LenderCard key={i} lender={lender} rank={i + 1} />
                  ))}
                </div>
              </div>
              {report.nextSteps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Next Steps</p>
                  <ol className="space-y-1.5">
                    {report.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <span className="w-5 h-5 rounded-full bg-[#0D9E8F]/15 text-[#0D9E8F] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {report.riskNotes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Risk Notes
                  </p>
                  <p className="text-xs text-amber-600 leading-relaxed">{report.riskNotes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
        {expanded && !report && lead.reportStatus !== "ready" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {lead.reportStatus === "generating" ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-[#0D9E8F]" /> AI report is being generated...</>
                ) : lead.reportStatus === "failed" ? (
                  <><AlertCircle className="w-4 h-4 text-red-400" /> Report generation failed.</>
                ) : (
                  <><Clock className="w-4 h-4" /> Report pending.</>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BrokerAdmin() {
  const { data: leads, isLoading, error } = trpc.survey.getAllLeads.useQuery();
  const { data: blockedSlots } = trpc.survey.getBlockedSlots.useQuery();

  return (
    <div className="min-h-screen bg-[#F0F0EE]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/finchecker-logo-transparent_e7a5e4b3.png" alt="Finchecker" className="h-8" />
          <span className="text-gray-300 text-sm">·</span>
          <span className="text-sm font-semibold text-gray-500">Harborview Reports</span>
        </div>
        <a href="/" className="text-xs text-gray-400 hover:text-[#0D5C55] transition-colors font-medium">
          ← Back to Survey
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
              className="text-3xl text-[#0D1A18] uppercase"
            >
              Lead Reports
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {leads?.length ?? 0} enquiries received
            </p>
          </div>
          <div className="flex items-center gap-3">
            {leads && leads.length > 0 && (
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {leads.filter(l => l.reportStatus === "ready").length} ready
                </span>
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Loader2 className="w-3.5 h-3.5" />
                  {leads.filter(l => l.reportStatus === "generating").length} generating
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Calendar — block management + bookings overview */}
        <WeeklyCalendar leads={leads ?? []} blockedSlots={blockedSlots ?? []} />

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#0D9E8F]" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            Failed to load leads. Please refresh.
          </div>
        )}

        {leads && leads.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No leads yet. Share the survey to start receiving enquiries.</p>
          </div>
        )}

        <div className="space-y-3">
          {leads?.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
