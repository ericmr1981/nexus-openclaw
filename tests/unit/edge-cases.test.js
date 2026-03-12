#!/usr/bin/env node

/**
 * Edge case and error handling tests for Nexus
 * Following TDD principles - testing error conditions and edge cases
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('='.repeat(60));
console.log('Nexus Edge Case & Error Handling Tests');
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

// Import modules to test edge cases
import * as ClaudeCodeParser from '../../server/parsers/claude-code.js';
import * as CodexParser from '../../server/parsers/codex.js';
import * as OpenClawParser from '../../server/parsers/openclaw.js';
import * as FileMonitor from '../../server/monitors/file-monitor.js';
import * as SessionManager from '../../server/session-manager.js';
import * as UsageManager from '../../server/usage/usage-manager.js';

// Test edge cases for Claude Code Parser
function testClaudeCodeParserEdgeCases() {
  console.log('\n--- Claude Code Parser Edge Cases ---');

  // Test with null/undefined inputs
  try {
    const result1 = ClaudeCodeParser.parseMessage(null);
    if (result1 === null) {
      pass('Claude Code parseMessage handles null input');
    } else {
      fail('Claude Code parseMessage does not handle null input');
    }
  } catch (error) {
    fail('Claude Code parseMessage throws on null input', error.message);
  }

  try {
    const result2 = ClaudeCodeParser.parseMessage(undefined);
    if (result2 === null) {
      pass('Claude Code parseMessage handles undefined input');
    } else {
      fail('Claude Code parseMessage does not handle undefined input');
    }
  } catch (error) {
    fail('Claude Code parseMessage throws on undefined input', error.message);
  }

  try {
    const result3 = ClaudeCodeParser.parseMessage('');
    if (result3 === null) {
      pass('Claude Code parseMessage handles empty string');
    } else {
      fail('Claude Code parseMessage does not handle empty string');
    }
  } catch (error) {
    fail('Claude Code parseMessage throws on empty string', error.message);
  }

  try {
    const result4 = ClaudeCodeParser.parseMessage('{"invalid": json}');
    if (result4 === null) {
      pass('Claude Code parseMessage handles invalid JSON');
    } else {
      fail('Claude Code parseMessage does not handle invalid JSON');
    }
  } catch (error) {
    fail('Claude Code parseMessage throws on invalid JSON', error.message);
  }

  // Test with non-string/non-object content
  try {
    const result5 = ClaudeCodeParser.parseMessage('{"role":"user","content":123}');
    if (result5 && result5.role === 'user' && result5.content === '123') {
      pass('Claude Code parseMessage handles numeric content');
    } else {
      fail('Claude Code parseMessage does not handle numeric content');
    }
  } catch (error) {
    fail('Claude Code parseMessage throws on numeric content', error.message);
  }
}

// Test edge cases for OpenClaw Parser
function testOpenClawParserEdgeCases() {
  console.log('\n--- OpenClaw Parser Edge Cases ---');

  // Test malformed OpenClaw messages
  try {
    const result1 = OpenClawParser.parseMessage(null);
    if (result1 === null) {
      pass('OpenClaw parseMessage handles null input');
    } else {
      fail('OpenClaw parseMessage does not handle null input');
    }
  } catch (error) {
    fail('OpenClaw parseMessage throws on null input', error.message);
  }

  try {
    const result2 = OpenClawParser.parseMessage('{"type":"invalid"}');
    if (result2 === null) {
      pass('OpenClaw parseMessage handles invalid type');
    } else {
      fail('OpenClaw parseMessage does not handle invalid type');
    }
  } catch (error) {
    fail('OpenClaw parseMessage throws on invalid type', error.message);
  }

  try {
    const result3 = OpenClawParser.parseMessage('{"type":"message","message":{"role":"invalid"}}');
    if (result3 === null) {
      pass('OpenClaw parseMessage handles invalid role');
    } else {
      fail('OpenClaw parseMessage does not handle invalid role');
    }
  } catch (error) {
    fail('OpenClaw parseMessage throws on invalid role', error.message);
  }

  // Test edge case for agent ID extraction
  try {
    const result4 = OpenClawParser.getAgentId(null);
    if (result4 === null) {
      pass('OpenClaw getAgentId handles null input');
    } else {
      fail('OpenClaw getAgentId does not handle null input');
    }
  } catch (error) {
    fail('OpenClaw getAgentId throws on null input', error.message);
  }

  try {
    const result5 = OpenClawParser.getAgentId('');
    if (result5 === null) {
      pass('OpenClaw getAgentId handles empty string');
    } else {
      fail('OpenClaw getAgentId does not handle empty string');
    }
  } catch (error) {
    fail('OpenClaw getAgentId throws on empty string', error.message);
  }

  try {
    const result6 = OpenClawParser.getAgentId('/invalid/path/structure');
    if (result6 === null) {
      pass('OpenClaw getAgentId handles invalid path');
    } else {
      fail('OpenClaw getAgentId does not handle invalid path');
    }
  } catch (error) {
    fail('OpenClaw getAgentId throws on invalid path', error.message);
  }

  // Test usage event edge cases
  try {
    const result7 = OpenClawParser.parseUsageEvent(null);
    if (result7 === null) {
      pass('OpenClaw parseUsageEvent handles null input');
    } else {
      fail('OpenClaw parseUsageEvent does not handle null input');
    }
  } catch (error) {
    fail('OpenClaw parseUsageEvent throws on null input', error.message);
  }

  try {
    const result8 = OpenClawParser.parseUsageEvent('{}');
    if (result8 === null) {
      pass('OpenClaw parseUsageEvent handles empty object');
    } else {
      fail('OpenClaw parseUsageEvent does not handle empty object');
    }
  } catch (error) {
    fail('OpenClaw parseUsageEvent throws on empty object', error.message);
  }

  try {
    const result9 = OpenClawParser.parseUsageEvent('{"type":"non-message"}');
    if (result9 === null) {
      pass('OpenClaw parseUsageEvent handles non-message type');
    } else {
      fail('OpenClaw parseUsageEvent does not handle non-message type');
    }
  } catch (error) {
    fail('OpenClaw parseUsageEvent throws on non-message type', error.message);
  }
}

// Test Session Manager edge cases
function testSessionManagerEdgeCases() {
  console.log('\n--- Session Manager Edge Cases ---');

  try {
    SessionManager.init(); // Initialize first

    // Test creating session with null/empty values
    const sessionId = 'test-edge-case-' + Date.now();

    SessionManager.createSession(
      sessionId,
      null,  // null tool
      '',    // empty name
      undefined, // undefined file path
      null   // null project dir
    );

    const session = SessionManager.getSession(sessionId);
    if (session && session.sessionId === sessionId) {
      pass('SessionManager handles null/empty values gracefully');
    } else {
      fail('SessionManager does not handle null/empty values');
    }
  } catch (error) {
    fail('SessionManager throws when handling null/empty values', error.message);
  }

  try {
    // Test getting non-existent session
    const nonExistent = SessionManager.getSession('non-existent-session-id');
    if (nonExistent === undefined) {
      pass('SessionManager returns undefined for non-existent session');
    } else {
      fail('SessionManager does not handle non-existent session properly');
    }
  } catch (error) {
    fail('SessionManager throws when getting non-existent session', error.message);
  }

  try {
    // Test adding null/undefined messages
    const testSessionId = 'test-add-msgs-' + Date.now();
    SessionManager.createSession(testSessionId, 'test', 'Test', '/tmp', '/tmp');

    const result1 = SessionManager.addMessages(testSessionId, null);
    if (Array.isArray(result1) && result1.length === 0) {
      pass('SessionManager handles null messages array');
    } else {
      fail('SessionManager does not handle null messages array');
    }
  } catch (error) {
    fail('SessionManager throws when adding null messages', error.message);
  }

  try {
    // Test adding undefined messages
    const result2 = SessionManager.addMessages('non-existent', undefined);
    if (Array.isArray(result2) && result2.length === 0) {
      pass('SessionManager handles undefined messages');
    } else {
      fail('SessionManager does not handle undefined messages');
    }
  } catch (error) {
    fail('SessionManager throws when adding undefined messages', error.message);
  }

  try {
    // Test adding messages with invalid structure
    const invalidSessionId = 'test-invalid-msgs-' + Date.now();
    SessionManager.createSession(invalidSessionId, 'test', 'Test', '/tmp', '/tmp');

    const invalidMessages = [
      null,
      undefined,
      { invalid: 'structure' },
      { role: 'user' }, // missing content
      { content: 'missing role' } // missing role
    ];

    const result = SessionManager.addMessages(invalidSessionId, invalidMessages);
    // Should filter out invalid messages
    pass('SessionManager handles invalid message structures');
  } catch (error) {
    fail('SessionManager throws when handling invalid messages', error.message);
  }
}

// Test Usage Manager edge cases
function testUsageManagerEdgeCases() {
  console.log('\n--- Usage Manager Edge Cases ---');

  try {
    UsageManager.init();

    // Test with null/invalid usage event
    const result1 = UsageManager.ingestUsageEvent(null);
    if (result1 === false) {
      pass('UsageManager handles null usage event');
    } else {
      fail('UsageManager does not handle null usage event');
    }
  } catch (error) {
    fail('UsageManager throws when handling null usage event', error.message);
  }

  try {
    // Test with incomplete usage event
    const result2 = UsageManager.ingestUsageEvent({
      sessionId: 'test',
      tool: 'test',
      // Missing event
    });
    if (result2 === false) {
      pass('UsageManager handles incomplete usage event');
    } else {
      fail('UsageManager does not handle incomplete usage event');
    }
  } catch (error) {
    fail('UsageManager throws when handling incomplete usage event', error.message);
  }

  try {
    // Test with invalid numeric values
    const result3 = UsageManager.ingestUsageEvent({
      sessionId: 'test',
      tool: 'test',
      event: {
        kind: 'delta',
        directCostUsd: NaN,
        tokens: {
          inputTokens: Infinity,
          outputTokens: -Infinity
        }
      }
    });
    // Should handle invalid numbers gracefully
    pass('UsageManager handles invalid numeric values');
  } catch (error) {
    fail('UsageManager throws when handling invalid numeric values', error.message);
  }

  try {
    // Test getCostHistory with invalid parameters
    const result4 = UsageManager.getCostHistory({ limit: -1 });
    // Should handle negative limit gracefully
    pass('UsageManager handles negative limit');
  } catch (error) {
    fail('UsageManager throws when handling negative limit', error.message);
  }

  try {
    // Test getCostHistory with string limit
    const result5 = UsageManager.getCostHistory({ limit: 'invalid' });
    // Should handle string limit gracefully
    pass('UsageManager handles string limit');
  } catch (error) {
    fail('UsageManager throws when handling string limit', error.message);
  }
}

// Test File Monitor edge cases
function testFileMonitorEdgeCases() {
  console.log('\n--- File Monitor Edge Cases ---');

  try {
    // Test with non-existent directory
    const result1 = FileMonitor.getRecentSessionFiles('/non/existent/directory', { maxCount: 1 });
    if (Array.isArray(result1) && result1.length === 0) {
      pass('FileMonitor handles non-existent directory');
    } else {
      fail('FileMonitor does not handle non-existent directory');
    }
  } catch (error) {
    fail('FileMonitor throws when checking non-existent directory', error.message);
  }

  try {
    // Test with invalid path
    const result2 = FileMonitor.getRecentSessionFiles(null, { maxCount: 1 });
    // Should handle null path gracefully
    pass('FileMonitor handles null directory path');
  } catch (error) {
    fail('FileMonitor throws when handling null directory path', error.message);
  }

  try {
    // Test readIncrementalLines with non-existent file
    const result3 = FileMonitor.readIncrementalLines('/non/existent/file.jsonl', 'test');
    if (Array.isArray(result3) && result3.length === 0) {
      pass('FileMonitor handles non-existent file');
    } else {
      fail('FileMonitor does not handle non-existent file');
    }
  } catch (error) {
    fail('FileMonitor throws when reading non-existent file', error.message);
  }
}

// Run all edge case tests
testClaudeCodeParserEdgeCases();
testOpenClawParserEdgeCases();
testSessionManagerEdgeCases();
testUsageManagerEdgeCases();
testFileMonitorEdgeCases();

console.log('');
console.log('='.repeat(60));
console.log('Edge Case Test Summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log('');

if (testsFailed === 0) {
  console.log('🎉 All edge case tests PASSED!');
  console.log('The code is robust and handles error conditions gracefully.');
} else {
  console.log('⚠️  Some edge case tests failed. Error handling needs improvement.');
}

process.exit(testsFailed > 0 ? 1 : 0);