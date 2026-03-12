import path from 'path';

// 从 OpenClaw parser 复制函数逻辑
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

// 测试用例
const testPaths = [
  '/Users/ericmr/.openclaw/agents/jarvis/sessions/399557ec-0d7b-4cc4-8113-a9cb15ecccf1.jsonl',
  '/Users/ericmr/.openclaw/agents/main/sessions/00c50fcc-4681-4a36-aa8e-368442f484d6.jsonl',
  '/Users/ericmr/.openclaw/agents/social-media-assistant/sessions/abc123.jsonl',
  null,
  '/invalid/path.jsonl'
];

console.log('Testing getAgentId function:');
console.log('');

testPaths.forEach((testPath) => {
  const result = getAgentId(testPath);
  console.log(`Path: ${testPath}`);
  console.log(`Agent ID: ${result}`);
  console.log('---');
});