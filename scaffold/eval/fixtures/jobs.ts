import type { JobFixture } from "./types";

/**
 * 10 jobs spanning genuinely different domains, so a "poor fit" for one job is
 * unambiguously wrong (not just underqualified) — e.g. a line cook's resume is not a
 * borderline case for Senior Backend Engineer, it's a different universe entirely. That's
 * deliberate: the eval exists to catch the scoring engine getting an OBVIOUS case wrong,
 * not to adjudicate genuinely close calls.
 */
export const jobs: JobFixture[] = [
  {
    key: "backend-engineer",
    title: "Senior Backend Engineer",
    description:
      "We're hiring a senior backend engineer to design and operate distributed systems serving millions of requests per day.",
    requirements: [
      { text: "5+ years of professional backend engineering experience", weight: 1.5 },
      { text: "Proficiency in Python or Go with production systems experience", weight: 1.5 },
      { text: "Experience designing distributed systems at scale (high throughput, low latency)", weight: 1.2 },
      { text: "AWS or GCP cloud infrastructure experience", weight: 1.0 },
    ],
  },
  {
    key: "data-scientist",
    title: "Data Scientist",
    description: "We're hiring a data scientist to build statistical models that directly inform product decisions.",
    requirements: [
      { text: "Strong statistical modeling and experimental design background", weight: 1.5 },
      { text: "Production experience with Python data tooling (pandas, scikit-learn, or similar)", weight: 1.3 },
      { text: "SQL proficiency for large-scale data analysis", weight: 1.0 },
      { text: "Experience communicating findings clearly to non-technical stakeholders", weight: 0.8 },
    ],
  },
  {
    key: "product-designer",
    title: "Product Designer",
    description: "We're hiring a product designer to own end-to-end UX for our core product surfaces.",
    requirements: [
      { text: "3+ years of UX/UI design experience for digital products", weight: 1.5 },
      { text: "Proficiency with Figma or equivalent design tooling", weight: 1.2 },
      { text: "Experience conducting user research and usability testing", weight: 1.2 },
      { text: "A portfolio demonstrating end-to-end product design process", weight: 1.0 },
    ],
  },
  {
    key: "devops-sre",
    title: "DevOps / Site Reliability Engineer",
    description: "We're hiring an SRE to own the reliability and deployment pipeline of our production infrastructure.",
    requirements: [
      { text: "Production Kubernetes experience", weight: 1.5 },
      { text: "CI/CD pipeline design and maintenance experience", weight: 1.3 },
      { text: "Infrastructure-as-code experience (Terraform or similar)", weight: 1.2 },
      { text: "On-call incident response experience", weight: 1.0 },
    ],
  },
  {
    key: "sales-ae",
    title: "Account Executive, B2B SaaS",
    description: "We're hiring an account executive to own the full sales cycle for our mid-market segment.",
    requirements: [
      { text: "2+ years closing B2B SaaS sales, consistently meeting or exceeding quota", weight: 1.5 },
      { text: "Experience managing a full sales cycle from prospecting to close", weight: 1.3 },
      { text: "CRM proficiency (Salesforce or similar)", weight: 0.8 },
      { text: "Experience selling to mid-market or enterprise accounts", weight: 1.0 },
    ],
  },
  {
    key: "marketing-manager",
    title: "Marketing Manager, Demand Generation",
    description: "We're hiring a demand generation manager to own our paid and organic pipeline growth.",
    requirements: [
      { text: "3+ years of B2B demand generation experience", weight: 1.5 },
      { text: "Experience managing paid acquisition campaigns (Google Ads, LinkedIn Ads)", weight: 1.2 },
      { text: "Marketing analytics and attribution experience", weight: 1.0 },
      { text: "Experience owning a marketing budget", weight: 0.8 },
    ],
  },
  {
    key: "frontend-engineer",
    title: "Frontend Engineer",
    description: "We're hiring a frontend engineer to build and maintain our customer-facing web application.",
    requirements: [
      { text: "3+ years of professional React experience", weight: 1.5 },
      { text: "Strong TypeScript proficiency", weight: 1.3 },
      { text: "Experience with web performance optimization", weight: 1.0 },
      { text: "Accessibility (WCAG) experience", weight: 0.8 },
    ],
  },
  {
    key: "support-lead",
    title: "Customer Support Lead",
    description: "We're hiring a support lead to build and manage our frontline customer support team.",
    requirements: [
      { text: "2+ years leading a customer support team", weight: 1.5 },
      { text: "Experience with support tooling (Zendesk or similar)", weight: 1.0 },
      { text: "Track record improving support SLAs or CSAT", weight: 1.2 },
      { text: "Experience hiring and coaching support staff", weight: 1.0 },
    ],
  },
  {
    key: "financial-analyst",
    title: "Financial Analyst",
    description: "We're hiring a financial analyst to own forecasting and reporting for the finance team.",
    requirements: [
      { text: "2+ years of financial modeling and forecasting experience", weight: 1.5 },
      { text: "Advanced Excel proficiency", weight: 1.2 },
      { text: "GAAP / accounting fundamentals knowledge", weight: 1.0 },
      { text: "Experience presenting financial analysis to leadership", weight: 0.8 },
    ],
  },
  {
    key: "corporate-counsel",
    title: "Corporate Counsel",
    description: "We're hiring corporate counsel to own contract review and regulatory compliance.",
    requirements: [
      { text: "JD and active bar admission", weight: 1.8 },
      { text: "3+ years of contract review and negotiation experience", weight: 1.3 },
      { text: "Experience advising on regulatory compliance", weight: 1.0 },
      { text: "M&A transaction experience", weight: 0.8 },
    ],
  },
  {
    key: "principal-software-engineer",
    title: "Principal Software Engineer",
    description:
      "We're hiring a Principal Software Engineer to set technical direction across multiple teams, own architecture for our most critical systems, and raise the engineering bar org-wide.",
    requirements: [
      {
        text: "10+ years of professional software engineering experience, including deep ownership of large-scale distributed systems",
        weight: 1.6,
      },
      {
        text: "Demonstrated technical leadership and mentorship at an organization-wide scale, without direct management authority",
        weight: 1.4,
      },
      {
        text: "Track record of driving cross-team architectural decisions with measurable business or technical impact",
        weight: 1.3,
      },
      {
        text: "Deep expertise in at least one specialized domain (e.g. distributed systems, infrastructure, ML platforms, security)",
        weight: 1.2,
      },
      {
        text: "Experience operating systems at significant scale (millions of users/requests, high-availability requirements)",
        weight: 1.0,
      },
    ],
  },
];
