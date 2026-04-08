import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { log, logProgress } from "./utils/logger";
import { prisma } from "./utils/prisma-client";

const DATA_ROOT = path.join(__dirname, "..", "Freshteam Export Masterdata");

const STATUS_FOLDERS = [
  { folder: "Closed Positions_Freshteam Data", status: "Closed", jobDetails: "Closed Positions_Job Details", candidateData: "Closed Positions Candidate Data" },
  { folder: "Hold Positions_Freshteam Data", status: "Hold", jobDetails: "Hold Positions Job Details", candidateData: "Hold Positions Candidate Data" },
  { folder: "Private Positions_Freshteam Data", status: "Private", jobDetails: "Private Positions_Job Details", candidateData: "Private Positions_Candidate Data" },
  { folder: "Published Positions_Freshteam Data", status: "Published", jobDetails: "Published Positions_Job Details", candidateData: "Published Positons_Candidates Data" },
];

// Build a lookup from interview feedback filenames to extract freshteamJobId
function buildFeedbackJobIdMap(): Map<string, string> {
  const feedbackDir = path.join(DATA_ROOT, "Freshteam_Interview Feedback Data");
  const map = new Map<string, string>();
  if (!fs.existsSync(feedbackDir)) return map;

  const files = fs.readdirSync(feedbackDir).filter(f => f.endsWith(".csv"));
  for (const file of files) {
    const match = file.match(/^(\d+)_(.+)\.csv$/);
    if (match) {
      const jobId = match[1];
      const titlePart = match[2].replace(/_/g, " ").toLowerCase().trim();
      map.set(titlePart, jobId);
    }
  }
  return map;
}

function normalizeTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
}

function findJobId(folderName: string, feedbackMap: Map<string, string>): string | null {
  const normalized = normalizeTitle(folderName);
  // Try exact match first
  for (const [key, jobId] of feedbackMap) {
    if (normalizeTitle(key) === normalized) return jobId;
  }
  // Try partial match
  for (const [key, jobId] of feedbackMap) {
    const normalizedKey = normalizeTitle(key);
    if (normalizedKey.includes(normalized) || normalized.includes(normalizedKey)) return jobId;
  }
  return null;
}

async function parseDocx(filePath: string): Promise<string | null> {
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    return result.value || null;
  } catch {
    return null;
  }
}

function findMatchingDocx(jobDetailsDir: string, folderName: string): string | null {
  if (!fs.existsSync(jobDetailsDir)) return null;
  const files = fs.readdirSync(jobDetailsDir).filter(f => f.endsWith(".docx"));

  const normalizedFolder = normalizeTitle(folderName);

  // Try exact-ish match
  for (const file of files) {
    const normalizedFile = normalizeTitle(file.replace(".docx", ""));
    if (normalizedFile === normalizedFolder) return path.join(jobDetailsDir, file);
  }

  // Try partial match
  for (const file of files) {
    const normalizedFile = normalizeTitle(file.replace(".docx", ""));
    if (normalizedFile.includes(normalizedFolder) || normalizedFolder.includes(normalizedFile)) {
      return path.join(jobDetailsDir, file);
    }
  }

  return null;
}

async function main() {
  log("import-jobs", "Starting job import...");
  const feedbackMap = buildFeedbackJobIdMap();
  log("import-jobs", `Built feedback job ID map with ${feedbackMap.size} entries`);

  let totalJobs = 0;

  for (const { folder, status, jobDetails, candidateData } of STATUS_FOLDERS) {
    const statusDir = path.join(DATA_ROOT, folder);
    const jobDetailsDir = path.join(statusDir, jobDetails);
    const candidateDataDir = path.join(statusDir, candidateData);

    if (!fs.existsSync(candidateDataDir)) {
      log("import-jobs", `Skipping ${folder} — candidate data dir not found`);
      continue;
    }

    const jobFolders = fs.readdirSync(candidateDataDir).filter(f =>
      fs.statSync(path.join(candidateDataDir, f)).isDirectory()
    );

    log("import-jobs", `Processing ${jobFolders.length} ${status} positions...`);

    for (let i = 0; i < jobFolders.length; i++) {
      const jobFolder = jobFolders[i];
      const freshteamJobId = findJobId(jobFolder, feedbackMap);

      // Parse job description from docx
      const docxPath = findMatchingDocx(jobDetailsDir, jobFolder);
      let descriptionHtml: string | null = null;
      if (docxPath) {
        descriptionHtml = await parseDocx(docxPath);
      }

      await prisma.job.upsert({
        where: freshteamJobId
          ? { freshteamJobId }
          : { freshteamJobId: `${status}_${jobFolder}` },
        create: {
          freshteamJobId: freshteamJobId || `${status}_${jobFolder}`,
          title: jobFolder,
          status,
          descriptionHtml,
          folderName: jobFolder,
        },
        update: {
          title: jobFolder,
          status,
          descriptionHtml: descriptionHtml || undefined,
          folderName: jobFolder,
        },
      });

      totalJobs++;
      logProgress("import-jobs", i + 1, jobFolders.length);
    }
  }

  // Also import jobs from job details docx that don't have candidate data
  for (const { folder, status, jobDetails } of STATUS_FOLDERS) {
    const jobDetailsDir = path.join(DATA_ROOT, folder, jobDetails);
    if (!fs.existsSync(jobDetailsDir)) continue;

    const docxFiles = fs.readdirSync(jobDetailsDir).filter(f => f.endsWith(".docx"));
    for (const file of docxFiles) {
      const title = file.replace(".docx", "").replace(/_/g, " ").trim();
      const freshteamJobId = findJobId(title, feedbackMap);

      // Check if already imported
      const existing = await prisma.job.findFirst({
        where: {
          OR: [
            { folderName: { contains: normalizeTitle(title).substring(0, 20) } },
            ...(freshteamJobId ? [{ freshteamJobId }] : []),
          ],
        },
      });

      if (!existing) {
        const descriptionHtml = await parseDocx(path.join(jobDetailsDir, file));
        await prisma.job.create({
          data: {
            freshteamJobId: freshteamJobId || `docx_${status}_${file}`,
            title,
            status,
            descriptionHtml,
            folderName: file,
          },
        });
        totalJobs++;
      }
    }
  }

  log("import-jobs", `Done. Total jobs imported: ${totalJobs}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
