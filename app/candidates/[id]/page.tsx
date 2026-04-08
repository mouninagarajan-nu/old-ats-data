"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, GraduationCap,
  MessageSquare, FileText, ThumbsUp, ThumbsDown, Plus, ExternalLink,
} from "lucide-react";

interface CandidateDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  phone: string | null;
  mobile: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  profileUrls: string | null;
  skills: string[];
  tags: string[];
  applications: {
    id: string;
    candidateStatus: string | null;
    hiringStage: string | null;
    hiringSubstage: string | null;
    totalExperience: string | null;
    rejectReason: string | null;
    ownerName: string | null;
    appliedAt: string | null;
    resumePath: string | null;
    job: { id: string; title: string; status: string };
    interviewFeedback: {
      id: string;
      interviewStage: string | null;
      panelMemberEmail: string | null;
      feedbackDecision: string | null;
      feedbackSubmittedTime: string | null;
      feedbackEvaluation: Record<string, unknown> | null;
      feedbackCommentsHtml: string | null;
    }[];
  }[];
  employers: {
    id: string;
    employerName: string | null;
    designation: string | null;
    jobDescription: string | null;
    startDate: string | null;
    endDate: string | null;
    currentEmployer: boolean;
  }[];
  qualifications: {
    id: string;
    instituteName: string | null;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
  }[];
  outreachNotes: {
    id: string;
    authorName: string;
    noteText: string;
    contacted: boolean;
    contactedAt: string | null;
    createdAt: string;
  }[];
}

export default function CandidateProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");

  const fetchCandidate = useCallback(async () => {
    const res = await fetch(`/api/candidates/${id}`);
    const data = await res.json();
    setCandidate(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    await fetch(`/api/candidates/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteText, contacted: false }),
    });
    setNoteText("");
    fetchCandidate();
  };

  const markContacted = async () => {
    await fetch(`/api/candidates/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteText: "Marked as contacted", contacted: true }),
    });
    fetchCandidate();
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!candidate) return <div className="p-8 text-muted-foreground">Candidate not found</div>;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "work", label: "Work History" },
    { key: "education", label: "Education" },
    { key: "applications", label: `Applications (${candidate.applications.length})` },
    { key: "feedback", label: "Interview Feedback" },
    { key: "outreach", label: "Outreach" },
  ];

  const allFeedback = candidate.applications.flatMap((app) =>
    app.interviewFeedback.map((fb) => ({ ...fb, jobTitle: app.job.title }))
  );

  return (
    <div className="p-8">
      {/* Back link */}
      <Link href="/candidates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={14} /> Back to Candidates
      </Link>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {candidate.firstName} {candidate.middleName} {candidate.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Mail size={14} /> {candidate.email}</span>
              {(candidate.phone || candidate.mobile) && (
                <span className="flex items-center gap-1"><Phone size={14} /> {candidate.phone || candidate.mobile}</span>
              )}
              {(candidate.city || candidate.country) && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {[candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            {candidate.profileUrls && (
              <div className="mt-2">
                {candidate.profileUrls.split(/[\n,]/).filter(Boolean).map((url, i) => (
                  <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mr-3">
                    <ExternalLink size={12} /> {url.trim().replace(/https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={markContacted}
            className="px-4 py-2 text-sm font-medium bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
          >
            Mark Contacted
          </button>
        </div>

        {/* Skills */}
        {candidate.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {candidate.skills.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              {candidate.gender && <InfoRow label="Gender" value={candidate.gender} />}
              {candidate.dateOfBirth && <InfoRow label="Date of Birth" value={candidate.dateOfBirth} />}
              {candidate.applications[0]?.totalExperience && (
                <InfoRow label="Experience" value={candidate.applications[0].totalExperience} />
              )}
            </dl>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {candidate.tags.length > 0 ? candidate.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{t}</span>
              )) : <p className="text-sm text-muted-foreground">No tags</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "work" && (
        <div className="space-y-4">
          {candidate.employers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work history available</p>
          ) : (
            candidate.employers.map((emp) => (
              <div key={emp.id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-muted-foreground" />
                      <h3 className="font-semibold">{emp.employerName || "Unknown"}</h3>
                      {emp.currentEmployer && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">Current</span>
                      )}
                    </div>
                    {emp.designation && <p className="text-sm text-muted-foreground mt-1">{emp.designation}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {emp.startDate || "?"} - {emp.currentEmployer ? "Present" : emp.endDate || "?"}
                  </span>
                </div>
                {emp.jobDescription && (
                  <p className="text-sm mt-3 text-muted-foreground whitespace-pre-line">{emp.jobDescription}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "education" && (
        <div className="space-y-4">
          {candidate.qualifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education data available</p>
          ) : (
            candidate.qualifications.map((q) => (
              <div key={q.id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{q.instituteName || "Unknown"}</h3>
                      <p className="text-sm text-muted-foreground">{[q.degree, q.fieldOfStudy].filter(Boolean).join(" - ")}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {q.startDate || "?"} - {q.endDate || "?"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "applications" && (
        <div className="space-y-4">
          {candidate.applications.map((app) => (
            <div key={app.id} className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/jobs/${app.job.id}`} className="font-semibold text-primary hover:underline">
                    {app.job.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {app.candidateStatus && <CandidateStatusBadge status={app.candidateStatus} />}
                    {app.hiringStage && <span className="text-xs text-muted-foreground">{app.hiringStage}</span>}
                    {app.hiringSubstage && <span className="text-xs text-muted-foreground">/ {app.hiringSubstage}</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {app.appliedAt && <p>Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>}
                  {app.ownerName && <p>Owner: {app.ownerName}</p>}
                </div>
              </div>
              {app.rejectReason && (
                <p className="text-sm text-red-600 mt-2">Reject reason: {app.rejectReason}</p>
              )}
              {app.interviewFeedback.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">{app.interviewFeedback.length} feedback entries</p>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="space-y-4">
          {allFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interview feedback available</p>
          ) : (
            allFeedback.map((fb) => (
              <div key={fb.id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">{fb.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{fb.interviewStage} | {fb.panelMemberEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {fb.feedbackDecision === "hire" ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                        <ThumbsUp size={12} /> Hire
                      </span>
                    ) : fb.feedbackDecision === "no-hire" ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                        <ThumbsDown size={12} /> No Hire
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{fb.feedbackDecision || "N/A"}</span>
                    )}
                    {fb.feedbackSubmittedTime && (
                      <span className="text-xs text-muted-foreground">{fb.feedbackSubmittedTime}</span>
                    )}
                  </div>
                </div>
                {fb.feedbackEvaluation && renderEvaluation(fb.feedbackEvaluation)}
                {fb.feedbackCommentsHtml && (
                  <div className="mt-3 text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: fb.feedbackCommentsHtml }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "outreach" && (
        <div>
          {/* Add note form */}
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="flex gap-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about this candidate..."
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={2}
              />
              <button
                onClick={addNote}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors self-end"
              >
                <Plus size={14} className="inline mr-1" /> Add Note
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div className="space-y-3">
            {candidate.outreachNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outreach notes yet</p>
            ) : (
              candidate.outreachNotes.map((note) => (
                <div key={note.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{note.authorName}</span>
                      {note.contacted && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">Contacted</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{note.noteText}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function CandidateStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Rejected: "bg-red-50 text-red-700",
    Archived: "bg-gray-100 text-gray-700",
    Hired: "bg-green-50 text-green-700",
    Active: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function renderEvaluation(evaluation: Record<string, unknown>) {
  const questions = (evaluation as { questions?: { label: string; rating: number; rating_str: string; comment: string }[] }).questions;
  if (!questions || !Array.isArray(questions)) return null;

  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground min-w-[150px]">{q.label}:</span>
          {q.rating > 0 && (
            <span className="font-medium">{q.rating}/5 {q.rating_str && `(${q.rating_str})`}</span>
          )}
          {q.comment && <span className="text-muted-foreground text-xs">- {q.comment}</span>}
        </div>
      ))}
    </div>
  );
}
