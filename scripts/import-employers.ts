import fs from "fs";
import path from "path";
import { parseCSV } from "./utils/csv-parser";
import { log, logProgress } from "./utils/logger";
import { prisma } from "./utils/prisma-client";

const DATA_ROOT = path.join(__dirname, "..", "Freshteam Export Masterdata");

const STATUS_FOLDERS = [
  { folder: "Closed Positions_Freshteam Data", candidateData: "Closed Positions Candidate Data" },
  { folder: "Hold Positions_Freshteam Data", candidateData: "Hold Positions Candidate Data" },
  { folder: "Private Positions_Freshteam Data", candidateData: "Private Positions_Candidate Data" },
  { folder: "Published Positions_Freshteam Data", candidateData: "Published Positons_Candidates Data" },
];

interface EmployerRow {
  "Email": string;
  "Employer Name": string;
  "Designation": string;
  "Job Description": string;
  "Start Date": string;
  "End Date": string;
  "Current Employer": string;
}

async function main() {
  log("import-employers", "Starting employer import...");

  let total = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const { folder, candidateData } of STATUS_FOLDERS) {
    const candidateDataDir = path.join(DATA_ROOT, folder, candidateData);
    if (!fs.existsSync(candidateDataDir)) continue;

    const jobFolders = fs.readdirSync(candidateDataDir).filter(f =>
      fs.statSync(path.join(candidateDataDir, f)).isDirectory()
    );

    log("import-employers", `Processing ${jobFolders.length} folders in ${folder}...`);

    for (let j = 0; j < jobFolders.length; j++) {
      const csvPath = path.join(candidateDataDir, jobFolders[j], "All_Candidates_employers.csv");
      if (!fs.existsSync(csvPath)) continue;

      let rows: EmployerRow[];
      try {
        rows = parseCSV<EmployerRow>(csvPath);
      } catch (e) {
        log("import-employers", `Error parsing ${jobFolders[j]}: ${e}`);
        continue;
      }

      for (const row of rows) {
        const email = row["Email"]?.trim().toLowerCase();
        if (!email || !email.includes("@")) { skipped++; continue; }

        const employerName = row["Employer Name"]?.trim() || "";
        const startDate = row["Start Date"]?.trim() || "";

        // Deduplicate by email + employer + start date
        const key = `${email}|${employerName}|${startDate}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const candidate = await prisma.candidate.findUnique({ where: { email } });
        if (!candidate) { skipped++; continue; }

        await prisma.employer.create({
          data: {
            candidateId: candidate.id,
            employerName: employerName || null,
            designation: row["Designation"]?.trim() || null,
            jobDescription: row["Job Description"]?.trim() || null,
            startDate: startDate || null,
            endDate: row["End Date"]?.trim() || null,
            currentEmployer: row["Current Employer"]?.trim().toLowerCase() === "yes",
          },
        });
        total++;
      }

      logProgress("import-employers", j + 1, jobFolders.length);
    }
  }

  log("import-employers", `Done. Employers imported: ${total}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
