import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      applications: {
        include: {
          job: { select: { id: true, title: true, status: true } },
          interviewFeedback: {
            orderBy: { feedbackSubmittedTime: "desc" },
          },
        },
      },
      employers: {
        orderBy: { startDate: "desc" },
      },
      qualifications: {
        orderBy: { startDate: "desc" },
      },
      outreachNotes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!candidate) {
    return Response.json({ error: "Candidate not found" }, { status: 404 });
  }

  return Response.json(candidate);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const candidate = await prisma.candidate.update({
    where: { id },
    data: body,
  });

  return Response.json(candidate);
}
