#!/usr/bin/env node

/**
 * Unit tests for Nexus server functionality
 * Following TDD principles - tests written before implementation improvements
 */

import assert from 'assert';
import http from 'http';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

// Import modules to test
import * as ClaudeCodeParser from '../../server/parsers/claude-code.js';
import * as CodexParser from '../../server/parsers/codex.js';
import * as OpenClawParser from '../../server/parsers/openclaw.js';
import * as FileMonitor from '../../server/monitors/file-monitor.js';
import * as SessionManager from '../../server/session-manager.js';
import * as UsageManager from '../../server/usage/usage-manager.js';
import * as PricingService from '../../server/usage/pricing-service.js';

console.log('='.repeat(60));
console.log('Nexus Server Unit Tests');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function pass(test) {
  console.log(`✅ ${test}`);
  testsPassed++;
}

function fail(test, reason) {
  console.log(`❌ ${test}`);
  if (reason) console.log(`   Reason: ${reason}`);
  testsFailed++;
}

// Test Claude Code Parser
function testClaudeCodeParser() {
  console.log('\n--- Claude Code Parser Tests ---');

  // Test basic parsing
  try {
    const message = ClaudeCodeParser.parseMessage('{"type":"content","role":"user","content":"Hello"}');
    if (message && message.role === 'user' && message.content === 'Hello') {
      pass('Claude Code parseMessage works');
    } else {
      fail('Claude Code parseMessage failed');
    }
  } catch (error) {
    fail('Claude Code parseMessage threw error', error.message);
  }

  // Test session ID extraction
  try {
    const sessionId = ClaudeCodeParser.getSessionId('/home/user/.claude/projects/test-123abc/session.jsonl');
    if (typeof sessionId === 'string' && sessionId.length > 0) {
      pass('Claude Code getSessionId works');
    } else {
      fail('Claude Code getSessionId failed');
    }
  } catch (error) {
    fail('Claude Code getSessionId threw error', error.message);
  }

  // Test project name extraction
  try {
    const projectName = ClaudeCodeParser.getProjectName('/home/user/.claude/projects/test-123abc');
    if (typeof projectName === 'string' && projectName.length > 0) {
      pass('Claude Code getProjectName works');
    } else {
      fail('Claude Code getProjectName failed');
    }
  } catch (error) {
    fail('Claude Code getProjectName threw error', error.message);
  }
}

// Test OpenClaw Parser
function testOpenClawParser() {
  console.log('\n--- OpenClaw Parser Tests ---');

  // Test message parsing
  try {
    const message = OpenClawParser.parseMessage('{"type":"message","message":{"role":"assistant","content":"Hello"}}');
    if (message && message.role === 'assistant' && message.content === 'Hello') {
      pass('OpenClaw parseMessage works');
    } else {
      fail('OpenClaw parseMessage failed');
    }
  } catch (error) {
    fail('OpenClaw parseMessage threw error', error.message);
  }

  // Test session ID extraction
  try {
    const sessionId = OpenClawParser.getSessionId('/home/user/.openclaw/agents/test/sessions/abc123.jsonl');
    if (typeof sessionId === 'string' && sessionId === 'abc123') {
      pass('OpenClaw getSessionId works');
    } else {
      fail('OpenClaw getSessionId failed');
    }
  } catch (error) {
    fail('OpenClaw getSessionId threw error', error.message);
  }

  // Test agent ID extraction
  try {
    const agentId = OpenClawParser.getAgentId('/home/user/.openclaw/agents/my-agent/sessions/abc123.jsonl');
    if (typeof agentId === 'string' && agentId === 'my-agent') {
      pass('OpenClaw getAgentId works');
    } else {
      fail('OpenClaw getAgentId failed');
    }
  } catch (error) {
    fail('OpenClaw getAgentId threw error', error.message);
  }

  // Test usage event parsing
  try {
    const usageEvent = OpenClawParser.parseUsageEvent('{"type":"message","message":{"id":"test","model":"claude-3","usage":{"input":10,"output":20,"cost":{"total":0.01}}}}');
    if (usageEvent && usageEvent.model === 'claude-3' && usageEvent.directCostUsd === 0.01) {
      pass('OpenClaw parseUsageEvent works');
    } else {
      fail('OpenClaw parseUsageEvent failed');
    }
  } catch (error) {
    fail('OpenClaw parseUsageEvent threw error', error.message);
  }
}

// Test Session Manager
function testSessionManager() {
  console.log('\n--- Session Manager Tests ---');

  // Test initialization
  try {
    SessionManager.init();
    pass('SessionManager.init works');
  } catch (error) {
    fail('SessionManager.init failed', error.message);
  }

  // Test creating a session
  try {
    const sessionId = 'test-session-' + Date.now();
    SessionManager.createSession(sessionId, 'test-tool', 'Test Project', '/tmp/test.jsonl', '/tmp', { agentId: 'test-agent', model: 'test-model' });

    const session = SessionManager.getSession(sessionId);
    if (session && session.sessionId === sessionId && session.name === 'Test Project') {
      pass('SessionManager.createSession works');
    } else {
      fail('SessionManager.createSession failed');
    }
  } catch (error) {
    fail('SessionManager.createSession threw error', error.message);
  }

  // Test adding messages
  try {
    const sessionId = 'test-session-msgs-' + Date.now();
    SessionManager.createSession(sessionId, 'test-tool', 'Test Project 2', '/tmp/test2.jsonl', '/tmp', {});

    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ];

    SessionManager.addMessages(sessionId, messages);
    const session = SessionManager.getSession(sessionId);

    if (session && session.messages && session.messages.length === 2) {
      pass('SessionManager.addMessages works');
    } else {
      fail('SessionManager.addMessages failed');
    }
  } catch (error) {
    fail('SessionManager.addMessages threw error', error.message);
  }
}

// Test Usage Manager
function testUsageManager() {
  console.log('\n--- Usage Manager Tests ---');

  // Test initialization
  try {
    UsageManager.init();
    pass('UsageManager.init works');
  } catch (error) {
    fail('UsageManager.init failed', error.message);
  }

  // Test basic usage ingestion
  try {
    const result = UsageManager.ingestUsageEvent({
      sessionId: 'test-session',
      tool: 'test-tool',
      event: {
        kind: 'delta',
        model: 'claude-3',
        directCostUsd: 0.01,
        tokens: { inputTokens: 10, outputTokens: 20 }
      },
      calculateCostUsd: PricingService.calculateCostUsd,
      calculateCostBreakdown: PricingService.calculateCostBreakdown,
      getPricingMeta: PricingService.getPricingMeta
    });

    if (typeof result === 'boolean') {
      pass('UsageManager.ingestUsageEvent works');
    } else {
      fail('UsageManager.ingestUsageEvent failed');
    }
  } catch (error) {
    fail('UsageManager.ingestUsageEvent threw error', error.message);
  }

  // Test getting usage totals
  try {
    const totals = UsageManager.getUsageTotals();
    if (totals && totals.totals && typeof totals.totals.totalCostUsd === 'number') {
      pass('UsageManager.getUsageTotals works');
    } else {
      fail('UsageManager.getUsageTotals failed');
    }
  } catch (error) {
    fail('UsageManager.getUsageTotals threw error', error.message);
  }
}

// Run all tests
testClaudeCodeParser();
testOpenClawParser();
testSessionManager();
testUsageManager();

console.log('');
console.log('='.repeat(60));
console.log('Unit Test Summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log('');

if (testsFailed === 0) {
  console.log('🎉 All unit tests PASSED!');
} else {
  console.log('⚠️  Some unit tests failed. Please review the errors above.');
}

process.exit(testsFailed > 0 ? 1 : 0);