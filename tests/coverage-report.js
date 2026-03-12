#!/usr/bin/env node

/**
 * Comprehensive Test Coverage Report for Nexus
 * Following TDD principles - reports current coverage and gaps
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('='.repeat(60));
console.log('Nexus Test Coverage Report');
console.log('='.repeat(60));

// Define the testable components and their test coverage
const components = [
  {
    name: 'Server Core',
    files: ['server/index.js'],
    functionality: [
      'WebSocket server initialization',
      'Route handling',
      'Static file serving',
      'Error handling'
    ],
    tests: [
      'Server starts successfully',
      'Routes respond correctly',
      'Handles missing files gracefully'
    ]
  },
  {
    name: 'Parsers (Claude, Codex, OpenClaw)',
    files: [
      'server/parsers/claude-code.js',
      'server/parsers/codex.js',
      'server/parsers/openclaw.js'
    ],
    functionality: [
      'Message parsing',
      'Session ID extraction',
      'Project name extraction',
      'Agent ID extraction (OpenClaw)',
      'Usage event parsing (OpenClaw)'
    ],
    tests: [
      'Parses valid messages',
      'Handles malformed JSON',
      'Extracts session IDs correctly',
      'Extracts agent IDs for OpenClaw'
    ]
  },
  {
    name: 'Session Manager',
    files: ['server/session-manager.js'],
    functionality: [
      'Session creation',
      'Session retrieval',
      'Message addition',
      'Session state management',
      'Process checking'
    ],
    tests: [
      'Creates sessions',
      'Adds messages to sessions',
      'Manages session states',
      'Checks active processes'
    ]
  },
  {
    name: 'Usage Manager',
    files: ['server/usage/usage-manager.js'],
    functionality: [
      'Usage event ingestion',
      'Cost calculation',
      'Total aggregation',
      'History tracking'
    ],
    tests: [
      'Ingests usage events',
      'Calculates costs',
      'Tracks usage history'
    ]
  },
  {
    name: 'File Monitor',
    files: ['server/monitors/file-monitor.js'],
    functionality: [
      'File watching',
      'Incremental line reading',
      'Session discovery',
      'File change detection'
    ],
    tests: [
      'Watches files for changes',
      'Reads incremental lines',
      'Discovers sessions'
    ]
  },
  {
    name: 'Frontend Components',
    files: [
      'client/src/components/SessionCard.tsx',
      'client/src/components/MarkdownLite.tsx',
      'client/src/components/ToolEvent.tsx'
    ],
    functionality: [
      'Session display',
      'Message rendering',
      'Tool event handling',
      'Markdown parsing'
    ],
    tests: [
      'Renders sessions correctly',
      'Displays session metadata',
      'Handles tool events'
    ]
  }
];

// Count actual test files
function countTestFiles() {
  let unitTests = 0;
  let integrationTests = 0;
  let e2eTests = 0;

  // Count unit tests
  if (fs.existsSync('tests/unit')) {
    const unitDir = fs.readdirSync('tests/unit');
    unitTests = unitDir.filter(f => f.endsWith('.test.js') || f.endsWith('.spec.js')).length;
  }

  // Count integration tests
  if (fs.existsSync('tests/integration')) {
    const intDir = fs.readdirSync('tests/integration');
    integrationTests = intDir.filter(f => f.endsWith('.test.js') || f.endsWith('.spec.js')).length;
  }

  // Count E2E tests
  if (fs.existsSync('tests/e2e')) {
    const e2eDir = fs.readdirSync('tests/e2e');
    e2eTests = e2eDir.filter(f => f.endsWith('.test.js') || f.endsWith('.spec.ts')).length;
  }

  return { unitTests, integrationTests, e2eTests };
}

// Calculate coverage percentages
function calculateCoverage() {
  const counts = countTestFiles();
  const totalComponents = components.length;

  // Based on our current test files, we have:
  // - 2 unit test files (server.test.js, edge-cases.test.js)
  // - 1 integration test file (websocket.test.js)
  // - Several E2E tests already existed

  const implementedTests = counts.unitTests + counts.integrationTests;
  const totalRecommendedTests = totalComponents * 3; // ~3 tests per component

  return {
    unit: counts.unitTests,
    integration: counts.integrationTests,
    e2e: counts.e2eTests,
    implemented: implementedTests,
    recommended: totalRecommendedTests,
    percent: Math.round((implementedTests / totalRecommendedTests) * 100)
  };
}

const coverage = calculateCoverage();

console.log('\n📊 Test Coverage Summary:');
console.log(`   Unit Tests: ${coverage.unit}`);
console.log(`   Integration Tests: ${coverage.integration}`);
console.log(`   E2E Tests: ${coverage.e2e}`);
console.log(`   Total Implemented: ${coverage.implemented}/${coverage.recommended} (${coverage.percent}%)`);

console.log('\n📋 Component Coverage:');
components.forEach((comp, index) => {
  console.log(`\n${index + 1}. ${comp.name}`);
  console.log(`   Files: ${comp.files.length}`);
  console.log(`   Key Functions: ${comp.functionality.length}`);
  console.log(`   Test Cases Needed: ${comp.tests.length}`);

  // Determine if component has adequate tests
  const hasTests = comp.files.some(file => {
    // Check if we have tests covering this component
    if (file.includes('openclaw')) return fs.existsSync('tests/unit/edge-cases.test.js');
    if (file.includes('session-manager')) return fs.existsSync('tests/unit/server.test.js');
    if (file.includes('usage-manager')) return fs.existsSync('tests/unit/server.test.js');
    return false;
  });

  console.log(`   Status: ${hasTests ? '✅ Partial Coverage' : '⚠️  Needs Tests'}`);
});

// Run existing tests to see current status
console.log('\n🧪 Running Current Tests...');
try {
  const result = execSync('npm test', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ Basic functionality tests pass');
} catch (error) {
  console.log('❌ Basic functionality tests have issues');
}

// Identify testing gaps
console.log('\n🔍 Identified Gaps:');
const gaps = [
  'Frontend component tests (React components)',
  'Complete WebSocket integration tests',
  'Database/persistence layer tests (if any)',
  'Authentication/security tests',
  'Performance/load tests',
  'More comprehensive edge case coverage'
];

gaps.forEach((gap, index) => {
  console.log(`   ${index + 1}. ${gap}`);
});

// Recommendations
console.log('\n💡 TDD Recommendations:');
const recommendations = [
  'Write tests for uncovered components following TDD principles',
  'Focus on unit tests first, then integration, then E2E',
  'Test edge cases and error conditions extensively',
  'Implement missing init methods or update tests',
  'Add type safety tests for TypeScript components',
  'Create comprehensive test suites before implementing new features'
];

recommendations.forEach((rec, index) => {
  console.log(`   ${index + 1}. ${rec}`);
});

console.log('\n🎯 Next Steps:');
console.log('   1. Address the failing tests identified in our test runs');
console.log('   2. Implement missing functionality (SessionManager.init, etc.)');
console.log('   3. Write tests for frontend components');
console.log('   4. Increase test coverage to 80%+');

console.log('');
console.log('='.repeat(60));
console.log('Coverage Report Complete');
console.log('='.repeat(60));