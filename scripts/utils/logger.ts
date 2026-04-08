export function log(step: string, message: string) {
  console.log(`[${step}] ${message}`);
}

export function logProgress(step: string, current: number, total: number) {
  if (current % 50 === 0 || current === total) {
    console.log(`[${step}] ${current}/${total} (${Math.round((current / total) * 100)}%)`);
  }
}
