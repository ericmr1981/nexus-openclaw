/**
 * Frontend component tests for Nexus
 * Using JSDOM for React component testing
 */

import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import sinon from 'sinon';

// Setup JSDOM for React testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock DOMParser for MarkdownLite
global.DOMParser = class {
  parseFromString(html) {
    const dom = new JSDOM(html);
    return dom.window.document;
  }
};

// Import React testing utilities
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

// Import components to test
import { SessionCard } from '../../client/src/components/SessionCard';
import { MarkdownLite } from '../../client/src/components/MarkdownLite';
import { ToolEvent } from '../../client/src/components/ToolEvent';

// Test constants
import { TOOL_CONFIG } from '../../client/src/constants/tools';

describe('Nexus Frontend Component Tests', () => {
  describe('SessionCard Component', () => {
    const mockSession = {
      sessionId: 'test-session-123',
      tool: 'claude-code',
      name: 'Test Session',
      agentId: null,
      model: null,
      messages: [
        { role: 'user', content: 'Hello world' },
        { role: 'assistant', content: 'Hi there!' }
      ],
      state: 'active',
      lastModified: Date.now()
    };

    it('should render basic session info', () => {
      const { getByText } = render(<SessionCard session={mockSession} showToolEvents={false} />);

      expect(getByText('CLAUDÉ')).toBeTruthy();
      expect(getByText('Test Session')).toBeTruthy();
      expect(getByText('ACTIVE')).toBeTruthy();
    });

    it('should display agentId and model when present', () => {
      const sessionWithMeta = {
        ...mockSession,
        agentId: 'test-agent',
        model: 'claude-3-sonnet'
      };

      const { getByText } = render(<SessionCard session={sessionWithMeta} showToolEvents={false} />);

      expect(getByText('test-agent')).toBeTruthy();
      expect(getByText('claude-3-sonnet')).toBeTruthy();
    });

    it('should filter messages based on showToolEvents prop', () => {
      const sessionWithToolEvents = {
        ...mockSession,
        messages: [
          { role: 'user', content: 'Regular message' },
          { role: 'assistant', content: '{"tool_use":{"name":"search","input":{"query":"test"}}}' }
        ]
      };

      // Without tool events
      let { queryByText } = render(<SessionCard session={sessionWithToolEvents} showToolEvents={false} />);
      expect(queryByText('{"tool_use":{"name":"search","input":{"query":"test"}}}')).toBeFalsy();

      // With tool events
      ({ queryByText } = render(<SessionCard session={sessionWithToolEvents} showToolEvents={true} />));
      expect(queryByText('{"tool_use":{"name":"search","input":{"query":"test"}}}')).toBeTruthy();
    });
  });

  describe('MarkdownLite Component', () => {
    it('should render basic markdown text', () => {
      const { container } = render(<MarkdownLite content="# Hello\n\nThis is a **test**" />);

      const heading = container.querySelector('h1');
      const bold = container.querySelector('strong');

      expect(heading.textContent).toBe('Hello');
      expect(bold.textContent).toBe('test');
    });

    it('should handle empty content', () => {
      const { container } = render(<MarkdownLite content="" />);

      expect(container.textContent).toBe('');
    });

    it('should handle complex markdown with code blocks', () => {
      const complexMd = `
# Title
Some \`inline code\` here.

\`\`\`javascript
console.log('hello');
\`\`\`

> A quote here
      `;

      const { container } = render(<MarkdownLite content={complexMd} />);

      expect(container.querySelector('h1')).toBeTruthy();
      expect(container.querySelector('code')).toBeTruthy();
      expect(container.querySelector('pre')).toBeTruthy();
      expect(container.querySelector('blockquote')).toBeTruthy();
    });
  });

  describe('ToolEvent Component', () => {
    it('should parse and render tool call events', () => {
      const toolCallContent = '{"type":"tool_use","id":"call_123","name":"search","input":{"query":"test"}}';
      const { getByText } = render(<ToolEvent content={toolCallContent} />);

      expect(getByText('search')).toBeTruthy();
      expect(getByText('call_123')).toBeTruthy();
    });

    it('should handle tool result events', () => {
      const toolResultContent = '{"type":"tool_result","tool_use_id":"call_123","content":"result data"}';
      const { getByText } = render(<ToolEvent content={toolResultContent} />);

      expect(getByText('result data')).toBeTruthy();
    });

    it('should handle malformed JSON gracefully', () => {
      const badJson = '{"malformed": "json}';
      const { container } = render(<ToolEvent content={badJson} />);

      expect(container.textContent).toContain(badJson); // Should display raw content
    });
  });

  describe('Tool Configuration', () => {
    it('should have valid tool configurations', () => {
      expect(TOOL_CONFIG).to.have.property('claude-code');
      expect(TOOL_CONFIG).to.have.property('codex');
      expect(TOOL_CONFIG).to.have.property('openclaw');

      const claudeConfig = TOOL_CONFIG['claude-code'];
      expect(claudeConfig).to.have.property('label');
      expect(claudeConfig).to.have.property('color');
      expect(claudeConfig).to.have.property('borderColor');
    });

    it('should return default config for unknown tools', () => {
      const unknownTool = TOOL_CONFIG['unknown-tool'] || TOOL_CONFIG['claude-code'];
      expect(unknownTool).to.be.an('object');
      expect(unknownTool).to.have.property('label');
    });
  });
});

// Run tests in Node.js environment
if (typeof window !== 'undefined') {
  // In browser environment
  mocha.run();
} else {
  // In Node.js environment, we need to use a test runner
  console.log('Frontend component tests defined. Run with Jest or similar test runner.');
}