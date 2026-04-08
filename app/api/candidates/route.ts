import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const q = searchParams.get("q") || "";
  const skills = searchParams.get("skills") || "";
  const city = searchParams.get("city") || "";
  const country = searchParams.get("country") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "updatedAt";
  const order = searchParams.get("order") || "desc";

  const skip = (page - 1) * limit;

  const where: Prisma.CandidateWhereInput = {};
  const conditions: Prisma.CandidateWhereInput[] = [];

  if (q) {
    conditions.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { skills: { hasSome: [q.toUpperCase(), q, q.toLowerCase()] } },
      ],
    });
  }

  if (skills) {
    const skillList = skills.split(",").map((s) => s.trim());
    conditions.push({
      skills: { hasSome: skillList },
    });
  }

  if (city) {
    conditions.push({ city: { contains: city, mode: "insensitive" } });
  }

  if (country) {
    conditions.push({ country: { contains: country, mode: "insensitive" } });
  }

  if (status) {
    conditions.push({
      applications: {
        some: { candidateStatus: { contains: status, mode: "insensitive" } },
      },
    });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  const orderBy: Prisma.CandidateOrderByWithRelationInput =
    sort === "name"
      ? { firstName: order as Prisma.SortOrder }
      : { updatedAt: order as Prisma.SortOrder };

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        applications: {
          select: {
            id: true,
            candidateStatus: true,
            totalExperience: true,
            job: { select: { id: true, title: true, status: true } },
          },
          take: 5,
        },
        _count: { select: { outreachNotes: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ]);

  return Response.json({
    candidates,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
