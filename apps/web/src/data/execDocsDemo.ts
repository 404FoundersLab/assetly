import type { FolderConfig } from '../features/exe-docs/library/FolderSidebar';
import type { DocumentRowData } from '../features/exe-docs/library/DocumentsTable';
import type { MeetingData } from '../features/exe-docs/meetings/modal/MeetingCard';

export const DEMO_LIBRARY_FOLDERS: FolderConfig[] = [
  {
    name: 'HR',
    subfolders: [{ name: 'Employee Docs' }, { name: 'Policies' }, { name: 'Onboarding Packs' }],
  },
  {
    name: 'Sales',
    isShared: true,
    subfolders: [{ name: 'Contracts' }, { name: 'Proposals' }],
  },
  {
    name: 'Marketing',
    subfolders: [{ name: 'Brand Kit' }, { name: 'Campaign Briefs' }],
  },
  {
    name: 'Operations',
    subfolders: [{ name: 'SOPs' }, { name: 'Vendor Agreements' }],
  },
  {
    name: 'Board Packs',
    isShared: true,
    subfolders: [{ name: '2026 Q1' }, { name: '2026 Q2' }],
  },
];

export const DEMO_LIBRARY_DOCUMENTS: Record<string, DocumentRowData[]> = {
  Policies: [
    {
      id: 'doc-pol-1',
      title: 'Acceptable Use Policy v3.2',
      type: 'PDF',
      access: ['HR', 'IT', 'All Staff'],
      lastModified: '2026-06-12',
      owner: 'Priya Nair',
      status: 'Approved',
      iconType: 'contact',
    },
    {
      id: 'doc-pol-2',
      title: 'Remote Work Guidelines',
      type: 'DOCX',
      access: ['HR'],
      lastModified: '2026-05-28',
      owner: 'Priya Nair',
      status: 'Approved',
      iconType: 'contact',
    },
    {
      id: 'doc-pol-3',
      title: 'Data Retention Draft',
      type: 'DOCX',
      access: ['Legal', 'IT'],
      lastModified: '2026-07-02',
      owner: 'Legal Counsel',
      status: 'Draft',
      iconType: 'contact',
    },
  ],
  'Onboarding Packs': [
    {
      id: 'doc-onb-1',
      title: 'New Hire Day-1 Checklist',
      type: 'PDF',
      access: ['HR', 'IT'],
      lastModified: '2026-04-18',
      owner: 'HR Ops',
      status: 'Approved',
      iconType: 'contact',
    },
    {
      id: 'doc-onb-2',
      title: 'Laptop & Access Request Form',
      type: 'PDF',
      access: ['HR', 'IT'],
      lastModified: '2026-03-09',
      owner: 'IT Admin',
      status: 'Approved',
      iconType: 'contact',
    },
  ],
  Contracts: [
    {
      id: 'doc-sal-1',
      title: 'Enterprise MSA — Acme Corp',
      type: 'PDF',
      access: ['Sales', 'Legal'],
      lastModified: '2026-06-30',
      owner: 'Sales Ops',
      status: 'Confidential',
      iconType: 'sales',
    },
    {
      id: 'doc-sal-2',
      title: 'Renewal Addendum — Zenith Soft',
      type: 'DOCX',
      access: ['Sales'],
      lastModified: '2026-07-10',
      owner: 'Account Team',
      status: 'Draft',
      iconType: 'sales',
    },
  ],
  Proposals: [
    {
      id: 'doc-prop-1',
      title: 'Q3 Solution Proposal — Northwind',
      type: 'PPTX',
      access: ['Sales'],
      lastModified: '2026-07-08',
      owner: 'Solutions',
      status: 'Approved',
      iconType: 'sales',
    },
  ],
  'Brand Kit': [
    {
      id: 'doc-mkt-1',
      title: 'Brand Guidelines 2026',
      type: 'PDF',
      access: ['Marketing', 'All Staff'],
      lastModified: '2026-01-15',
      owner: 'Brand Studio',
      status: 'Approved',
      iconType: 'marketing',
    },
    {
      id: 'doc-mkt-2',
      title: 'Logo Pack (SVG/PNG)',
      type: 'ZIP',
      access: ['Marketing'],
      lastModified: '2026-01-15',
      owner: 'Brand Studio',
      status: 'Approved',
      iconType: 'marketing',
    },
  ],
  'Campaign Briefs': [
    {
      id: 'doc-camp-1',
      title: 'Assetly Launch Campaign Brief',
      type: 'DOCX',
      access: ['Marketing'],
      lastModified: '2026-07-01',
      owner: 'Growth',
      status: 'Draft',
      iconType: 'marketing',
    },
  ],
  SOPs: [
    {
      id: 'doc-ops-1',
      title: 'Incident Response SOP',
      type: 'PDF',
      access: ['Ops', 'IT', 'Security'],
      lastModified: '2026-05-20',
      owner: 'Ops Lead',
      status: 'Approved',
      iconType: 'sales',
    },
    {
      id: 'doc-ops-2',
      title: 'Change Management Process',
      type: 'PDF',
      access: ['Ops', 'IT'],
      lastModified: '2026-04-02',
      owner: 'Ops Lead',
      status: 'Approved',
      iconType: 'sales',
    },
  ],
  'Vendor Agreements': [
    {
      id: 'doc-ven-1',
      title: 'AWS Enterprise Discount Program',
      type: 'PDF',
      access: ['Finance', 'Ops'],
      lastModified: '2026-02-14',
      owner: 'Procurement',
      status: 'Confidential',
      iconType: 'sales',
    },
  ],
  '2026 Q1': [
    {
      id: 'doc-board-1',
      title: 'Q1 Board Pack — Strategy',
      type: 'PDF',
      access: ['Board', 'Exec'],
      lastModified: '2026-03-28',
      owner: 'CEO Office',
      status: 'Confidential',
      iconType: 'sales',
    },
  ],
  '2026 Q2': [
    {
      id: 'doc-board-2',
      title: 'Q2 Financial Summary',
      type: 'XLSX',
      access: ['Board', 'Finance'],
      lastModified: '2026-06-25',
      owner: 'CFO Office',
      status: 'Confidential',
      iconType: 'sales',
    },
    {
      id: 'doc-board-3',
      title: 'IT CapEx Outlook',
      type: 'PDF',
      access: ['Board', 'IT'],
      lastModified: '2026-06-26',
      owner: 'CIO',
      status: 'Approved',
      iconType: 'sales',
    },
  ],
};

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function formatMeetingDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function generateDemoMeetings(): MeetingData[] {
  const soon = daysFromNow(2);
  const later = daysFromNow(7);
  const past = daysFromNow(-14);

  return [
    {
      id: 'meet-1',
      title: 'IT Steering Committee',
      status: 'CONFIRMED',
      date: formatMeetingDate(soon),
      time: '10:00 AM – 11:00 AM',
      location: 'Board Room A',
      priority: true,
      participantIds: [],
      participants: ['CIO', 'IT Admin', 'Finance Admin', 'HR Admin'],
      description: 'Quarterly review of asset refresh plan, endpoint security posture, and CapEx requests.',
      link: 'https://meet.example.com/it-steering',
      agendaItems: [
        'Endpoint security scorecard',
        'Laptop refresh pipeline (FY26)',
        'Open CapEx requests > ₹2L',
        'Vendor renewals (next 90 days)',
      ],
    },
    {
      id: 'meet-2',
      title: 'Vendor Risk Review — Networking',
      status: 'TENTATIVE',
      date: formatMeetingDate(later),
      time: '03:30 PM – 04:15 PM',
      location: 'Virtual',
      participants: ['Security Lead', 'Network Ops', 'Procurement'],
      description: 'Review Fortinet / Cisco contract renewals and firmware compliance.',
      link: 'https://meet.example.com/vendor-risk',
      agendaItems: ['Contract expiry calendar', 'Firmware debt', 'Backup gateway SLA'],
    },
    {
      id: 'meet-3',
      title: 'All-Hands Prep — Product Update',
      status: 'CONFIRMED',
      date: formatMeetingDate(daysFromNow(4)),
      time: '09:00 AM – 09:45 AM',
      location: 'Conference Room 3',
      participants: ['CEO', 'Marketing', 'Product'],
      description: 'Align messaging for the monthly all-hands product segment.',
      agendaItems: ['Demo script', 'Slide ownership', 'Q&A prep'],
    },
    {
      id: 'meet-4',
      title: 'Q2 Strategic Review',
      status: 'COMPLETED',
      date: formatMeetingDate(past),
      time: '09:00 AM – 11:00 AM',
      location: 'Main Boardroom',
      participants: ['CEO', 'CFO', 'CIO', 'CHRO'],
      description: 'Closed board session covering Q2 performance and H2 priorities.',
      agendaItems: ['Revenue vs plan', 'IT spend utilization', 'Hiring freeze exceptions'],
    },
    {
      id: 'meet-5',
      title: 'Compliance Readiness — ISO 27001',
      status: 'COMPLETED',
      date: formatMeetingDate(daysFromNow(-28)),
      time: '02:00 PM – 03:00 PM',
      location: 'Virtual',
      participants: ['Security', 'IT Admin', 'Legal'],
      description: 'Gap review ahead of surveillance audit.',
      agendaItems: ['Control owners', 'Evidence collection', 'Open NCRs'],
    },
  ];
}

export type ComplianceControlStatus = 'compliant' | 'partial' | 'gap' | 'not_applicable';

export interface ComplianceControl {
  id: string;
  framework: string;
  controlId: string;
  title: string;
  owner: string;
  status: ComplianceControlStatus;
  lastReviewed: string;
  evidenceCount: number;
  notes?: string;
}

export interface CompliancePolicyItem {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  acknowledgementRate: number;
  status: 'active' | 'review' | 'archived';
}

export const DEMO_COMPLIANCE_CONTROLS: ComplianceControl[] = [
  {
    id: 'ctl-1',
    framework: 'ISO 27001',
    controlId: 'A.8.1',
    title: 'Asset inventory & ownership',
    owner: 'IT Admin',
    status: 'compliant',
    lastReviewed: '2026-06-15',
    evidenceCount: 4,
  },
  {
    id: 'ctl-2',
    framework: 'ISO 27001',
    controlId: 'A.8.9',
    title: 'Configuration management',
    owner: 'Network Ops',
    status: 'partial',
    lastReviewed: '2026-05-20',
    evidenceCount: 2,
    notes: 'Firmware lag on 2 switches',
  },
  {
    id: 'ctl-3',
    framework: 'ISO 27001',
    controlId: 'A.8.15',
    title: 'Logging & monitoring',
    owner: 'Security',
    status: 'compliant',
    lastReviewed: '2026-07-01',
    evidenceCount: 6,
  },
  {
    id: 'ctl-4',
    framework: 'SOC 2',
    controlId: 'CC6.1',
    title: 'Logical access controls',
    owner: 'IT Admin',
    status: 'compliant',
    lastReviewed: '2026-06-28',
    evidenceCount: 5,
  },
  {
    id: 'ctl-5',
    framework: 'SOC 2',
    controlId: 'CC7.2',
    title: 'System monitoring',
    owner: 'Security',
    status: 'partial',
    lastReviewed: '2026-06-10',
    evidenceCount: 3,
    notes: 'Endpoint offline alerts need tuning',
  },
  {
    id: 'ctl-6',
    framework: 'GDPR',
    controlId: 'Art. 32',
    title: 'Security of processing',
    owner: 'Legal',
    status: 'compliant',
    lastReviewed: '2026-04-12',
    evidenceCount: 3,
  },
  {
    id: 'ctl-7',
    framework: 'ISO 27001',
    controlId: 'A.5.1',
    title: 'Policies for information security',
    owner: 'HR / Legal',
    status: 'gap',
    lastReviewed: '2026-03-01',
    evidenceCount: 1,
    notes: 'Data retention policy still in draft',
  },
  {
    id: 'ctl-8',
    framework: 'SOC 2',
    controlId: 'CC8.1',
    title: 'Change management',
    owner: 'Ops Lead',
    status: 'compliant',
    lastReviewed: '2026-05-05',
    evidenceCount: 4,
  },
];

export const DEMO_COMPLIANCE_POLICIES: CompliancePolicyItem[] = [
  {
    id: 'cp-1',
    title: 'Information Security Policy',
    version: '2.4',
    effectiveDate: '2026-01-01',
    acknowledgementRate: 94,
    status: 'active',
  },
  {
    id: 'cp-2',
    title: 'Acceptable Use Policy',
    version: '3.2',
    effectiveDate: '2026-03-15',
    acknowledgementRate: 88,
    status: 'active',
  },
  {
    id: 'cp-3',
    title: 'Data Retention Policy',
    version: '1.0-draft',
    effectiveDate: '—',
    acknowledgementRate: 0,
    status: 'review',
  },
  {
    id: 'cp-4',
    title: 'Incident Response Policy',
    version: '1.8',
    effectiveDate: '2025-11-01',
    acknowledgementRate: 91,
    status: 'active',
  },
];
