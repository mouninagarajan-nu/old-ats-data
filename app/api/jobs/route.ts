import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (q) {
    where.title = { contains: q, mode: "insensitive" };
  }
  if (status) {
    where.status = status;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return Response.json({
    jobs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
