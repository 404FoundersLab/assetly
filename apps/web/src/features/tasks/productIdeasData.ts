export interface ProductOpportunity {
  id: string;
  name: string;
  category: string;
  targetCustomers: string;
  competitors: string;
  difficulty: string;
  mvpTime: string;
  suggestedPrice: string;
  shortlistRank?: number;
  shortlistPrice?: string;
  rationale?: string;
  problemStatement?: string;
  differentiator?: string;
  validationStatus?: OpportunityValidationStatus;
  customerEvidence?: string;
  mvpScope?: string;
  investmentEstimate?: string;
  revenuePotential?: string;
  salesDifficulty?: string;
  teamFit?: string;
  nextStep?: string;
  assigneeIds?: string[];
  workStatus?: OpportunityWorkStatus;
  workStartedAt?: string;
}

export type OpportunityValidationStatus = 'not_validated' | 'interviews' | 'pilot' | 'validated' | 'parked';
export type OpportunityWorkStatus = 'not_started' | 'in_progress' | 'done';

export interface ProductOpportunityAssignment {
  opportunityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  workStatus: OpportunityWorkStatus;
  workStartedAt: string | null;
  nextStep: string;
}

export const MARKET_COMPARISON = [
  { category: 'Small utility tools', effort: 'Low', investment: '₹30k–₹75k', sales: 'Low–Medium', revenue: 'Low–Medium', fit: 'Excellent' },
  { category: 'Website tools', effort: 'Medium', investment: '₹50k–₹1.5L', sales: 'Medium', revenue: 'Medium', fit: 'Very good' },
  { category: 'Business management tools', effort: 'Medium–High', investment: '₹75k–₹2L', sales: 'Medium', revenue: 'High', fit: 'Excellent' },
  { category: 'Booking applications', effort: 'Medium–High', investment: '₹75k–₹2L', sales: 'Medium–High', revenue: 'High', fit: 'Very good' },
  { category: 'CRM platforms', effort: 'High', investment: '₹1L–₹2.5L', sales: 'High', revenue: 'High', fit: 'Good' },
  { category: 'HRMS platforms', effort: 'High', investment: '₹1L–₹2.5L', sales: 'High', revenue: 'High', fit: 'Good' },
  { category: 'Industry-specific SaaS', effort: 'High', investment: '₹1.5L–₹3L', sales: 'Medium–High', revenue: 'Very high', fit: 'Excellent if niche is validated' },
  { category: 'Enterprise SaaS', effort: 'Very high', investment: '₹3L+', sales: 'Very high', revenue: 'Very high', fit: 'Not recommended initially' },
];

export const PRICING_TIERS = [
  { name: 'Starter', price: '₹499–₹999', customer: 'Individual or small business' },
  { name: 'Growth', price: '₹1,499–₹2,999', customer: 'Growing business with multiple users' },
  { name: 'Business', price: '₹3,999–₹7,999', customer: 'Larger business with multiple branches' },
  { name: 'Enterprise', price: 'Custom', customer: 'Large organizations' },
];

export interface ProjectTodo {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string;
}

export const PRODUCT_CATEGORIES = [
  'Small tools and business utilities',
  'Websites and business management tools',
  'Booking, service and industry-specific applications',
  'CRM, HRMS and employee management platforms',
  'Large SaaS products and advanced platforms',
];

export const initialOpportunities: ProductOpportunity[] = [
  { id: 'opp-01', name: 'Invoice Generator', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Freelancers, small businesses', competitors: 'Zoho Invoice, Vyapar', difficulty: 'Easy', mvpTime: '1–2 weeks', suggestedPrice: '₹199–₹499/month' },
  { id: 'opp-02', name: 'Quotation Generator', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Contractors, vendors, agencies', competitors: 'Zoho Books, Refrens', difficulty: 'Easy', mvpTime: '1–2 weeks', suggestedPrice: '₹199–₹499/month' },
  { id: 'opp-03', name: 'PDF Tools Platform', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Individuals, offices', competitors: 'Smallpdf, iLovePDF', difficulty: 'Medium', mvpTime: '2–4 weeks', suggestedPrice: '₹99–₹299/month' },
  { id: 'opp-04', name: 'QR Code Generator', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Shops, restaurants, events', competitors: 'QR Code Monkey', difficulty: 'Easy', mvpTime: '1 week', suggestedPrice: '₹99–₹299/month' },
  { id: 'opp-05', name: 'Link Management Tool', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Marketing teams, creators', competitors: 'Bitly, Rebrandly', difficulty: 'Easy', mvpTime: '2–3 weeks', suggestedPrice: '₹199–₹799/month' },
  { id: 'opp-06', name: 'Appointment Booking Widget', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Consultants, salons, clinics', competitors: 'Calendly, SimplyBook.me', difficulty: 'Medium', mvpTime: '3–4 weeks', suggestedPrice: '₹299–₹999/month', shortlistRank: 6, shortlistPrice: '₹499/month', rationale: 'A clear use case that spans multiple service industries.' },
  { id: 'opp-07', name: 'Expense Tracker', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Freelancers, small companies', competitors: 'Expensify, Zoho Expense', difficulty: 'Easy–Medium', mvpTime: '3–4 weeks', suggestedPrice: '₹199–₹599/month' },
  { id: 'opp-08', name: 'Employee Attendance Tool', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Small offices, shops', competitors: 'Jibble, Zoho People', difficulty: 'Medium', mvpTime: '3–5 weeks', suggestedPrice: '₹499–₹1,499/month' },
  { id: 'opp-09', name: 'Digital Business Card', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Salespeople, professionals', competitors: 'HiHello, Blinq', difficulty: 'Easy', mvpTime: '2–3 weeks', suggestedPrice: '₹99–₹299/month' },
  { id: 'opp-10', name: 'WhatsApp Catalogue Builder', category: PRODUCT_CATEGORIES[0], targetCustomers: 'Retailers, distributors', competitors: 'Interakt, WATI', difficulty: 'Medium', mvpTime: '3–5 weeks', suggestedPrice: '₹499–₹1,499/month' },
  { id: 'opp-11', name: 'Website Builder', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Small businesses, freelancers', competitors: 'Wix, Webflow, WordPress', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹499–₹1,999/month' },
  { id: 'opp-12', name: 'Landing Page Builder', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Startups, marketing agencies', competitors: 'Unbounce, Leadpages', difficulty: 'Medium', mvpTime: '4–6 weeks', suggestedPrice: '₹499–₹1,499/month' },
  { id: 'opp-13', name: 'Customer Feedback Platform', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Restaurants, retailers, hotels', competitors: 'SurveyMonkey, Typeform', difficulty: 'Easy–Medium', mvpTime: '3–4 weeks', suggestedPrice: '₹299–₹999/month' },
  { id: 'opp-14', name: 'Digital Menu Management', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Restaurants, cafes', competitors: 'DotPe, MenuTiger', difficulty: 'Easy–Medium', mvpTime: '3–4 weeks', suggestedPrice: '₹299–₹999/month' },
  { id: 'opp-15', name: 'Inventory Management', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Retailers, wholesalers', competitors: 'Zoho Inventory, Vyapar', difficulty: 'Medium–High', mvpTime: '6–8 weeks', suggestedPrice: '₹999–₹2,999/month', shortlistRank: 8, shortlistPrice: '₹999/month', rationale: 'Useful across retail and wholesale; start with one validated niche.' },
  { id: 'opp-16', name: 'Billing and GST Software', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Shops, small businesses', competitors: 'TallyPrime, Vyapar, BUSY', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹499–₹1,999/month' },
  { id: 'opp-17', name: 'Order Management System', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Retailers, distributors', competitors: 'Zoho Inventory, Odoo', difficulty: 'Medium–High', mvpTime: '6–8 weeks', suggestedPrice: '₹999–₹3,999/month' },
  { id: 'opp-18', name: 'Vendor Management', category: PRODUCT_CATEGORIES[1], targetCustomers: 'SMEs, procurement teams', competitors: 'SAP Ariba, Precoro', difficulty: 'Medium', mvpTime: '5–7 weeks', suggestedPrice: '₹999–₹2,999/month' },
  { id: 'opp-19', name: 'Document Management', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Small companies, legal offices', competitors: 'DocuWare, Google Drive', difficulty: 'Medium–High', mvpTime: '6–8 weeks', suggestedPrice: '₹999–₹3,999/month' },
  { id: 'opp-20', name: 'Project Management Tool', category: PRODUCT_CATEGORIES[1], targetCustomers: 'Startups, agencies', competitors: 'Trello, Asana, ClickUp', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹499–₹1,999/month' },
  { id: 'opp-21', name: 'Clinic Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Clinics, doctors', competitors: 'Practo, Clinicea', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹1,499–₹4,999/month', shortlistRank: 9, shortlistPrice: '₹1,499/month', rationale: 'Recurring usage and retention potential; validate a clinic specialty first.' },
  { id: 'opp-22', name: 'Salon Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Salons, spas', competitors: 'Fresha, Zenoti', difficulty: 'Medium', mvpTime: '5–7 weeks', suggestedPrice: '₹799–₹2,499/month' },
  { id: 'opp-23', name: 'Hotel Booking Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Hotels, homestays', competitors: 'Cloudbeds, Little Hotelier', difficulty: 'High', mvpTime: '10–14 weeks', suggestedPrice: '₹1,999–₹5,999/month' },
  { id: 'opp-24', name: 'Coaching Centre Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Training institutes', competitors: 'Classplus, Teachmint', difficulty: 'Medium–High', mvpTime: '6–8 weeks', suggestedPrice: '₹999–₹2,999/month', shortlistRank: 5, shortlistPrice: '₹999/month', rationale: 'Combines fees, attendance, students, and parent communication.' },
  { id: 'opp-25', name: 'Gym Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Gyms, fitness studios', competitors: 'Gymdesk, Mindbody', difficulty: 'Medium', mvpTime: '6–8 weeks', suggestedPrice: '₹999–₹2,999/month' },
  { id: 'opp-26', name: 'Home Service Booking', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Electricians, plumbers, technicians', competitors: 'Urban Company', difficulty: 'High', mvpTime: '10–14 weeks', suggestedPrice: '₹1,499–₹4,999/month' },
  { id: 'opp-27', name: 'Field Service Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Repair companies, service teams', competitors: 'Zoho FSM, ServiceTitan', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹1,499–₹4,999/month', shortlistRank: 2, shortlistPrice: '₹1,499/month', rationale: 'Job assignments, technician tracking, and service reports solve recurring operational work.' },
  { id: 'opp-28', name: 'Apartment Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Apartment associations, RWAs', competitors: 'MyGate, NoBrokerHood', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹1,999–₹5,999/month' },
  { id: 'opp-29', name: 'Event Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Event planners, venues', competitors: 'Eventbrite, Zoho Backstage', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹999–₹3,999/month' },
  { id: 'opp-30', name: 'Vehicle Service Management', category: PRODUCT_CATEGORIES[2], targetCustomers: 'Garages, automobile workshops', competitors: 'GaragePlug, Workshop Software', difficulty: 'Medium', mvpTime: '5–8 weeks', suggestedPrice: '₹999–₹2,999/month', shortlistRank: 4, shortlistPrice: '₹999/month', rationale: 'Focused market with clear workshop workflows and a manageable MVP.' },
  { id: 'opp-31', name: 'Basic CRM', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Small businesses, sales teams', competitors: 'Zoho CRM, HubSpot', difficulty: 'Medium', mvpTime: '6–8 weeks', suggestedPrice: '₹499–₹1,499/month' },
  { id: 'opp-32', name: 'Real Estate CRM', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Builders, property agents', competitors: 'Sell.Do, LeadSquared', difficulty: 'Medium–High', mvpTime: '8–10 weeks', suggestedPrice: '₹1,499–₹4,999/month' },
  { id: 'opp-33', name: 'Recruitment CRM / ATS', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Recruitment agencies', competitors: 'Zoho Recruit, Freshteam', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹999–₹3,999/month', shortlistRank: 7, shortlistPrice: '₹999/month', rationale: 'Candidate tracking and recruitment workflows support a clear agency niche.' },
  { id: 'opp-34', name: 'HRMS', category: PRODUCT_CATEGORIES[3], targetCustomers: 'SMEs, startups', competitors: 'Darwinbox, Keka, greytHR', difficulty: 'High', mvpTime: '10–14 weeks', suggestedPrice: '₹1,499–₹4,999/month' },
  { id: 'opp-35', name: 'Payroll Management', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Small and medium companies', competitors: 'Razorpay Payroll, greytHR', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹999–₹3,999/month' },
  { id: 'opp-36', name: 'Leave and Attendance Management', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Small companies', competitors: 'Zoho People, Keka', difficulty: 'Medium', mvpTime: '4–6 weeks', suggestedPrice: '₹499–₹1,499/month' },
  { id: 'opp-37', name: 'Employee Performance Management', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Growing companies', competitors: 'Lattice, Darwinbox', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹999–₹2,999/month' },
  { id: 'opp-38', name: 'Sales Force Automation', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Distributors, sales teams', competitors: 'Bizom, FieldAssist', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹1,999–₹5,999/month' },
  { id: 'opp-39', name: 'Customer Support Ticketing', category: PRODUCT_CATEGORIES[3], targetCustomers: 'SaaS companies, service teams', competitors: 'Freshdesk, Zendesk', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹999–₹3,999/month' },
  { id: 'opp-40', name: 'WhatsApp CRM', category: PRODUCT_CATEGORIES[3], targetCustomers: 'Small businesses, agencies', competitors: 'WATI, Interakt, AiSensy', difficulty: 'Medium–High', mvpTime: '6–10 weeks', suggestedPrice: '₹999–₹4,999/month', shortlistRank: 3, shortlistPrice: '₹999/month', rationale: 'Customer communication and follow-up automation meet an everyday business need.' },
  { id: 'opp-41', name: 'Distributor Management System', category: PRODUCT_CATEGORIES[4], targetCustomers: 'Wholesalers, distributors', competitors: 'Bizom, Marg ERP', difficulty: 'High', mvpTime: '10–14 weeks', suggestedPrice: '₹1,999–₹7,999/month', shortlistRank: 1, shortlistPrice: '₹1,999/month', rationale: 'Recurring operational need with room for specialization by distributor niche.' },
  { id: 'opp-42', name: 'ERP Platform', category: PRODUCT_CATEGORIES[4], targetCustomers: 'SMEs, manufacturing companies', competitors: 'Odoo, ERPNext, Zoho ERP', difficulty: 'Very High', mvpTime: '4–8 months', suggestedPrice: '₹5,000–₹25,000/month' },
  { id: 'opp-43', name: 'E-commerce Platform', category: PRODUCT_CATEGORIES[4], targetCustomers: 'Retailers, D2C brands', competitors: 'Shopify, WooCommerce', difficulty: 'Very High', mvpTime: '3–6 months', suggestedPrice: '₹1,999–₹9,999/month' },
  { id: 'opp-44', name: 'Learning Management System', category: PRODUCT_CATEGORIES[4], targetCustomers: 'Schools, companies, trainers', competitors: 'Moodle, LearnUpon', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹1,999–₹7,999/month' },
  { id: 'opp-45', name: 'AI Chatbot Platform', category: PRODUCT_CATEGORIES[4], targetCustomers: 'Businesses, support teams', competitors: 'Intercom, Botpress', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹999–₹9,999/month' },
  { id: 'opp-46', name: 'AI Document Processing', category: PRODUCT_CATEGORIES[4], targetCustomers: 'Finance, legal, operations', competitors: 'Rossum, Docsumo', difficulty: 'Very High', mvpTime: '3–5 months', suggestedPrice: '₹2,999–₹15,000/month', shortlistRank: 10, shortlistPrice: '₹2,999/month', rationale: 'Higher-value business automation, balanced by a longer and more complex MVP.' },
  { id: 'opp-47', name: 'Workflow Automation Platform', category: PRODUCT_CATEGORIES[4], targetCustomers: 'SMEs, IT teams', competitors: 'Zapier, Make, n8n', difficulty: 'Very High', mvpTime: '3–6 months', suggestedPrice: '₹999–₹9,999/month' },
  { id: 'opp-48', name: 'Business Intelligence Dashboard', category: PRODUCT_CATEGORIES[4], targetCustomers: 'SMEs, management teams', competitors: 'Power BI, Metabase', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹1,999–₹9,999/month' },
  { id: 'opp-49', name: 'Subscription Billing Platform', category: PRODUCT_CATEGORIES[4], targetCustomers: 'SaaS companies', competitors: 'Chargebee, Razorpay Subscriptions', difficulty: 'High', mvpTime: '8–12 weeks', suggestedPrice: '₹1,499–₹7,999/month' },
  { id: 'opp-50', name: 'API Management Platform', category: PRODUCT_CATEGORIES[4], targetCustomers: 'Developers, enterprises', competitors: 'Kong, Apigee', difficulty: 'Very High', mvpTime: '4–8 months', suggestedPrice: '₹5,000–₹25,000/month' },
];

export const initialTodos: ProjectTodo[] = [
  { id: 'todo-01', title: 'Choose three opportunities to validate', status: 'todo', dueDate: '' },
  { id: 'todo-02', title: 'Interview potential customers in Bengaluru', status: 'todo', dueDate: '' },
  { id: 'todo-03', title: 'Record willingness to pay and current alternatives', status: 'todo', dueDate: '' },
  { id: 'todo-04', title: 'Compare findings and select one niche', status: 'todo', dueDate: '' },
  { id: 'todo-05', title: 'Define the first MVP scope and pricing tiers', status: 'todo', dueDate: '' },
];