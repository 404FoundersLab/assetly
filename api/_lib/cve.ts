/**
 * Vulnerability Matching Engine for Endpoint Security.
 * Evaluates installed applications against known CVE databases.
 */

export interface CveRule {
  id: string;
  pattern: RegExp;
  minVersion?: string;
  maxVersionExclusive?: string;
  maxVersionInclusive?: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/** Semver/numeric version comparison: returns -1 if v1 < v2, 1 if v1 > v2, 0 if equal. */
export function compareVersions(v1: string, v2: string): number {
  const clean = (v: string) => v.replace(/^v/i, '').split(/[^0-9.]/)[0].split('.').map(n => parseInt(n, 10) || 0);
  const p1 = clean(v1);
  const p2 = clean(v2);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

/** Comprehensive database of known CVE rules for major desktop/server applications */
export const CVE_RULES: CveRule[] = [
  // ── Compression & Archivers ──────────────────────────────────────────
  {
    id: 'CVE-2023-38831',
    pattern: /winrar/i,
    maxVersionExclusive: '6.23',
    description: 'WinRAR Remote Code Execution via spoofed file extension processing',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2023-40477',
    pattern: /winrar/i,
    maxVersionExclusive: '6.23',
    description: 'WinRAR Heap Buffer Overflow in recovery volume processing',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-31102',
    pattern: /7-zip/i,
    maxVersionExclusive: '23.01',
    description: '7-Zip Heap Out-of-Bounds Write vulnerability',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2022-29072',
    pattern: /7-zip/i,
    maxVersionExclusive: '21.07',
    description: '7-Zip Privilege Escalation via Windows Help file dragging',
    severity: 'HIGH',
  },

  // ── Browsers ──────────────────────────────────────────────────────────
  {
    id: 'CVE-2023-4863',
    pattern: /google chrome/i,
    maxVersionExclusive: '116.0.5845.187',
    description: 'Heap buffer overflow in WebP image library used by Chrome',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2024-0519',
    pattern: /google chrome/i,
    maxVersionExclusive: '120.0.6099.224',
    description: 'Out-of-bounds memory access in V8 JavaScript engine',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-5217',
    pattern: /google chrome/i,
    maxVersionExclusive: '117.0.5938.132',
    description: 'Heap buffer overflow in VP8 encoding in libvpx',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-4863',
    pattern: /mozilla firefox/i,
    maxVersionExclusive: '117.0.1',
    description: 'WebP Image I/O Heap Buffer Overflow in Firefox',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2024-0519',
    pattern: /microsoft edge/i,
    maxVersionExclusive: '120.0.2210.144',
    description: 'Chromium V8 Engine Out-of-bounds Access in Microsoft Edge',
    severity: 'HIGH',
  },

  // ── Document Readers & Productivity ──────────────────────────────────
  {
    id: 'CVE-2023-26369',
    pattern: /(adobe acrobat|adobe reader|acrobat reader)/i,
    maxVersionExclusive: '23.006.20320',
    description: 'Adobe Acrobat Out-of-bounds Write Arbitrary Code Execution',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2023-36884',
    pattern: /(microsoft office|word|excel)/i,
    maxVersionExclusive: '16.0.16527.20226',
    description: 'Office Remote Code Execution via malicious document execution',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-24055',
    pattern: /keepass/i,
    maxVersionExclusive: '2.54',
    description: 'KeePass Plaintext Master Password Export Vulnerability',
    severity: 'HIGH',
  },

  // ── Runtimes & Dev Tools ─────────────────────────────────────────────
  {
    id: 'CVE-2023-32002',
    pattern: /node\.js|nodejs/i,
    minVersion: '18.0.0',
    maxVersionExclusive: '18.17.1',
    description: 'Node.js Module Loading Policy Bypass',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-32006',
    pattern: /node\.js|nodejs/i,
    minVersion: '20.0.0',
    maxVersionExclusive: '20.5.1',
    description: 'Node.js Experimental Permission Model Bypass',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-40217',
    pattern: /python/i,
    maxVersionExclusive: '3.11.5',
    description: 'Python TLS Handshake Bypass in ssl module',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-22490',
    pattern: /^git\b/i,
    maxVersionExclusive: '2.39.2',
    description: 'Git Remote Code Execution via local clone repository hooks',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2024-32002',
    pattern: /^git\b/i,
    maxVersionExclusive: '2.45.1',
    description: 'Git Submodule Path Traversal Remote Code Execution',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2021-36367',
    pattern: /putty/i,
    maxVersionExclusive: '0.77',
    description: 'PuTTY Private Key Private Signature Side-Channel Leakage',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2024-31497',
    pattern: /putty/i,
    maxVersionExclusive: '0.81',
    description: 'PuTTY ECDSA P-521 Private Key Bias Recovery Flaw',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2023-48795',
    pattern: /filezilla/i,
    maxVersionExclusive: '3.66.0',
    description: 'Terrapin SSH Protocol Prefix Truncation Vulnerability',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-3446',
    pattern: /openssl/i,
    maxVersionExclusive: '3.0.10',
    description: 'OpenSSL Excessive Time spent checking DH keys',
    severity: 'MEDIUM',
  },
  {
    id: 'CVE-2024-24576',
    pattern: /rust/i,
    maxVersionExclusive: '1.77.2',
    description: 'Rust Command Injection via Batch Files on Windows',
    severity: 'CRITICAL',
  },

  // ── Media & Communication ─────────────────────────────────────────────
  {
    id: 'CVE-2023-4904',
    pattern: /vlc/i,
    maxVersionExclusive: '3.0.19',
    description: 'VLC Media Player Out-of-bounds Read/Write in MMS Demuxer',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-39202',
    pattern: /zoom/i,
    maxVersionExclusive: '5.15.10',
    description: 'Zoom Desktop Client Buffer Overflow Local Privilege Escalation',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-28285',
    pattern: /skype/i,
    maxVersionExclusive: '8.96.0',
    description: 'Skype for Windows Remote Code Execution Vulnerability',
    severity: 'HIGH',
  },

  // ── System Utilities & Database ───────────────────────────────────────
  {
    id: 'CVE-2023-38545',
    pattern: /(curl|libcurl)/i,
    maxVersionExclusive: '8.4.0',
    description: 'SOCKS5 Heap Buffer Overflow in curl',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2023-22515',
    pattern: /confluence/i,
    maxVersionExclusive: '8.5.2',
    description: 'Atlassian Confluence Broken Access Control Vulnerability',
    severity: 'CRITICAL',
  },
  {
    id: 'CVE-2023-28840',
    pattern: /docker/i,
    maxVersionExclusive: '24.0.2',
    description: 'Docker Engine Encrypted Overlay Network Bypass',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-2454',
    pattern: /postgresql/i,
    maxVersionExclusive: '15.3',
    description: 'PostgreSQL CREATE SCHEMA Code Execution Vulnerability',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-21980',
    pattern: /mysql/i,
    maxVersionExclusive: '8.0.33',
    description: 'MySQL Server Optimizer Remote Code Execution',
    severity: 'HIGH',
  },
  {
    id: 'CVE-2023-36844',
    pattern: /juniper/i,
    maxVersionExclusive: '21.4.1',
    description: 'Junos OS Remote Code Execution Vulnerability',
    severity: 'CRITICAL',
  },
];

/**
 * Evaluates an installed application against known CVE rules.
 * Returns an object with cve_ids, cve_count, and detailed descriptions.
 */
export function evaluateAppCves(appName: string, version: string | null): {
  cve_ids: string[];
  cve_count: number;
  details: { id: string; description: string; severity: string }[];
} {
  if (!appName) return { cve_ids: [], cve_count: 0, details: [] };

  const matched: { id: string; description: string; severity: string }[] = [];
  const seenIds = new Set<string>();

  for (const rule of CVE_RULES) {
    if (!rule.pattern.test(appName)) continue;

    // Check version bounds if present
    if (version) {
      if (rule.minVersion && compareVersions(version, rule.minVersion) < 0) {
        continue;
      }
      if (rule.maxVersionExclusive && compareVersions(version, rule.maxVersionExclusive) >= 0) {
        continue;
      }
      if (rule.maxVersionInclusive && compareVersions(version, rule.maxVersionInclusive) > 0) {
        continue;
      }
    }

    if (!seenIds.has(rule.id)) {
      seenIds.add(rule.id);
      matched.push({
        id: rule.id,
        description: rule.description,
        severity: rule.severity,
      });
    }
  }

  return {
    cve_ids: Array.from(seenIds),
    cve_count: seenIds.size,
    details: matched,
  };
}
