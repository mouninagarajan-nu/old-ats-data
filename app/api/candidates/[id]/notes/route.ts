import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const notes = await prisma.outreachNote.findMany({
    where: { candidateId: id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const note = await prisma.outreachNote.create({
    data: {
      candidateId: id,
      authorName: body.authorName || "HR Team",
      noteText: body.noteText,
      contacted: body.contacted || false,
      contactedAt: body.contacted ? new Date() : null,
    },
  });

  return Response.json(note, { status: 201 });
}
