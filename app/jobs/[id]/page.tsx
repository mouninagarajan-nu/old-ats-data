"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface JobDetail {
  id: string;
  title: string;
  status: string;
  freshteamJobId: string | null;
  descriptionHtml: string | null;
  applications: {
    id: string;
    candidateStatus: string | null;
    hiringStage: string | null;
    totalExperience: string | null;
    appliedAt: string | null;
    candidate: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      skills: string[];
    };
  }[];
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/jobs/${id}`);
    const data = await res.json();
    setJob(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!job) return <div className="p-8 text-muted-foreground">Job not found</div>;

  return (
    <div className="p-8">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={14} /> Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={job.status} />
              {job.freshteamJobId && (
                <span className="text-xs text-muted-foreground">ID: {job.freshteamJobId}</span>
              )}
              <span className="text-sm text-muted-foreground">{job.applications.length} applicants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Description */}
      {job.descriptionHtml && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Job Description</h2>
          <div className="prose prose-sm max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
          />
        </div>
      )}

      {/* Applicants */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Applicants ({job.applications.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Skills</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Experience</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
            </tr>
          </thead>
          <tbody>
            {job.applications.map((app) => (
              <tr key={app.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/candidates/${app.candidate.id}`} className="font-medium text-primary hover:underline">
                    {app.candidate.firstName} {app.candidate.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{app.candidate.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {app.candidate.skills.slice(0, 3).map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{app.totalExperience || "-"}</td>
                <td className="px-4 py-3">
                  {app.candidateStatus && <CandidateStatusBadge status={app.candidateStatus} />}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{app.hiringStage || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Closed: "bg-red-100 text-red-700",
    Hold: "bg-yellow-100 text-yellow-700",
    Private: "bg-gray-100 text-gray-700",
    Published: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
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
