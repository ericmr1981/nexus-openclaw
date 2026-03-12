import path from 'path';
import fs from 'fs';

// 复制 getAgentId 函数
function getAgentId(filePath) {
  if (!filePath) return null;
  const parts = String(filePath).split(path.sep);
  const idx = parts.lastIndexOf('agents');
  if (idx >= 0 && idx + 1 < parts.length) {
    const agentId = parts[idx + 1];
    return agentId || null;
  }
  return null;
}

// 获取实际的活动会话文件
const agentsDir = path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'agents');

console.log('Scanning OpenClaw agents directory:', agentsDir);
console.log('');

if (fs.existsSync(agentsDir)) {
  const agents = fs.readdirSync(agentsDir);

  for (const agent of agents) {
    const agentPath = path.join(agentsDir, agent);
    const sessionsDir = path.join(agentPath, 'sessions');

    if (fs.existsSync(sessionsDir)) {
      const files = fs.readdirSync(sessionsDir);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

      if (jsonlFiles.length > 0) {
        // 按修改时间排序
        const filesWithStats = jsonlFiles.map(f => ({
          file: f,
          path: path.join(sessionsDir, f),
          mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs
        })).sort((a, b) => b.mtime - a.mtime);

        const latest = filesWithStats[0];
        const agentId = getAgentId(latest.path);

        console.log(`Agent: ${agent}`);
        console.log(`  Latest session: ${latest.file}`);
        console.log(`  File path: ${latest.path}`);
        console.log(`  Extracted agentId: ${agentId}`);
        console.log(`  Last modified: ${new Date(latest.mtime).toISOString()}`);
        console.log('');
      }
    }
  }
} else {
  console.log('OpenClaw agents directory not found');
}