import WebSocket from 'ws';

console.log('=== Agent ID Debug Tool ===\n');

const ws = new WebSocket('ws://localhost:7878');

const sessions = new Map();

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Waiting for sessions...\n');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === 'init') {
    console.log('📥 Received init message');
    console.log(`   Sessions: ${message.sessions?.length || 0}\n`);

    message.sessions?.forEach((session, idx) => {
      sessions.set(session.sessionId, session);

      const toolLabel = session.tool || 'unknown';
      const agentId = session.agentId || 'null';
      const model = session.model || 'null';
      const name = session.name || 'unknown';

      console.log(`${idx + 1}. ${toolLabel} - ${name}`);
      console.log(`   Session ID: ${session.sessionId?.substring(0, 20)}...`);
      console.log(`   Agent ID: ${agentId}`);
      console.log(`   Model: ${model}\n`);
    });

    analyzeSessions();
  } else if (message.type === 'session_init') {
    console.log('📥 New session initialized');
    console.log(`   Tool: ${message.tool}`);
    console.log(`   Name: ${message.name}`);
    console.log(`   Agent ID: ${message.agentId || 'null'}`);
    console.log(`   Model: ${message.model || 'null'}\n`);

    sessions.set(message.sessionId, message);
    analyzeSessions();
  } else if (message.type === 'session_update') {
    console.log('📥 Session updated');
    console.log(`   Session ID: ${message.sessionId?.substring(0, 20)}...`);
    console.log(`   Agent ID: ${message.agentId || 'null'}`);
    console.log(`   Model: ${message.model || 'null'}\n`);

    const existing = sessions.get(message.sessionId);
    if (existing) {
      sessions.set(message.sessionId, {
        ...existing,
        agentId: message.agentId ?? existing.agentId ?? null,
        model: message.model ?? existing.model ?? null
      });
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('WebSocket closed');
});

function analyzeSessions() {
  const sessionArray = Array.from(sessions.values());

  if (sessionArray.length === 0) return;

  console.log('=== Analysis ===\n');

  const openclawSessions = sessionArray.filter(s => s.tool === 'openclaw');
  console.log(`Total sessions: ${sessionArray.length}`);
  console.log(`OpenClaw sessions: ${openclawSessions.length}\n`);

  if (openclawSessions.length > 0) {
    console.log('OpenClaw Sessions:');
    openclawSessions.forEach((session, idx) => {
      const hasAgentId = session.agentId !== null && session.agentId !== undefined;
      const hasModel = session.model !== null && session.model !== undefined;

      console.log(`${idx + 1}. ${session.name}`);
      console.log(`   Has Agent ID: ${hasAgentId ? '✅ YES' : '❌ NO'} (${session.agentId})`);
      console.log(`   Has Model: ${hasModel ? '✅ YES' : '❌ NO'} (${session.model})`);

      if (!hasAgentId) {
        console.log(`   ⚠️  This session should have agentId but doesn't!`);
      }
    });

    const withAgentId = openclawSessions.filter(s => s.agentId);
    const withoutAgentId = openclawSessions.filter(s => !s.agentId);

    console.log(`\nSummary:`);
    console.log(`  With agentId: ${withAgentId.length}`);
    console.log(`  Without agentId: ${withoutAgentId.length}`);

    if (withoutAgentId.length > 0) {
      console.log(`\n❌ PROBLEM: Some OpenClaw sessions don't have agentId!`);
    } else {
      console.log(`\n✅ All OpenClaw sessions have agentId!`);
    }
  }
}

// Close after 10 seconds
setTimeout(() => {
  console.log('\n=== Done ===');
  ws.close();
  process.exit(0);
}, 10000);