export const COUNTRIES = [
  { name: "Nigeria", region: "Western Sub-Saharan Africa" },
  { name: "Ghana", region: "Western Sub-Saharan Africa" },
  { name: "South Africa", region: "Southern Sub-Saharan Africa" },
  { name: "Kenya", region: "Eastern Sub-Saharan Africa" },
  { name: "United States", region: "High-income North America" },
  { name: "Canada", region: "High-income North America" },
  { name: "United Kingdom", region: "Western Europe" },
  { name: "France", region: "Western Europe" },
  { name: "Germany", region: "Western Europe" },
  { name: "India", region: "South Asia" },
  { name: "China", region: "East Asia" },
  { name: "Japan", region: "High-income Asia Pacific" },
  { name: "Australia", region: "Australasia" },
  { name: "Brazil", region: "Tropical Latin America" },
  { name: "Mexico", region: "Central Latin America" },
  // (We will add the remaining ~180 countries when we wire the math engine, 
  // but this gives us a solid list to test the UX right now).
].sort((a, b) => a.name.localeCompare(b.name));

export type WHORegion = string;