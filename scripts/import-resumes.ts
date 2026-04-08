import fs from "fs";
import path from "path";
import { log, logProgress } from "./utils/logger";
import { prisma } from "./utils/prisma-client";

const RESUMES_DIR = path.join(__dirname, "..", "Freshteam Export Masterdata", "Resumes");

// Known email domain patterns in filenames
const DOMAIN_PATTERNS = [
  "gmail_com", "yahoo_com", "hotmail_com", "outlook_com",
  "nutechnologyinc_com", "nulogic_co", "rediffmail_com",
  "live_com", "icloud_com", "ymail_com", "aol_com",
  "protonmail_com", "zoho_com", "mail_com",
];

function reconstructEmail(filenamePart: string): string | null {
  // The filename format is: {email_underscored}_{applicantId}.{ext}
  // email has @ replaced with _ and . replaced with _
  // applicantId is a ~10 digit number at the end

  let emailPart = filenamePart;

  // Try to find known domain patterns
  for (const domain of DOMAIN_PATTERNS) {
    const idx = emailPart.toLowerCase().lastIndexOf(domain);
    if (idx > 0) {
      const localPart = emailPart.substring(0, idx - 1); // -1 for the underscore before domain
      const actualDomain = domain.replace("_", ".");
      return `${localPart}@${actualDomain}`.toLowerCase();
    }
  }

  // Fallback: try to find _com, _in, _org, _net patterns
  const domainMatch = emailPart.match(/^(.+?)_([a-zA-Z0-9._]+)_(com|in|org|net|co|io|edu)$/i);
  if (domainMatch) {
    const local = domainMatch[1];
    const domain = domainMatch[2];
    const tld = domainMatch[3];
    return `${local}@${domain}.${tld}`.toLowerCase();
  }

  return null;
}

async function main() {
  log("import-resumes", "Starting resume mapping...");

  if (!fs.existsSync(RESUMES_DIR)) {
    log("import-resumes", "Resumes directory not found!");
    return;
  }

  // Build a map of all known applicantIds from applications
  const allApps = await prisma.application.findMany({
    where: { applicantId: { not: null } },
    select: { id: true, applicantId: true, candidateId: true },
  });
  const appByApplicantId = new Map<string, string>();
  for (const app of allApps) {
    if (app.applicantId) appByApplicantId.set(app.applicantId, app.id);
  }
  log("import-resumes", `Loaded ${appByApplicantId.size} application IDs`);

  // Build email to candidate map
  const allCandidates = await prisma.candidate.findMany({
    select: { id: true, email: true },
  });
  const candidateByEmail = new Map<string, string>();
  for (const c of allCandidates) {
    candidateByEmail.set(c.email.toLowerCase(), c.id);
  }
  log("import-resumes", `Loaded ${candidateByEmail.size} candidate emails`);

  const resumeFolders = fs.readdirSync(RESUMES_DIR).filter(f =>
    fs.statSync(path.join(RESUMES_DIR, f)).isDirectory()
  );

  let mapped = 0;
  let unmapped = 0;
  let totalFiles = 0;

  for (const folder of resumeFolders) {
    const folderPath = path.join(RESUMES_DIR, folder);
    const files = fs.readdirSync(folderPath);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      totalFiles++;

      const ext = path.extname(file);
      const nameWithoutExt = file.replace(ext, "");

      // Extract applicantId (last numeric segment)
      const parts = nameWithoutExt.split("_");
      const lastPart = parts[parts.length - 1];
      let applicantId: string | null = null;
      let emailPart: string | null = null;

      if (/^\d{7,}$/.test(lastPart)) {
        applicantId = lastPart;
        emailPart = parts.slice(0, -1).join("_");
      }

      const resumePath = path.join(folderPath, file);

      // Strategy 1: Match by applicantId
      if (applicantId && appByApplicantId.has(applicantId)) {
        const appId = appByApplicantId.get(applicantId)!;
        await prisma.application.update({
          where: { id: appId },
          data: { resumePath },
        });
        mapped++;
        continue;
      }

      // Strategy 2: Reconstruct email and find candidate, then link to any application
      if (emailPart) {
        const email = reconstructEmail(emailPart);
        if (email && candidateByEmail.has(email)) {
          const candidateId = candidateByEmail.get(email)!;
          // Update the first application without a resume
          const app = await prisma.application.findFirst({
            where: { candidateId, resumePath: null },
          });
          if (app) {
            await prisma.application.update({
              where: { id: app.id },
              data: { resumePath },
            });
            mapped++;
            continue;
          }
        }
      }

      unmapped++;
    }

    logProgress("import-resumes", totalFiles, 10448);
  }

  log("import-resumes", `Done. Total files: ${totalFiles}, Mapped: ${mapped}, Unmapped: ${unmapped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
