// Shared industry list — used for the homepage "Browse by industry" chips
// and as suggestions on the profile Industry field (join/edit form).
// Keep this the single source of truth for both.
window.ST_INDUSTRIES = [
  'Technology',
  'Oil & Gas',
  'Agriculture',
  'Healthcare',
  'Education',
  'Finance & Banking',
  'Tourism & Hospitality',
  'Manufacturing',
  'Construction',
  'Retail & E-commerce',
  'Media & Creative Arts',
  'Government & Public Service',
  'Non-Profit & NGO',
  'Logistics & Transportation',
  'Energy & Utilities',
  'Food & Beverage',
  'Real Estate',
  'Legal Services',
  'Telecommunications',
  'Fashion & Design',
  'Sports & Fitness',
  'Environmental & Sustainability',
];

// First N are the ones surfaced as quick-pick chips on the homepage.
window.ST_INDUSTRIES_FEATURED = window.ST_INDUSTRIES.slice(0, 12);
