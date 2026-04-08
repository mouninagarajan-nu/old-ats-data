import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!q || q.trim().length === 0) {
    return Response.json({ candidates: [], total: 0, page: 1, totalPages: 0 });
  }

  const skip = (page - 1) * limit;

  // Use PostgreSQL full-text search
  const searchTerms = q.trim().split(/\s+/).join(" & ");

  const candidates = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      skills: string[];
      city: string | null;
      state: string | null;
      country: string | null;
      rank: number;
    }>
  >(
    `SELECT id, email, "firstName", "lastName", skills, city, state, country,
            ts_rank(search_vector, to_tsquery('english', $1)) as rank
     FROM "Candidate"
     WHERE search_vector @@ to_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $2 OFFSET $3`,
    searchTerms,
    limit,
    skip
  );

  const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "Candidate" WHERE search_vector @@ to_tsquery('english', $1)`,
    searchTerms
  );

  const total = Number(countResult[0]?.count || 0);

  return Response.json({
    candidates,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
