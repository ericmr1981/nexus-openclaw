import { TOOL_CONFIG } from '../constants/tools';

export function formatTokens(value: number): string {
  const num = Math.max(0, Math.round(value || 0));
  
  // B (Billion) - 十亿
  if (num >= 1_000_000_000) {
    const b = num / 1_000_000_000;
    return `${b.toFixed(b >= 10 ? 0 : b >= 1 ? 1 : 2)}B`;
  }
  
  // M (Million) - 百万
  if (num >= 1_000_000) {
    const m = num / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : m >= 1 ? 1 : 2)}M`;
  }
  
  // K (Thousand) - 千
  if (num >= 1_000) {
    const k = num / 1_000;
    return `${k.toFixed(k >= 10 ? 0 : k >= 1 ? 1 : 2)}K`;
  }
  
  // Raw number
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatUsd(value: number, precision = 2): string {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `$${n.toFixed(Math.max(0, Math.min(6, Math.round(precision))))}`;
}

export function getToolLabel(tool: string): string {
  return TOOL_CONFIG[tool]?.label || tool;
}
