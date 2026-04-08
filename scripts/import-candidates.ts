import fs from "fs";
import path from "path";
import { parseCSV } from "./utils/csv-parser";
import { parseDate } from "./utils/date-parser";
import { log, logProgress } from "./utils/logger";
import { prisma } from "./utils/prisma-client";

const DATA_ROOT = path.join(__dirname, "..", "Freshteam Export Masterdata");

const STATUS_FOLDERS = [
  { folder: "Closed Positions_Freshteam Data", status: "Closed", candidateData: "Closed Positions Candidate Data" },
  { folder: "Hold Positions_Freshteam Data", status: "Hold", candidateData: "Hold Positions Candidate Data" },
  { folder: "Private Positions_Freshteam Data", status: "Private", candidateData: "Private Positions_Candidate Data" },
  { folder: "Published Positions_Freshteam Data", status: "Published", candidateData: "Published Positons_Candidates Data" },
];

interface CandidateRow {
  "First name": string;
  "Middle name": string;
  "Last name": string;
  "Email": string;
  "Phone": string;
  "Mobile": string;
  "Applicant source name": string;
  "Applicant source category name": string;
  "Candidate source name": string;
  "Candidate source category name": string;
  "Job posting title": string;
  "Owner name": string;
  "Candidate status": string;
  "Hiring stage": string;
  "Hiring substage": string;
  "Created at": string;
  "Updated at": string;
  "Referrer name": string;
  "Reject reason": string;
  "Job fitment rating": string;
  "Total Experience": string;
  "Gender": string;
  "Date of birth": string;
  "Skype id": string;
  "Street": string;
  "City": string;
  "State": string;
  "Country": string;
  "Zip code": string;
  "Profile urls": string;
  "Tags": string;
  "Skills": string;
}

function parseSkills(skillsStr: string): string[] {
  if (!skillsStr || skillsStr.trim() === "") return [];
  return skillsStr
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 200);
}

function parseTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === "") return [];
  return tagsStr
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 200);
}

async function main() {
  log("import-candidates", "Starting candidate import...");

  let totalCandidates = 0;
  let totalApplications = 0;
  let skipped = 0;

  for (const { folder, status, candidateData } of STATUS_FOLDERS) {
    const candidateDataDir = path.join(DATA_ROOT, folder, candidateData);
    if (!fs.existsSync(candidateDataDir)) {
      log("import-candidates", `Skipping ${folder} — not found`);
      continue;
    }

    const jobFolders = fs.readdirSync(candidateDataDir).filter(f =>
      fs.statSync(path.join(candidateDataDir, f)).isDirectory()
    );

    log("import-candidates", `Processing ${jobFolders.length} ${status} positions...`);

    for (let j = 0; j < jobFolders.length; j++) {
      const jobFolder = jobFolders[j];
      const csvPath = path.join(candidateDataDir, jobFolder, "All_Candidates.csv");

      if (!fs.existsSync(csvPath)) {
        log("import-candidates", `No All_Candidates.csv in ${jobFolder}`);
        continue;
      }

      // Find matching job record
      const job = await prisma.job.findFirst({
        where: { folderName: jobFolder },
      });

      if (!job) {
        log("import-candidates", `No job record found for folder: ${jobFolder}`);
        continue;
      }

      let rows: CandidateRow[];
      try {
        rows = parseCSV<CandidateRow>(csvPath);
      } catch (e) {
        log("import-candidates", `Error parsing CSV for ${jobFolder}: ${e}`);
        continue;
      }

      for (const row of rows) {
        const email = row["Email"]?.trim().toLowerCase();
        if (!email || email === "" || !email.includes("@")) {
          skipped++;
          continue;
        }

        const skills = parseSkills(row["Skills"] || "");
        const tags = parseTags(row["Tags"] || "");

        // Upsert candidate
        const candidate = await prisma.candidate.upsert({
          where: { email },
          create: {
            email,
            firstName: row["First name"]?.trim() || null,
            middleName: row["Middle name"]?.trim() || null,
            lastName: row["Last name"]?.trim() || null,
            phone: row["Phone"]?.trim() || null,
            mobile: row["Mobile"]?.trim() || null,
            gender: row["Gender"]?.trim() || null,
            dateOfBirth: row["Date of birth"]?.trim() || null,
            skypeId: row["Skype id"]?.trim() || null,
            street: row["Street"]?.trim() || null,
            city: row["City"]?.trim() || null,
            state: row["State"]?.trim() || null,
            country: row["Country"]?.trim() || null,
            zipCode: row["Zip code"]?.trim() || null,
            profileUrls: row["Profile urls"]?.trim() || null,
            skills,
            tags,
          },
          update: {
            // Merge skills and tags, fill in missing fields
            firstName: row["First name"]?.trim() || undefined,
            lastName: row["Last name"]?.trim() || undefined,
            phone: row["Phone"]?.trim() || undefined,
            mobile: row["Mobile"]?.trim() || undefined,
            gender: row["Gender"]?.trim() || undefined,
            city: row["City"]?.trim() || undefined,
            state: row["State"]?.trim() || undefined,
            country: row["Country"]?.trim() || undefined,
          },
        });

        // Merge skills that aren't already present
        if (skills.length > 0) {
          const existing = await prisma.candidate.findUnique({
            where: { id: candidate.id },
            select: { skills: true },
          });
          const existingSkills = new Set(existing?.skills?.map(s => s.toUpperCase()) || []);
          const newSkills = skills.filter(s => !existingSkills.has(s.toUpperCase()));
          if (newSkills.length > 0) {
            await prisma.candidate.update({
              where: { id: candidate.id },
              data: { skills: { push: newSkills } },
            });
          }
        }

        // Create application
        const appliedAt = parseDate(row["Created at"]);
        const lastUpdatedAt = parseDate(row["Updated at"]);

        try {
          await prisma.application.upsert({
            where: {
              candidateId_jobId_applicantId: {
                candidateId: candidate.id,
                jobId: job.id,
                applicantId: "pending",
              },
            },
            create: {
              candidateId: candidate.id,
              jobId: job.id,
              applicantId: "pending",
              applicantSourceName: row["Applicant source name"]?.trim() || null,
              applicantSourceCategory: row["Applicant source category name"]?.trim() || null,
              candidateSourceName: row["Candidate source name"]?.trim() || null,
              candidateSourceCategory: row["Candidate source category name"]?.trim() || null,
              ownerName: row["Owner name"]?.trim() || null,
              candidateStatus: row["Candidate status"]?.trim() || null,
              hiringStage: row["Hiring stage"]?.trim() || null,
              hiringSubstage: row["Hiring substage"]?.trim() || null,
              referrerName: row["Referrer name"]?.trim() || null,
              rejectReason: row["Reject reason"]?.trim() || null,
              jobFitmentRating: row["Job fitment rating"]?.trim() || null,
              totalExperience: row["Total Experience"]?.trim() || null,
              appliedAt,
              lastUpdatedAt,
            },
            update: {
              candidateStatus: row["Candidate status"]?.trim() || undefined,
              hiringStage: row["Hiring stage"]?.trim() || undefined,
              hiringSubstage: row["Hiring substage"]?.trim() || undefined,
            },
          });
          totalApplications++;
        } catch {
          // Duplicate — try with a unique applicantId
          try {
            await prisma.application.create({
              data: {
                candidateId: candidate.id,
                jobId: job.id,
                applicantId: `${email}_${job.id}`,
                applicantSourceName: row["Applicant source name"]?.trim() || null,
                applicantSourceCategory: row["Applicant source category name"]?.trim() || null,
                candidateSourceName: row["Candidate source name"]?.trim() || null,
                candidateSourceCategory: row["Candidate source category name"]?.trim() || null,
                ownerName: row["Owner name"]?.trim() || null,
                candidateStatus: row["Candidate status"]?.trim() || null,
                hiringStage: row["Hiring stage"]?.trim() || null,
                hiringSubstage: row["Hiring substage"]?.trim() || null,
                referrerName: row["Referrer name"]?.trim() || null,
                rejectReason: row["Reject reason"]?.trim() || null,
                jobFitmentRating: row["Job fitment rating"]?.trim() || null,
                totalExperience: row["Total Experience"]?.trim() || null,
                appliedAt,
                lastUpdatedAt,
              },
            });
            totalApplications++;
          } catch {
            skipped++;
          }
        }

        totalCandidates++;
      }

      logProgress("import-candidates", j + 1, jobFolders.length);
    }
  }

  log("import-candidates", `Done. Candidates processed: ${totalCandidates}, Applications: ${totalApplications}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
