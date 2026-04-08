import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, Briefcase, FileText, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [candidates, jobs, applications, feedback] = await Promise.all([
    prisma.candidate.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.interviewFeedback.count(),
  ]);

  const jobsByStatus = await prisma.job.groupBy({
    by: ["status"],
    _count: true,
  });

  const recentCandidates = await prisma.candidate.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      skills: true,
      city: true,
      country: true,
    },
  });

  return { counts: { candidates, jobs, applications, feedback }, jobsByStatus, recentCandidates };
}

export default async function Dashboard() {
  const { counts, jobsByStatus, recentCandidates } = await getStats();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={24} />} label="Candidates" value={counts.candidates} href="/candidates" color="bg-blue-500" />
        <StatCard icon={<Briefcase size={24} />} label="Jobs" value={counts.jobs} href="/jobs" color="bg-green-500" />
        <StatCard icon={<FileText size={24} />} label="Applications" value={counts.applications} color="bg-purple-500" />
        <StatCard icon={<MessageSquare size={24} />} label="Interview Feedback" value={counts.feedback} color="bg-orange-500" />
      </div>

      {/* Jobs by Status + Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Jobs by Status</h2>
          <div className="space-y-3">
            {jobsByStatus.map((j) => (
              <div key={j.status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={j.status} />
                  <span className="text-sm font-medium">{j.status}</span>
                </div>
                <span className="text-sm font-bold">{j._count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Candidates</h2>
            <Link href="/candidates" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentCandidates.map((c) => (
              <Link key={c.id} href={`/candidates/${c.id}`} className="flex items-center justify-between hover:bg-accent rounded-lg p-2 -mx-2 transition-colors">
                <div>
                  <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{c.city}{c.country ? `, ${c.country}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, href, color }: { icon: React.ReactNode; label: string; value: number; href?: string; color: string }) {
  const content = (
    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`${color} text-white p-3 rounded-lg`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
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
