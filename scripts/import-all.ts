import { execSync } from "child_process";
import path from "path";

const scripts = [
  "import-jobs.ts",
  "import-candidates.ts",
  "import-employers.ts",
  "import-qualifications.ts",
  "import-feedback.ts",
  "import-resumes.ts",
];

console.log("=== NuHire ATS: Full Data Import ===\n");

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\n▶ Running ${script}...`);
  console.log("─".repeat(50));

  try {
    execSync(`npx tsx "${scriptPath}"`, {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      timeout: 600000, // 10 minutes per script
    });
    console.log(`✓ ${script} completed`);
  } catch (e) {
    console.error(`✗ ${script} failed:`, e);
    process.exit(1);
  }
}

console.log("\n=== Import Complete ===");
