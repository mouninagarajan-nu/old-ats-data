import fs from "fs";
import path from "path";
import { parseCSV } from "./utils/csv-parser";
import { log, logProgress } from "./utils/logger";
import { Prisma } from "@prisma/client";
import { prisma } from "./utils/prisma-client";

const FEEDBACK_DIR = path.join(__dirname, "..", "Freshteam Export Masterdata", "Freshteam_Interview Feedback Data");

interface FeedbackRow {
  "candidate_email": string;
  "applicant_id": string;
  "interview_stage_category": string;
  "interview_stage": string;
  "panel_member_email": string;
  "feedback decision": string;
  "feedback submitted time": string;
  "feedback evaluation": string;
  "feedback comments html": string;
  "assessment attachment": string;
  "interview_stage_deleted": string;
}

function parseEvaluation(evalStr: string): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!evalStr || evalStr.trim() === "") return Prisma.JsonNull;
  try {
    return JSON.parse(evalStr);
  } catch {
    return Prisma.JsonNull;
  }
}

async function main() {
  log("import-feedback", "Starting interview feedback import...");

  if (!fs.existsSync(FEEDBACK_DIR)) {
    log("import-feedback", "Feedback directory not found!");
    return;
  }

  const files = fs.readdirSync(FEEDBACK_DIR).filter(f => f.endsWith(".csv"));
  log("import-feedback", `Found ${files.length} feedback CSV files`);

  let total = 0;
  let skipped = 0;
  let linkedToApp = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const match = file.match(/^(\d+)_(.+)\.csv$/);
    const freshteamJobId = match ? match[1] : null;

    const csvPath = path.join(FEEDBACK_DIR, file);
    let rows: FeedbackRow[];
    try {
      rows = parseCSV<FeedbackRow>(csvPath);
    } catch (e) {
      log("import-feedback", `Error parsing ${file}: ${e}`);
      continue;
    }

    // Find the job by freshteamJobId
    let job = freshteamJobId
      ? await prisma.job.findUnique({ where: { freshteamJobId } })
      : null;

    for (const row of rows) {
      const email = row["candidate_email"]?.trim().toLowerCase();
      const applicantId = row["applicant_id"]?.trim();

      if (!email || !email.includes("@")) { skipped++; continue; }

      // Find candidate
      const candidate = await prisma.candidate.findUnique({ where: { email } });
      if (!candidate) { skipped++; continue; }

      // Find or create application
      let application = null;
      if (job) {
        application = await prisma.application.findFirst({
          where: { candidateId: candidate.id, jobId: job.id },
        });
      }

      if (!application && job) {
        // Create the application
        try {
          application = await prisma.application.create({
            data: {
              candidateId: candidate.id,
              jobId: job.id,
              applicantId: applicantId || `feedback_${email}_${job.id}`,
            },
          });
        } catch {
          // Already exists — find it
          application = await prisma.application.findFirst({
            where: { candidateId: candidate.id, jobId: job.id },
          });
        }
      }

      if (!application) { skipped++; continue; }

      // Update applicantId on the application if we have it from feedback
      if (applicantId && application.applicantId !== applicantId) {
        try {
          await prisma.application.update({
            where: { id: application.id },
            data: { applicantId },
          });
        } catch {
          // Unique constraint violation — ignore
        }
      }

      // Create feedback entry
      const evaluation = parseEvaluation(row["feedback evaluation"]);

      await prisma.interviewFeedback.create({
        data: {
          applicationId: application.id,
          interviewStageCategory: row["interview_stage_category"]?.trim() || null,
          interviewStage: row["interview_stage"]?.trim() || null,
          panelMemberEmail: row["panel_member_email"]?.trim() || null,
          feedbackDecision: row["feedback decision"]?.trim() || null,
          feedbackSubmittedTime: row["feedback submitted time"]?.trim() || null,
          feedbackEvaluation: evaluation,
          feedbackCommentsHtml: row["feedback comments html"]?.trim() || null,
          assessmentAttachment: row["assessment attachment"]?.trim() || null,
          stageDeleted: row["interview_stage_deleted"]?.trim().toLowerCase() === "true",
        },
      });

      total++;
      linkedToApp++;
    }

    logProgress("import-feedback", i + 1, files.length);
  }

  log("import-feedback", `Done. Feedback imported: ${total}, Linked to applications: ${linkedToApp}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
