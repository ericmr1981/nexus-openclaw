import path from 'path';
import fs from 'fs';

// Import the parser functions
import { getAgentId as parseAgentId } from '../server/parsers/openclaw.js';

// Get the latest OpenClaw session file
const agentsDir = path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'agents');

console.log('=== OpenClaw Agent ID Debug ===');
console.log('');

// Scan for the most recent session
let mostRecentSession = null;
let mostRecentTime = 0;

if (fs.existsSync(agentsDir)) {
  const agents = fs.readdirSync(agentsDir);

  for (const agent of agents) {
    const agentPath = path.join(agentsDir, agent);
    const sessionsDir = path.join(agentPath, 'sessions');

    if (fs.existsSync(sessionsDir)) {
      try {
        const files = fs.readdirSync(sessionsDir);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

        for (const file of jsonlFiles) {
          const filePath = path.join(sessionsDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs > mostRecentTime) {
              mostRecentTime = stats.mtimeMs;
              mostRecentSession = {
                filePath,
                file,
                agent,
                mtime: stats.mtimeMs
              };
            }
          } catch (e) {
            // Skip inaccessible files
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    }
  }
}

if (mostRecentSession) {
  console.log('Most recent session:');
  console.log(`  File: ${mostRecentSession.file}`);
  console.log(`  Path: ${mostRecentSession.filePath}`);
  console.log(`  Agent directory: ${mostRecentSession.agent}`);
  console.log(`  Modified: ${new Date(mostRecentSession.mtime).toISOString()}`);
  console.log('');

  const agentId = parseAgentId(mostRecentSession.filePath);
  console.log(`Extracted agentId: ${agentId}`);
  console.log('');

  // Test path parsing
  const parts = mostRecentSession.filePath.split(path.sep);
  console.log('Path parts:');
  parts.forEach((part, idx) => {
    console.log(`  [${idx}] ${part}`);
  });
  console.log('');

  const agentsIdx = parts.lastIndexOf('agents');
  console.log(`Index of 'agents': ${agentsIdx}`);
  if (agentsIdx >= 0 && agentsIdx + 1 < parts.length) {
    console.log(`Agent ID at index ${agentsIdx + 1}: ${parts[agentsIdx + 1]}`);
  }
  console.log('');

  // Check if the session would be considered active
  const now = Date.now();
  const ageMinutes = (now - mostRecentTime) / (1000 * 60);
  console.log(`Session age: ${ageMinutes.toFixed(1)} minutes`);
  console.log(`Active threshold: ${45} minutes (OPENCLAW_DISCOVERY_MTIME_GRACE_MS)`);
  console.log(`Would be discovered: ${ageMinutes < 45 ? 'YES' : 'NO'}`);
} else {
  console.log('No OpenClaw sessions found');
}