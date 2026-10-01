import { buildResume, type ResumeFixture, type ResumeSpec } from "./types";

/**
 * ~10 resumes per job (100 total). Each job's pool has exactly one "top" (unambiguous
 * ideal fit, every requirement hit with specific/quantified detail) and exactly one
 * "bottom" (unambiguous mismatch — pulled from a completely different professional
 * domain, not just "less experienced"). The rest are plausible mid-pack filler with no
 * hard rank assertion, just real variety so the pool isn't trivially binary.
 *
 * "Bottom" resumes are deliberately cross-pollinated from OTHER jobs in this same file
 * (e.g. the devops-sre pool's bottom pick is a corporate lawyer) — a real, senior,
 * competent professional, just in a totally unrelated field. That's a stronger test of
 * "does the model score fit-to-requirements" than a generic deliberately-bad resume would
 * be, since it rules out the model simply rewarding general seniority/competence.
 */
const pools: Record<string, ResumeSpec[]> = {
  "backend-engineer": [
    {
      name: "Priya Natarajan",
      title: "Staff Backend Engineer",
      years: 8,
      expected: "top",
      bullets: [
        "Led design of a distributed job-scheduling system in Go processing 40M events/day across 200 nodes on AWS",
        "Reduced p99 API latency from 800ms to 90ms by redesigning the service's caching and sharding strategy",
        "Owned migration of a monolith to microservices on AWS EKS, cutting deploy time from 45min to 4min",
        "Mentored 4 junior engineers and ran the team's on-call rotation for 3 years",
      ],
      skills: ["Python", "Go", "AWS", "Kubernetes", "PostgreSQL", "distributed systems", "Kafka"],
    },
    {
      name: "Jordan Webb",
      title: "Marketing Campaign Manager",
      years: 6,
      expected: "bottom",
      bullets: [
        "Managed $2M annual paid media budget across Google Ads and LinkedIn for a B2B SaaS company",
        "Built email nurture campaigns in HubSpot that improved MQL-to-SQL conversion by 18%",
        "Led a team of 3 marketing coordinators and owned the content calendar",
        "Presented quarterly pipeline attribution reports to the executive team",
      ],
      skills: ["HubSpot", "Google Ads", "content strategy", "campaign management", "Salesforce"],
    },
    {
      name: "Marcus Chen",
      title: "Backend Engineer",
      years: 4,
      bullets: [
        "Built and maintained REST APIs in Python/Django for an e-commerce platform handling 500K orders/month",
        "Implemented a Redis caching layer that cut database load by 30%",
        "Worked within an AWS environment (EC2, RDS, S3) but did not own infrastructure design directly",
      ],
      skills: ["Python", "Django", "AWS", "Redis", "PostgreSQL"],
    },
    {
      name: "Sofia Petrov",
      title: "Senior Software Engineer",
      years: 7,
      bullets: [
        "7 years building backend services primarily in Java and Spring Boot for a fintech company",
        "Designed a payment-processing service handling 1M transactions/day on GCP",
        "Limited direct Python/Go experience, but strong distributed-systems background",
      ],
      skills: ["Java", "Spring Boot", "GCP", "distributed systems", "SQL"],
    },
    {
      name: "David Okafor",
      title: "Backend Engineer",
      years: 3,
      bullets: [
        "3 years building Go microservices for an internal tools platform at a mid-size company",
        "Contributed to a service handling moderate traffic (~500K requests/day), not large-scale distributed design",
        "Comfortable with AWS basics (EC2, S3) but no deep infrastructure ownership",
      ],
      skills: ["Go", "AWS", "Docker", "PostgreSQL"],
    },
    {
      name: "Elena Vasquez",
      title: "Full-Stack Engineer",
      years: 5,
      bullets: [
        "5 years as a full-stack engineer, roughly half backend (Node.js) and half frontend (React)",
        "Built backend services for a mid-traffic SaaS product, not distributed-systems-scale work",
        "Some AWS Lambda/serverless experience",
      ],
      skills: ["Node.js", "React", "AWS Lambda", "MongoDB"],
    },
    {
      name: "Tom Reilly",
      title: "DevOps Engineer",
      years: 6,
      bullets: [
        "6 years in infrastructure/DevOps roles, scripting in Python for automation rather than building production services",
        "Deep AWS experience (Terraform, EKS) but not a backend-service-design background",
        "Supported backend teams rather than owning backend architecture directly",
      ],
      skills: ["Python", "AWS", "Terraform", "Kubernetes"],
    },
    {
      name: "Hannah Kim",
      title: "Software Engineer",
      years: 2,
      bullets: [
        "2 years building internal CRUD services in Python/Flask at a startup",
        "No distributed-systems or large-scale experience yet",
        "Comfortable with basic AWS deployment (Elastic Beanstalk)",
      ],
      skills: ["Python", "Flask", "AWS", "SQL"],
    },
    {
      name: "Ben Osei",
      title: "Backend Engineer Intern -> Junior Engineer",
      years: 1,
      bullets: [
        "1 year professional experience after a backend-focused bootcamp",
        "Built small internal tools in Python, no production-scale ownership",
        "Learning AWS fundamentals on the job",
      ],
      skills: ["Python", "SQL", "Git"],
    },
    {
      name: "Grace Lindqvist",
      title: "Platform Engineer",
      years: 5,
      bullets: [
        "5 years building internal developer-platform tooling in Go at a logistics company",
        "Deep Kubernetes/AWS experience but work was platform tooling, not customer-facing distributed systems",
        "Led adoption of infrastructure-as-code across 3 teams",
      ],
      skills: ["Go", "Kubernetes", "AWS", "Terraform"],
    },
  ],

  "data-scientist": [
    {
      name: "Dr. Amara Osei",
      title: "Senior Data Scientist",
      years: 6,
      expected: "top",
      bullets: [
        "Designed and ran 40+ A/B experiments using rigorous causal-inference methods, directly shaping product roadmap",
        "Built a churn-prediction model in Python (scikit-learn, pandas) that reduced churn 12% in production",
        "Wrote complex SQL against a 50-table warehouse to build the company's core growth dashboards",
        "Regularly presented findings to non-technical executives, translating statistics into clear business recommendations",
      ],
      skills: ["Python", "pandas", "scikit-learn", "SQL", "A/B testing", "statistics", "causal inference"],
    },
    {
      name: "Carlos Jiménez",
      title: "Customer Support Representative",
      years: 5,
      expected: "bottom",
      bullets: [
        "Resolved 40+ customer tickets per day via Zendesk, maintaining a 97% CSAT score",
        "Trained 6 new support hires on product troubleshooting workflows",
        "Escalated recurring product bugs to engineering with detailed reproduction steps",
        "No background in statistics, modeling, or data analysis tooling",
      ],
      skills: ["Zendesk", "customer communication", "troubleshooting", "Excel"],
    },
    {
      name: "Wei Zhang",
      title: "Data Analyst",
      years: 4,
      bullets: [
        "4 years writing SQL and building dashboards (Looker) for a marketplace company",
        "Some Python experience with pandas for ad-hoc analysis, limited formal statistical modeling",
        "Presents weekly metrics reviews to the product team",
      ],
      skills: ["SQL", "Looker", "Python", "pandas"],
    },
    {
      name: "Rebecca Lund",
      title: "Research Scientist (Academia -> Industry transition)",
      years: 3,
      bullets: [
        "PhD in Statistics; 3 years applying causal inference methods in a research lab setting",
        "Strong statistical theory background but limited production-Python experience outside research code",
        "New to SQL, learning on the job",
      ],
      skills: ["R", "statistics", "causal inference", "Python (research)"],
    },
    {
      name: "Omar Haddad",
      title: "Business Intelligence Analyst",
      years: 5,
      bullets: [
        "5 years building SQL-heavy BI reports and dashboards for a retail chain",
        "Comfortable with descriptive statistics, limited experience with predictive modeling",
        "Regularly presents to store-operations leadership",
      ],
      skills: ["SQL", "Tableau", "Excel", "basic statistics"],
    },
    {
      name: "Nina Petrovna",
      title: "Machine Learning Engineer",
      years: 4,
      bullets: [
        "4 years deploying ML models to production (scikit-learn, some PyTorch)",
        "Strong Python/engineering skills, somewhat lighter on experimental design and A/B testing methodology",
        "SQL proficient for feature engineering",
      ],
      skills: ["Python", "scikit-learn", "PyTorch", "SQL"],
    },
    {
      name: "Jack Donovan",
      title: "Junior Data Scientist",
      years: 1,
      bullets: [
        "1 year applying basic regression/classification models in Python under senior supervision",
        "Took a graduate statistics course but has limited real-world experimental design experience",
        "Learning to communicate findings to non-technical audiences",
      ],
      skills: ["Python", "pandas", "scikit-learn", "SQL (basic)"],
    },
    {
      name: "Isabel Moreno",
      title: "Growth Analyst",
      years: 3,
      bullets: [
        "3 years running growth experiments, mostly simple A/B tests without rigorous statistical design",
        "SQL-proficient, basic Python for analysis scripts",
        "Presents experiment results to the growth team weekly",
      ],
      skills: ["SQL", "Python (basic)", "A/B testing (basic)", "Excel"],
    },
    {
      name: "Felix Bauer",
      title: "Quantitative Analyst",
      years: 5,
      bullets: [
        "5 years building statistical models for a trading desk, deep statistics background",
        "Primarily uses proprietary tooling rather than Python/pandas day-to-day",
        "Communicates mostly to other quants, less practice with non-technical stakeholders",
      ],
      skills: ["statistics", "R", "SQL", "quantitative modeling"],
    },
    {
      name: "Aaliyah Brooks",
      title: "Product Analyst",
      years: 2,
      bullets: [
        "2 years supporting product teams with SQL analysis and lightweight experimentation",
        "Beginner-level Python/pandas, learning statistical modeling fundamentals",
        "Comfortable presenting simple findings to product managers",
      ],
      skills: ["SQL", "Python (beginner)", "Excel", "Amplitude"],
    },
  ],

  "product-designer": [
    {
      name: "Mei Lin Tan",
      title: "Senior Product Designer",
      years: 6,
      expected: "top",
      bullets: [
        "Led end-to-end redesign of a core onboarding flow, increasing activation rate 22%, from research through final UI",
        "Ran 50+ moderated usability tests over 3 years, building a repeatable research practice for the design team",
        "Expert in Figma, including building and maintaining the company's design system/component library",
        "Portfolio includes 6 detailed case studies covering discovery, iteration, and post-launch measurement",
      ],
      skills: ["Figma", "user research", "usability testing", "design systems", "prototyping"],
    },
    {
      name: "Gregory Hastings",
      title: "Financial Analyst",
      years: 5,
      expected: "bottom",
      bullets: [
        "5 years building financial models and forecasts for a manufacturing company's FP&A team",
        "Advanced Excel user, built the company's quarterly board-reporting templates",
        "Presents variance analysis to the CFO monthly",
        "No design, UX research, or Figma experience",
      ],
      skills: ["Excel", "financial modeling", "forecasting", "GAAP"],
    },
    {
      name: "Alex Rivera",
      title: "Product Designer",
      years: 3,
      bullets: [
        "3 years designing features for a mobile app in Figma, working closely with a senior designer",
        "Has run a handful of informal user interviews but not formal usability testing programs",
        "Portfolio shows solid UI craft, lighter on end-to-end process documentation",
      ],
      skills: ["Figma", "UI design", "prototyping"],
    },
    {
      name: "Sam Okonkwo",
      title: "UX Researcher",
      years: 4,
      bullets: [
        "4 years as a dedicated UX researcher, deep usability-testing and research-methods background",
        "Works in Figma for research artifacts but does not personally own visual/UI design",
        "No end-to-end design portfolio since research and design are separate roles on their team",
      ],
      skills: ["user research", "usability testing", "Figma (research use)", "survey design"],
    },
    {
      name: "Lucia Ferrara",
      title: "Visual/UI Designer",
      years: 5,
      bullets: [
        "5 years focused on visual design and branding, strong Figma skills",
        "Limited formal user-research practice — relies on stakeholder feedback more than usability testing",
        "Portfolio is strong on visual polish, lighter on research/process depth",
      ],
      skills: ["Figma", "visual design", "branding", "prototyping"],
    },
    {
      name: "Noah Fischer",
      title: "Junior Product Designer",
      years: 1,
      bullets: [
        "1 year of professional design experience after a UX bootcamp",
        "Comfortable in Figma, has observed but not independently led usability tests",
        "Small portfolio with 2 case studies",
      ],
      skills: ["Figma", "wireframing", "basic prototyping"],
    },
    {
      name: "Priya Chandra",
      title: "Product Designer (B2B)",
      years: 4,
      bullets: [
        "4 years designing B2B dashboard products in Figma",
        "Runs lightweight usability tests roughly once a quarter, not a continuous research practice",
        "Portfolio includes 3 solid case studies covering process end-to-end",
      ],
      skills: ["Figma", "user research (lightweight)", "dashboard design", "prototyping"],
    },
    {
      name: "Owen Bright",
      title: "Graphic Designer transitioning to Product",
      years: 6,
      bullets: [
        "6 years in graphic/brand design, 1 year transitioning into product/UX work",
        "Still building Figma proficiency for interactive prototyping",
        "No formal usability-testing experience yet",
      ],
      skills: ["Adobe Illustrator", "Figma (learning)", "branding"],
    },
    {
      name: "Yuki Tanaka",
      title: "Product Designer",
      years: 2,
      bullets: [
        "2 years designing features for a consumer app, moderate Figma proficiency",
        "Has run a few unmoderated usability tests via remote testing tools",
        "Portfolio has 2 case studies, each showing partial end-to-end process",
      ],
      skills: ["Figma", "usability testing (unmoderated)", "prototyping"],
    },
    {
      name: "Claire Dubois",
      title: "UX/UI Designer",
      years: 3,
      bullets: [
        "3 years as a generalist UX/UI designer at a small startup, wearing many hats",
        "Conducts informal user interviews but no structured research program",
        "Portfolio covers 3 projects with reasonable end-to-end detail",
      ],
      skills: ["Figma", "UI design", "informal user interviews", "prototyping"],
    },
  ],

  "devops-sre": [
    {
      name: "Viktor Novak",
      title: "Senior Site Reliability Engineer",
      years: 7,
      expected: "top",
      bullets: [
        "Ran production Kubernetes clusters serving 99.99% uptime across 300+ microservices for 5 years",
        "Designed the company's CI/CD pipeline (GitHub Actions + ArgoCD), cutting deploy time from 1hr to 8min",
        "Wrote and maintained 100% of infrastructure in Terraform across AWS, enabling full environment reproducibility",
        "Led on-call rotation and incident response for 4 years, including writing the company's incident postmortem process",
      ],
      skills: ["Kubernetes", "Terraform", "CI/CD", "AWS", "incident response", "ArgoCD"],
    },
    {
      name: "Rachel Stein",
      title: "Corporate Counsel",
      years: 6,
      expected: "bottom",
      bullets: [
        "6 years as in-house counsel reviewing and negotiating commercial contracts",
        "Advised leadership on regulatory compliance across 3 jurisdictions",
        "Led due diligence on 2 acquisitions",
        "No infrastructure, Kubernetes, or CI/CD experience",
      ],
      skills: ["contract negotiation", "regulatory compliance", "M&A due diligence", "JD"],
    },
    {
      name: "Diego Alvarez",
      title: "DevOps Engineer",
      years: 4,
      bullets: [
        "4 years managing Kubernetes clusters for a mid-size SaaS company, solid but not deep expert-level depth",
        "Built CI/CD pipelines in Jenkins",
        "Some Terraform experience, mostly maintaining existing modules rather than designing from scratch",
      ],
      skills: ["Kubernetes", "Jenkins", "Terraform (maintenance)", "AWS"],
    },
    {
      name: "Hana Suzuki",
      title: "Backend Engineer with Infra responsibilities",
      years: 5,
      bullets: [
        "5 years as a backend engineer who also owns parts of the deploy pipeline",
        "Comfortable with Docker and basic Kubernetes, not a dedicated SRE background",
        "Limited formal on-call/incident-response ownership",
      ],
      skills: ["Docker", "Kubernetes (basic)", "AWS", "Python"],
    },
    {
      name: "Patrick O'Malley",
      title: "Systems Administrator",
      years: 8,
      bullets: [
        "8 years as a traditional sysadmin, now transitioning to cloud/Kubernetes",
        "Deep on-call/incident-response experience from a legacy on-prem environment",
        "Still building up Terraform and modern CI/CD skills",
      ],
      skills: ["Linux administration", "on-call", "Kubernetes (learning)", "bash scripting"],
    },
    {
      name: "Lena Brandt",
      title: "Cloud Engineer",
      years: 3,
      bullets: [
        "3 years focused on AWS infrastructure-as-code (Terraform), lighter Kubernetes depth",
        "Supported CI/CD pipelines built by others rather than designing them",
        "Limited on-call incident-response experience so far",
      ],
      skills: ["Terraform", "AWS", "CI/CD (support)", "CloudFormation"],
    },
    {
      name: "Andre Dupont",
      title: "Platform Engineer",
      years: 6,
      bullets: [
        "6 years building internal platform tooling, strong Kubernetes and CI/CD background",
        "Terraform used for platform infra, not full infrastructure-as-code ownership org-wide",
        "Shares on-call with a small platform team",
      ],
      skills: ["Kubernetes", "CI/CD", "Terraform", "Go"],
    },
    {
      name: "Grace Okafor",
      title: "Junior DevOps Engineer",
      years: 2,
      bullets: [
        "2 years supporting Kubernetes clusters under senior guidance",
        "Learning Terraform and CI/CD pipeline design",
        "Participates in on-call rotation as secondary responder",
      ],
      skills: ["Kubernetes (supporting)", "Docker", "basic Terraform"],
    },
    {
      name: "Mateo Silva",
      title: "Site Reliability Engineer",
      years: 4,
      bullets: [
        "4 years as an SRE at a mid-size company, solid Kubernetes and incident-response experience",
        "CI/CD pipeline maintenance (CircleCI), not full greenfield design",
        "Some Terraform, primarily for smaller services",
      ],
      skills: ["Kubernetes", "CircleCI", "Terraform", "incident response"],
    },
    {
      name: "Fatima Al-Rashid",
      title: "Network Engineer transitioning to Cloud",
      years: 7,
      bullets: [
        "7 years in network engineering, 1 year transitioning into cloud/Kubernetes work",
        "Strong infrastructure fundamentals, still building hands-on Kubernetes/Terraform depth",
        "Experienced with on-call from network-operations background",
      ],
      skills: ["networking", "Kubernetes (learning)", "on-call", "AWS (new)"],
    },
  ],

  "sales-ae": [
    {
      name: "Brandon Walsh",
      title: "Senior Account Executive",
      years: 5,
      expected: "top",
      bullets: [
        "Closed $2.4M in new B2B SaaS ARR last year, 140% of quota, ranked #1 of 12 AEs",
        "Owns full sales cycle from outbound prospecting through contract close for mid-market accounts",
        "Expert Salesforce user, built the team's current pipeline-forecasting process",
        "Consistently sells 5- and 6-figure annual contracts to enterprise accounts",
      ],
      skills: ["B2B SaaS sales", "Salesforce", "enterprise sales", "pipeline forecasting", "negotiation"],
    },
    {
      name: "Dr. Susan Whitfield",
      title: "Staff Backend Engineer",
      years: 9,
      expected: "bottom",
      bullets: [
        "9 years building distributed backend systems in Go and Python",
        "Led infrastructure migration to Kubernetes on AWS",
        "No sales, quota, or CRM experience",
        "Technical individual contributor, not a customer-facing role",
      ],
      skills: ["Go", "Python", "AWS", "Kubernetes", "distributed systems"],
    },
    {
      name: "Monica Reyes",
      title: "Account Executive",
      years: 2,
      bullets: [
        "2 years closing B2B SaaS deals, consistently around 90-100% of quota",
        "Manages full sales cycle for small-to-mid-market accounts",
        "Comfortable with Salesforce, less enterprise-account experience",
      ],
      skills: ["B2B SaaS sales", "Salesforce", "SMB sales"],
    },
    {
      name: "Kevin Park",
      title: "Sales Development Representative -> AE",
      years: 3,
      bullets: [
        "3 years total, 1 year as a closing AE after 2 years as an SDR",
        "Hit quota 2 of the last 4 quarters as a new AE",
        "Still building full-cycle and enterprise-deal experience",
      ],
      skills: ["Salesforce", "prospecting", "B2B sales"],
    },
    {
      name: "Angela Costa",
      title: "Customer Success Manager",
      years: 4,
      bullets: [
        "4 years in customer success, owning renewals and upsells (not net-new sales)",
        "Strong relationship-management and CRM skills",
        "Limited net-new prospecting/closing experience",
      ],
      skills: ["customer success", "Salesforce", "upselling", "account management"],
    },
    {
      name: "Derek Simmons",
      title: "Account Executive",
      years: 6,
      bullets: [
        "6 years in SaaS sales, consistent quota attainment (~95-110%) in the SMB segment",
        "Full-cycle sales experience, mostly smaller deal sizes than enterprise",
        "Solid Salesforce/HubSpot proficiency",
      ],
      skills: ["B2B SaaS sales", "HubSpot", "Salesforce", "SMB sales"],
    },
    {
      name: "Natalie Wong",
      title: "Enterprise Account Executive",
      years: 7,
      bullets: [
        "7 years, strong enterprise sales background but at inconsistent quota attainment (3 of last 6 quarters)",
        "Deep experience with complex, long sales cycles and multiple stakeholders",
        "Expert Salesforce user",
      ],
      skills: ["enterprise sales", "Salesforce", "complex deal management"],
    },
    {
      name: "Chris Dalton",
      title: "Inside Sales Representative",
      years: 2,
      bullets: [
        "2 years in inside sales for a SaaS product, mostly inbound-driven deals",
        "Owns parts of the sales cycle but works closely with a senior AE on closing",
        "Learning Salesforce and enterprise-selling skills",
      ],
      skills: ["inside sales", "Salesforce (basic)", "inbound sales"],
    },
    {
      name: "Jasmine Patel",
      title: "Account Executive",
      years: 1,
      bullets: [
        "1 year as a new AE, still ramping toward consistent quota attainment",
        "Full-cycle responsibility for a small book of SMB accounts",
        "Learning the CRM and sales process",
      ],
      skills: ["B2B sales", "Salesforce (learning)", "SMB accounts"],
    },
    {
      name: "Robert Nguyen",
      title: "Channel Partnerships Manager",
      years: 5,
      bullets: [
        "5 years managing reseller/channel partnerships rather than direct sales",
        "Indirect quota responsibility through partner-driven revenue",
        "CRM-proficient but limited direct full-cycle closing experience",
      ],
      skills: ["channel partnerships", "Salesforce", "partner management"],
    },
  ],

  "marketing-manager": [
    {
      name: "Samantha Price",
      title: "Senior Demand Generation Manager",
      years: 5,
      expected: "top",
      bullets: [
        "Owned $3M annual paid acquisition budget across Google Ads and LinkedIn Ads for a B2B SaaS company",
        "Built multi-touch attribution model that reduced CAC by 24% over 2 years",
        "Grew qualified pipeline from paid channels by 60% year-over-year",
        "5+ years in B2B demand generation, owning strategy end-to-end",
      ],
      skills: ["demand generation", "Google Ads", "LinkedIn Ads", "marketing attribution", "budget management"],
    },
    {
      name: "Dr. Henry Caldwell",
      title: "Senior Site Reliability Engineer",
      years: 8,
      expected: "bottom",
      bullets: [
        "8 years running Kubernetes infrastructure and CI/CD pipelines",
        "Deep Terraform and AWS expertise, led on-call incident response",
        "No marketing, campaign management, or demand-generation experience",
        "Technical infrastructure role, not customer-facing or growth-focused",
      ],
      skills: ["Kubernetes", "Terraform", "AWS", "CI/CD", "incident response"],
    },
    {
      name: "Olivia Marsh",
      title: "Marketing Manager",
      years: 3,
      bullets: [
        "3 years running paid campaigns (Google Ads primarily, limited LinkedIn)",
        "Some attribution/analytics work, mostly relies on platform-native reporting",
        "Manages a modest budget (~$300K/year)",
      ],
      skills: ["Google Ads", "demand generation", "basic analytics"],
    },
    {
      name: "Ethan Brooks",
      title: "Growth Marketing Manager",
      years: 4,
      bullets: [
        "4 years in growth marketing, mostly organic/content-driven rather than paid acquisition",
        "Limited hands-on paid-campaign management experience",
        "Strong analytics background using GA4 and Amplitude",
      ],
      skills: ["content marketing", "SEO", "analytics (GA4)", "growth experiments"],
    },
    {
      name: "Rachel Kim",
      title: "Content Marketing Manager",
      years: 5,
      bullets: [
        "5 years leading content strategy and editorial calendar for a B2B brand",
        "No direct paid-acquisition campaign management",
        "Collaborates with demand gen but does not own that budget",
      ],
      skills: ["content strategy", "editorial", "SEO", "brand marketing"],
    },
    {
      name: "Marco Rinaldi",
      title: "Performance Marketing Manager",
      years: 3,
      bullets: [
        "3 years managing Google Ads and Meta Ads for a mid-size e-commerce brand (B2C, not B2B)",
        "Strong paid-acquisition and attribution skills, but limited B2B SaaS experience specifically",
        "Owns a $1M annual budget",
      ],
      skills: ["Google Ads", "Meta Ads", "attribution", "e-commerce marketing"],
    },
    {
      name: "Priya Desai",
      title: "Marketing Coordinator -> Manager",
      years: 2,
      bullets: [
        "2 years, recently promoted to manage a small paid-campaign budget",
        "Still building attribution/analytics depth",
        "Comfortable with LinkedIn Ads, less experience with Google Ads",
      ],
      skills: ["LinkedIn Ads", "demand generation (junior)", "email marketing"],
    },
    {
      name: "Liam O'Connor",
      title: "Field Marketing Manager",
      years: 6,
      bullets: [
        "6 years running events and field marketing programs, not digital/paid acquisition",
        "Manages a budget but it's event-focused rather than paid-media-focused",
        "Limited hands-on Google/LinkedIn Ads experience",
      ],
      skills: ["event marketing", "field marketing", "budget management"],
    },
    {
      name: "Sophia Mendez",
      title: "Demand Generation Specialist",
      years: 2,
      bullets: [
        "2 years executing campaigns designed by a senior manager, not yet owning strategy",
        "Hands-on with Google Ads and basic attribution reporting",
        "Limited budget-ownership experience so far",
      ],
      skills: ["Google Ads", "campaign execution", "basic attribution"],
    },
    {
      name: "James Carter",
      title: "Product Marketing Manager",
      years: 4,
      bullets: [
        "4 years in product marketing — positioning, messaging, launches — not demand generation",
        "Works alongside demand gen but doesn't own paid acquisition",
        "No direct Google/LinkedIn Ads campaign management experience",
      ],
      skills: ["product marketing", "positioning", "launch management"],
    },
  ],

  "frontend-engineer": [
    {
      name: "Zoe Harrington",
      title: "Senior Frontend Engineer",
      years: 6,
      expected: "top",
      bullets: [
        "6 years building production React applications, including a design system used across 15+ internal apps",
        "Led a TypeScript migration for a 200K-line codebase, catching 300+ latent bugs via strict typing",
        "Cut largest-contentful-paint from 4.2s to 1.1s through code-splitting and image-pipeline optimization",
        "Drove the team's WCAG 2.1 AA compliance effort, fixing 150+ accessibility issues",
      ],
      skills: ["React", "TypeScript", "web performance", "accessibility", "WCAG", "design systems"],
    },
    {
      name: "Dr. Patricia Lowe",
      title: "Financial Analyst",
      years: 7,
      expected: "bottom",
      bullets: [
        "7 years building financial models and forecasts in Excel for a healthcare company",
        "Deep GAAP and accounting knowledge, presents to the CFO monthly",
        "No frontend, React, TypeScript, or web development experience",
        "Finance role with no software engineering background",
      ],
      skills: ["Excel", "financial modeling", "GAAP", "forecasting"],
    },
    {
      name: "Ryan Cho",
      title: "Frontend Engineer",
      years: 3,
      bullets: [
        "3 years building React features for a consumer app, moderate TypeScript use (not strict mode everywhere)",
        "Some awareness of performance best practices, hasn't led a dedicated optimization effort",
        "Limited formal accessibility experience",
      ],
      skills: ["React", "TypeScript (partial)", "CSS", "JavaScript"],
    },
    {
      name: "Isabella Conti",
      title: "Full-Stack Engineer",
      years: 5,
      bullets: [
        "5 years full-stack, roughly 50/50 React frontend and Node.js backend work",
        "Solid TypeScript skills on the pieces she owns",
        "No dedicated performance-optimization or accessibility initiatives led",
      ],
      skills: ["React", "TypeScript", "Node.js", "CSS"],
    },
    {
      name: "Tyler Brooks",
      title: "UI Engineer",
      years: 4,
      bullets: [
        "4 years focused on UI implementation from design mockups, strong CSS/React skills",
        "Lighter TypeScript experience (mostly JavaScript codebases)",
        "Some accessibility awareness from design-system work",
      ],
      skills: ["React", "JavaScript", "CSS", "design implementation"],
    },
    {
      name: "Aisha Mahmoud",
      title: "Frontend Engineer",
      years: 2,
      bullets: [
        "2 years building React components under senior guidance",
        "Learning TypeScript, uses it for new code but not confident with advanced types",
        "No formal performance or accessibility ownership yet",
      ],
      skills: ["React", "TypeScript (learning)", "JavaScript"],
    },
    {
      name: "Connor Blake",
      title: "Senior Mobile Engineer (iOS)",
      years: 6,
      bullets: [
        "6 years as a senior iOS engineer (Swift), strong general software engineering fundamentals",
        "Limited React/web experience, recently started learning frontend web development",
        "Strong performance-optimization instincts from mobile, not web-specific yet",
      ],
      skills: ["Swift", "iOS", "performance optimization (mobile)", "React (new)"],
    },
    {
      name: "Nadia Volkov",
      title: "Frontend Engineer",
      years: 5,
      bullets: [
        "5 years building Vue.js applications (not React specifically), strong general frontend fundamentals",
        "Solid TypeScript user",
        "Has done some accessibility work but not a dedicated WCAG compliance push",
      ],
      skills: ["Vue.js", "TypeScript", "JavaScript", "CSS"],
    },
    {
      name: "Marcus Reilly",
      title: "Junior Frontend Engineer",
      years: 1,
      bullets: [
        "1 year building small React features after a coding bootcamp",
        "Basic TypeScript familiarity",
        "No performance or accessibility project experience yet",
      ],
      skills: ["React", "JavaScript", "HTML/CSS"],
    },
    {
      name: "Grace Liu",
      title: "Frontend Engineer",
      years: 4,
      bullets: [
        "4 years building React/TypeScript applications for an internal tools team (not public-facing scale)",
        "Some performance awareness but not large-scale optimization work",
        "Basic accessibility compliance on newer features",
      ],
      skills: ["React", "TypeScript", "internal tools", "basic accessibility"],
    },
  ],

  "support-lead": [
    {
      name: "Danielle Foster",
      title: "Customer Support Manager",
      years: 5,
      expected: "top",
      bullets: [
        "Built and led a 12-person support team, improving CSAT from 78% to 94% over 2 years",
        "Migrated the team from email-only support to Zendesk, cutting average response time by 60%",
        "Redesigned SLA tiers, hitting 98% first-response SLA compliance for 18 consecutive months",
        "Hired and onboarded 9 support staff, built the team's coaching and QA review process",
      ],
      skills: ["Zendesk", "team leadership", "CSAT improvement", "SLA management", "coaching"],
    },
    {
      name: "Dr. Thomas Reed",
      title: "Senior Data Scientist",
      years: 7,
      expected: "bottom",
      bullets: [
        "7 years building statistical models and ML systems in Python, PhD in Statistics",
        "No people-management or team-leadership experience",
        "No customer support, Zendesk, or SLA-management background",
        "Individual-contributor research role, not operations-focused",
      ],
      skills: ["Python", "statistics", "machine learning", "SQL"],
    },
    {
      name: "Megan Toussaint",
      title: "Support Team Lead",
      years: 2,
      bullets: [
        "2 years leading a 4-person support team, moderate CSAT gains",
        "Uses Zendesk daily, didn't own the tooling migration/setup",
        "Hired 2 people so far, still building out a formal coaching process",
      ],
      skills: ["Zendesk", "team leadership (small team)", "CSAT"],
    },
    {
      name: "Carlos Mendoza",
      title: "Senior Support Agent",
      years: 4,
      bullets: [
        "4 years as a top-performing individual-contributor support agent",
        "Mentors newer agents informally but has not formally managed a team",
        "Deep Zendesk power-user skills",
      ],
      skills: ["Zendesk", "customer support", "mentoring (informal)"],
    },
    {
      name: "Hannah Price",
      title: "Operations Manager",
      years: 6,
      bullets: [
        "6 years managing operations teams (logistics, not customer support specifically)",
        "Strong general people-management and SLA/process-design skills",
        "No direct customer-support or Zendesk experience",
      ],
      skills: ["operations management", "SLA design", "team leadership", "process improvement"],
    },
    {
      name: "Victor Nwosu",
      title: "Support Team Lead",
      years: 3,
      bullets: [
        "3 years leading a 6-person support team, solid CSAT performance (steady ~88%)",
        "Uses Zendesk and Intercom, some tooling-migration experience",
        "Hires occasionally, limited formal coaching framework",
      ],
      skills: ["Zendesk", "Intercom", "team leadership", "hiring"],
    },
    {
      name: "Laura Jensen",
      title: "Customer Experience Manager",
      years: 5,
      bullets: [
        "5 years owning customer-experience strategy broadly (surveys, journey mapping), less day-to-day team ops",
        "Limited direct Zendesk/ticketing-tool ownership",
        "Manages a small team of 3",
      ],
      skills: ["customer experience strategy", "journey mapping", "team leadership (small)"],
    },
    {
      name: "Derrick Owens",
      title: "Support Agent -> Shift Lead",
      years: 2,
      bullets: [
        "2 years as an agent, 6 months as an informal shift lead (not a full people-manager role yet)",
        "Solid Zendesk skills from daily agent work",
        "No hiring/coaching experience yet",
      ],
      skills: ["Zendesk", "customer support", "shift leadership (informal)"],
    },
    {
      name: "Priya Shah",
      title: "Call Center Supervisor",
      years: 7,
      bullets: [
        "7 years supervising a call-center team (phone support, not primarily Zendesk/ticketing)",
        "Deep SLA-management and coaching experience in a phone-support context",
        "Would need to adapt to a modern ticketing-tool-based support model",
      ],
      skills: ["call center management", "SLA management", "coaching", "workforce scheduling"],
    },
    {
      name: "Ben Castillo",
      title: "Support Operations Analyst",
      years: 3,
      bullets: [
        "3 years analyzing support metrics and building Zendesk reporting/dashboards",
        "No direct people-management experience — an analyst role supporting the support team, not leading it",
        "Deep knowledge of SLA/CSAT metrics from the analytics side",
      ],
      skills: ["Zendesk reporting", "support analytics", "SLA metrics"],
    },
  ],

  "financial-analyst": [
    {
      name: "Jonathan Pierce",
      title: "Senior Financial Analyst",
      years: 5,
      expected: "top",
      bullets: [
        "Built the company's 3-statement financial model used for board reporting and fundraising for 4 years",
        "Advanced Excel user (array formulas, macros), built automated variance-analysis templates",
        "Deep GAAP knowledge from 2 years in public accounting before moving to FP&A",
        "Presents monthly financial reviews directly to the CFO and executive team",
      ],
      skills: ["financial modeling", "Excel", "GAAP", "forecasting", "FP&A"],
    },
    {
      name: "Dr. Melissa Grant",
      title: "Senior Product Designer",
      years: 6,
      expected: "bottom",
      bullets: [
        "6 years leading end-to-end UX design for consumer products",
        "Expert in Figma and user research methodologies",
        "No financial modeling, Excel-at-depth, or GAAP/accounting background",
        "Design role with no finance experience",
      ],
      skills: ["Figma", "UX design", "user research", "prototyping"],
    },
    {
      name: "Emily Zhao",
      title: "Financial Analyst",
      years: 2,
      bullets: [
        "2 years building basic forecasting models under senior guidance",
        "Solid Excel skills, still developing advanced modeling techniques",
        "Limited direct presentation experience to senior leadership",
      ],
      skills: ["Excel", "basic financial modeling", "forecasting"],
    },
    {
      name: "Nathan Greer",
      title: "Accountant",
      years: 6,
      bullets: [
        "6 years in accounting (not FP&A), deep GAAP/compliance knowledge",
        "Solid Excel user but limited forward-looking forecasting/modeling experience",
        "Presents to the controller, not typically to executive leadership",
      ],
      skills: ["accounting", "GAAP", "Excel", "compliance"],
    },
    {
      name: "Sarah Blackwood",
      title: "Investment Banking Analyst",
      years: 2,
      bullets: [
        "2 years in IB, extremely strong Excel and financial-modeling skills under high pressure",
        "Less exposure to internal FP&A forecasting/budgeting cycles specifically",
        "Limited GAAP-compliance-specific experience (deal modeling focus instead)",
      ],
      skills: ["Excel", "financial modeling (deals)", "valuation"],
    },
    {
      name: "Michael Osei",
      title: "Business Analyst",
      years: 4,
      bullets: [
        "4 years doing general business analysis, moderate Excel use, limited formal financial modeling",
        "Basic understanding of accounting fundamentals, not deep GAAP expertise",
        "Occasionally presents findings to mid-level management",
      ],
      skills: ["Excel (moderate)", "business analysis", "basic accounting"],
    },
    {
      name: "Claudia Fernandez",
      title: "FP&A Manager",
      years: 7,
      bullets: [
        "7 years in FP&A, strong modeling and forecasting background, slightly senior for the role",
        "Advanced Excel and some GAAP knowledge from cross-functional accounting exposure",
        "Regularly presents to the CFO and board",
      ],
      skills: ["financial modeling", "Excel", "forecasting", "FP&A", "GAAP (working knowledge)"],
    },
    {
      name: "Daniel Kessler",
      title: "Junior Financial Analyst",
      years: 1,
      bullets: [
        "1 year, builds simple Excel reports under close supervision",
        "Still learning forecasting methodology and GAAP fundamentals",
        "No executive-presentation experience yet",
      ],
      skills: ["Excel (basic)", "learning financial modeling"],
    },
    {
      name: "Patricia Nguyen",
      title: "Revenue Accountant",
      years: 5,
      bullets: [
        "5 years focused specifically on revenue recognition under GAAP (ASC 606)",
        "Strong GAAP depth in a narrow area, less broad forecasting/modeling experience",
        "Solid Excel skills for reconciliations",
      ],
      skills: ["GAAP (revenue recognition)", "Excel", "accounting"],
    },
    {
      name: "George Whitmore",
      title: "Operations Analyst",
      years: 3,
      bullets: [
        "3 years analyzing operational (not financial) metrics, moderate Excel use",
        "Limited financial-modeling or GAAP exposure",
        "Presents operational dashboards to department heads",
      ],
      skills: ["Excel (moderate)", "operations analytics", "dashboards"],
    },
  ],

  "corporate-counsel": [
    {
      name: "Alexandra Whitfield, Esq.",
      title: "Senior Corporate Counsel",
      years: 8,
      expected: "top",
      bullets: [
        "JD, Columbia Law School; actively licensed and in good standing with the state bar",
        "8 years as in-house counsel, reviewing and negotiating 200+ commercial contracts annually",
        "Primary regulatory-compliance advisor across data privacy (GDPR, CCPA) and industry-specific regulation",
        "Led legal workstream on 3 acquisitions, including due diligence and deal-document negotiation",
      ],
      skills: ["JD", "bar admission", "contract negotiation", "regulatory compliance", "M&A due diligence"],
    },
    {
      name: "Brian Kowalski",
      title: "Marketing Manager",
      years: 6,
      expected: "bottom",
      bullets: [
        "6 years running demand-generation campaigns and managing a marketing budget",
        "Deep Google Ads and attribution experience",
        "No legal training, no JD, no bar admission",
        "No contract-review, compliance, or M&A experience",
      ],
      skills: ["demand generation", "Google Ads", "marketing attribution", "budget management"],
    },
    {
      name: "Thomas Reyes, Esq.",
      title: "Corporate Counsel",
      years: 3,
      bullets: [
        "JD and active bar admission, 3 years as in-house counsel",
        "Solid contract-review experience, less regulatory-compliance depth so far",
        "No M&A transaction experience yet",
      ],
      skills: ["JD", "bar admission", "contract review"],
    },
    {
      name: "Samantha Lee, Esq.",
      title: "Compliance Counsel",
      years: 5,
      bullets: [
        "JD and bar admission, 5 years focused specifically on regulatory compliance",
        "Limited day-to-day commercial-contract-negotiation volume (compliance-focused role)",
        "No M&A experience",
      ],
      skills: ["JD", "bar admission", "regulatory compliance"],
    },
    {
      name: "Marcus Ellison",
      title: "Contracts Manager (non-attorney)",
      years: 7,
      bullets: [
        "7 years managing contract review and negotiation as a non-attorney contracts manager",
        "No JD or bar admission — handles contracts under outside counsel's supervision",
        "Strong process/operations background for contract workflows",
      ],
      skills: ["contract management", "contract negotiation (non-attorney)", "process design"],
    },
    {
      name: "Elena Popescu, Esq.",
      title: "M&A Associate (law firm)",
      years: 4,
      bullets: [
        "JD and bar admission, 4 years at a law firm focused heavily on M&A transactions",
        "Deep M&A experience, less in-house generalist contract/compliance breadth",
        "Transitioning from firm to in-house for the first time",
      ],
      skills: ["JD", "bar admission", "M&A transactions", "due diligence"],
    },
    {
      name: "David Okonjo, Esq.",
      title: "Junior Corporate Counsel",
      years: 1,
      bullets: [
        "JD and bar admission, 1 year as in-house counsel",
        "Still building contract-negotiation volume and independence",
        "Limited compliance or M&A exposure so far",
      ],
      skills: ["JD", "bar admission", "contract review (junior)"],
    },
    {
      name: "Rebecca Stone",
      title: "Paralegal",
      years: 10,
      bullets: [
        "10 years as a senior paralegal supporting in-house counsel on contracts and compliance",
        "No JD or bar admission — extensive practical exposure but cannot independently practice law",
        "Deep process knowledge of the company's contract and compliance workflows",
      ],
      skills: ["paralegal support", "contract administration", "compliance tracking"],
    },
    {
      name: "William Foster, Esq.",
      title: "General Counsel (small company)",
      years: 12,
      bullets: [
        "JD and bar admission, 12 years, currently sole legal hire at a small company (broad generalist)",
        "Handles contracts, compliance, and occasional M&A, but thinly spread across all areas",
        "Would be a step down in scope/specialization from a dedicated corporate-counsel role at a larger org",
      ],
      skills: ["JD", "bar admission", "generalist in-house counsel", "contract review", "compliance"],
    },
    {
      name: "Grace Liu, Esq.",
      title: "Regulatory Affairs Counsel",
      years: 6,
      bullets: [
        "JD and bar admission, 6 years specialized in regulatory affairs for a healthcare company",
        "Deep compliance expertise, lighter commercial-contract-negotiation volume",
        "No M&A experience",
      ],
      skills: ["JD", "bar admission", "regulatory compliance (healthcare)"],
    },
  ],
};

export const resumes: ResumeFixture[] = Object.entries(pools).flatMap(([jobKey, specs]) =>
  specs.map((spec) => ({
    jobKey,
    name: spec.name,
    rawText: buildResume(spec),
    expected: spec.expected,
  })),
);
