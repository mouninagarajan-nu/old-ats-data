import { prisma } from "@/lib/prisma";

export async function GET() {
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

  return Response.json({
    counts: { candidates, jobs, applications, feedback },
    jobsByStatus: jobsByStatus.map((j) => ({ status: j.status, count: j._count })),
    recentCandidates,
  });
}
