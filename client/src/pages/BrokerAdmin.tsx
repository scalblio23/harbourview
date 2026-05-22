/**
 * Broker Admin Page — view all leads and their AI-generated reports
 * Route: /harborviewreports
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  FileText, Phone, Mail, Calendar, TrendingDown,
  ChevronDown, ChevronUp, Clock, CheckCircle, AlertCircle, Loader2,
  User, Building2, DollarSign, Percent,
} from "lucide-react";
import type { BrokerReport, LenderOption } from "../../../server/routers";
import type { Lead } from "../../../drizzle/schema";

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
      {/* Header row */}
      <div className="flex items-start gap-3 p-5">
        {/* Avatar */}
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

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-xs text-gray-300">{createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(e => !e)} className="text-gray-300 hover:text-gray-500 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded report */}
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

  return (
    <div className="min-h-screen bg-[#F0F0EE]">
      {/* Header */}
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
        {/* Title + counts */}
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
