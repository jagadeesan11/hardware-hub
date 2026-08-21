import { execSync } from 'node:child_process';
import { platform } from 'node:process';

/**
 * Stops every dev server for this project.
 *
 * Two passes are needed. Killing by port misses orphaned `tsx watch`
 * supervisors: when their child crashes they keep running while binding
 * nothing, so they are invisible to netstat/lsof yet still hold file watches
 * and reappear as ghosts. The second pass matches on the process command line.
 */
const PORTS = [4000, 5173, 5174];
const PROJECT = 'hardware-hub';
const killed = new Set();

const run = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

const kill = (pid, why) => {
  if (!pid || pid === '0' || killed.has(pid)) return;
  try {
    run(platform === 'win32' ? `taskkill /PID ${pid} /T /F` : `kill -9 ${pid}`);
    killed.add(pid);
    console.log(`  killed pid ${pid} (${why})`);
  } catch {
    // Already exited, or died as part of a parent's tree kill.
  }
};

// Pass 1 — anything holding a dev port.
for (const port of PORTS) {
  try {
    if (platform === 'win32') {
      for (const line of run(`netstat -ano | findstr :${port}`).split('\n')) {
        if (line.includes('LISTENING')) kill(line.trim().split(/\s+/).pop(), `port ${port}`);
      }
    } else {
      for (const pid of run(`lsof -ti:${port}`).trim().split('\n')) kill(pid, `port ${port}`);
    }
  } catch {
    // Nothing on this port — the good case.
  }
}

// Pass 2 — portless orphans (watchers whose child already died).
try {
  if (platform === 'win32') {
    const csv = run(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Where-Object { $_.CommandLine -like '*${PROJECT}*' -and $_.CommandLine -notlike '*claude*' -and $_.CommandLine -notlike '*kill-dev*' } | ForEach-Object { $_.ProcessId }"`,
    );
    for (const pid of csv.trim().split('\n')) kill(pid.trim(), 'orphaned watcher');
  } else {
    for (const pid of run(`pgrep -f "${PROJECT}.*(tsx|vite|concurrently)"`).trim().split('\n')) {
      kill(pid, 'orphaned watcher');
    }
  }
} catch {
  // No orphans found.
}

console.log(killed.size === 0 ? 'No dev servers were running.' : `Stopped ${killed.size} process(es).`);
