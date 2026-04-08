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

interface QualificationRow {
  "Email": string;
  "Institute Name": string;
  "Field of study": string;
  "Degree": string;
  "Summary": string;
  "Grade": string;
  "Start Date": string;
  "End Date": string;
  "In Progress": string;
}

async function main() {
  log("import-qualifications", "Starting qualification import...");

  let total = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const { folder, candidateData } of STATUS_FOLDERS) {
    const candidateDataDir = path.join(DATA_ROOT, folder, candidateData);
    if (!fs.existsSync(candidateDataDir)) continue;

    const jobFolders = fs.readdirSync(candidateDataDir).filter(f =>
      fs.statSync(path.join(candidateDataDir, f)).isDirectory()
    );

    log("import-qualifications", `Processing ${jobFolders.length} folders in ${folder}...`);

    for (let j = 0; j < jobFolders.length; j++) {
      const csvPath = path.join(candidateDataDir, jobFolders[j], "All_Candidates_qualifications.csv");
      if (!fs.existsSync(csvPath)) continue;

      let rows: QualificationRow[];
      try {
        rows = parseCSV<QualificationRow>(csvPath);
      } catch (e) {
        log("import-qualifications", `Error parsing ${jobFolders[j]}: ${e}`);
        continue;
      }

      for (const row of rows) {
        const email = row["Email"]?.trim().toLowerCase();
        if (!email || !email.includes("@")) { skipped++; continue; }

        const institute = row["Institute Name"]?.trim() || "";
        const degree = row["Degree"]?.trim() || "";

        // Deduplicate
        const key = `${email}|${institute}|${degree}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const candidate = await prisma.candidate.findUnique({ where: { email } });
        if (!candidate) { skipped++; continue; }

        await prisma.qualification.create({
          data: {
            candidateId: candidate.id,
            instituteName: institute || null,
            fieldOfStudy: row["Field of study"]?.trim() || null,
            degree: degree || null,
            summary: row["Summary"]?.trim() || null,
            grade: row["Grade"]?.trim() || null,
            startDate: row["Start Date"]?.trim() || null,
            endDate: row["End Date"]?.trim() || null,
            inProgress: row["In Progress"]?.trim().toLowerCase() === "yes",
          },
        });
        total++;
      }

      logProgress("import-qualifications", j + 1, jobFolders.length);
    }
  }

  log("import-qualifications", `Done. Qualifications imported: ${total}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
