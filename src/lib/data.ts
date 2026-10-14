// Galina Express — central content model.

export const ORIGINS = [
  { id: "IST", city: "Istanbul", country: "Türkiye", hub: "Istanbul Airport (IST)" },
  { id: "YIW", city: "Yiwu", country: "China", hub: "Ningbo Port (CNNGB)" },
  { id: "DXB", city: "Dubai", country: "UAE", hub: "Dubai Intl (DXB)" },
  { id: "LON", city: "London", country: "United Kingdom", hub: "Heathrow (LHR)" },
  { id: "FRA", city: "Frankfurt", country: "Germany", hub: "Frankfurt Cargo (FRA)" },
] as const;

export const DESTINATIONS = [
  { id: "BGW", city: "Baghdad", country: "Iraq" },
  { id: "EBL", city: "Erbil", country: "Iraq" },
  { id: "BSR", city: "Basra", country: "Iraq" },
  { id: "ISU", city: "Sulaymaniyah", country: "Iraq" },
  { id: "OSM", city: "Mosul", country: "Iraq" },
  { id: "NJF", city: "Najaf", country: "Iraq" },
] as const;

export const SERVICES = [
  {
    id: "EXPRESS_AIR",
    label: "Express Air",
    blurb: "Next-flight-out air freight with priority customs. 48–72h door to door.",
    multiplier: 1,
    icon: "plane",
  },
  {
    id: "STANDARD_ROAD",
    label: "Standard Road",
    blurb: "Sealed trucking convoys on the Türkiye & GCC corridors. 5–8 days.",
    multiplier: 0.62,
    icon: "truck",
  },
  {
    id: "ECONOMY_SEA",
    label: "Economy Sea",
    blurb: "FCL & LCL via Umm Qasr with bonded road legs. 24–32 days.",
    multiplier: 0.38,
    icon: "ship",
  },
] as const;

export type ServiceId = (typeof SERVICES)[number]["id"];

// Base rate (USD) per kg by origin, plus fixed handling fee.
export const ORIGIN_RATES: Record<string, { perKg: number; handling: number; days: number }> = {
  IST: { perKg: 3.2, handling: 45, days: 2 },
  YIW: { perKg: 4.1, handling: 60, days: 5 },
  DXB: { perKg: 2.4, handling: 35, days: 1 },
  LON: { perKg: 5.2, handling: 70, days: 4 },
  FRA: { perKg: 4.6, handling: 65, days: 4 },
};

// Destination add-on (USD/kg) by Iraqi city + extra road days.
export const DESTINATION_RATES: Record<string, { perKg: number; extraDays: number }> = {
  BGW: { perKg: 0.4, extraDays: 0 },
  EBL: { perKg: 0.55, extraDays: 1 },
  BSR: { perKg: 0.5, extraDays: 1 },
  ISU: { perKg: 0.55, extraDays: 1 },
  OSM: { perKg: 0.7, extraDays: 2 },
  NJF: { perKg: 0.6, extraDays: 1 },
};

export const CORRIDORS = [
  {
    id: "TUR",
    origin: "Türkiye",
    label: "Istanbul → Baghdad / Erbil",
    mode: "Air + Sealed Road",
    transit: "48–72h",
    frequency: "Daily departures",
    gateways: ["Istanbul Airport (IST)", "Mardin Road Gateway", "Habur Crossing"],
    note: "Our flagship corridor. Electronics, textiles and FMCG move daily under seal with GRAND Guarantee escrow.",
  },
  {
    id: "CHN",
    origin: "China",
    label: "Yiwu / Guangzhou → Umm Qasr",
    mode: "Sea FCL/LCL + Road",
    transit: "24–32 days",
    frequency: "3 sailings weekly",
    gateways: ["Ningbo Port (CNNGB)", "Jebel Ali Transship", "Umm Qasr Port"],
    note: "Marketplace replenishment at scale — container consolidation in Yiwu, bonded haulage to every Iraqi city.",
  },
  {
    id: "GCC",
    origin: "GCC",
    label: "Dubai → Basra / Baghdad",
    mode: "Air + Road",
    transit: "24–48h",
    frequency: "6 flights weekly",
    gateways: ["Dubai Intl (DXB)", "Kuwait Road Transit", "Basra Intl (BSR)"],
    note: "Cold-chain pharma, high-value electronics and urgent replenishment with temperature logs end-to-end.",
  },
  {
    id: "EUR",
    origin: "Europe",
    label: "London / Frankfurt → Baghdad",
    mode: "Air Charter + Road",
    transit: "72–96h",
    frequency: "Twice weekly",
    gateways: ["Heathrow (LHR)", "Frankfurt Cargo (FRA)", "Istanbul Transit Hub"],
    note: "Fashion, beauty and regulated goods with full EU-export documentation handled by Galina Clear.",
  },
] as const;

export const ECOSYSTEM = [
  {
    tag: "01 / FREIGHT",
    title: "Air, road & sea freight",
    body: "Next-flight-out air cargo, sealed convoys on the Türkiye and GCC corridors, and FCL/LCL sea via Umm Qasr — one operator, one manifest.",
    image: "/images/air-cargo.jpg",
    alt: "Cargo aircraft being loaded with red containers at dusk",
    span: "large",
  },
  {
    tag: "02 / PAYMENTS",
    title: "GRAND Guarantee escrow",
    body: "Funds release only when goods clear inspection. Cross-border payments, FX and COD reconciliation handled inside one trust layer.",
    badge: "Digital Trust Assurance",
    span: "tall",
  },
  {
    tag: "03 / CUSTOMS",
    title: "Customs & compliance",
    body: "Pre-lodged declarations, HS classification and duty optimisation through Galina Clear — 98.6% first-pass green channel.",
  },
  {
    tag: "04 / LAST MILE",
    title: "Last-mile delivery",
    body: "9 cities, 40+ delivery hubs, live driver tracking, ePOD with photo & signature proof on every parcel.",
    image: "/images/lastmile.jpg",
    alt: "Courier in red uniform handing a package to a customer",
    span: "wide",
  },
  {
    tag: "05 / FULFILMENT",
    title: "Warehousing & fulfilment",
    body: "Bonded warehouses in Baghdad, Erbil and Basra with pick-pack, kitting and marketplace-ready inventory.",
    image: "/images/warehouse.jpg",
    alt: "Modern fulfillment warehouse with conveyors and parcels",
  },
  {
    tag: "06 / MARKETPLACE",
    title: "Marketplace enablement",
    body: "Storefront tooling, product onboarding, pricing intelligence and returns management for global sellers entering Iraq.",
  },
] as const;

export const MILESTONES = [
  {
    year: "2025 · Q1",
    title: "Corridor activation",
    body: "Strategic Türkiye → Iraq corridors activated and executed. First sealed convoys cross at Habur with sub-72h dwell.",
    stat: "2 corridors live",
  },
  {
    year: "2025 · Q2",
    title: "GRAND Guarantee beta",
    body: "Digital trust assurance enters beta — escrow-backed payments for cross-border merchants with dispute resolution in 72h.",
    stat: "$4.2M escrowed",
  },
  {
    year: "2025 · Q3",
    title: "Erbil fulfilment hub",
    body: "12,000 m² bonded fulfilment centre opens in Erbil, bringing 2-day nationwide coverage to the Kurdistan region.",
    stat: "12,000 m² bonded",
  },
  {
    year: "2025 · Q4",
    title: "Basra sea gateway",
    body: "Umm Qasr desk and customs unit launched — direct FCL programmes from Ningbo with 24-day port-to-door transit.",
    stat: "24-day P2D",
  },
  {
    year: "2026 · Now",
    title: "One network, nine cities",
    body: "2,400+ merchants, 12,000+ shipments delivered, 99.2% on-time. The operating system for Iraqi cross-border commerce.",
    stat: "99.2% on-time",
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "We used to lose three weeks at the border. With Galina the same container lands in Baghdad in 24 days from Ningbo, duties pre-cleared, and our customers pay on delivery without friction.",
    name: "Li Wei",
    role: "Export Director, Yiwu Sunshine Trading",
    market: "China → Iraq",
    initials: "LW",
  },
  {
    quote:
      "The GRAND Guarantee changed everything for us. Our Iraqi buyers no longer ask for prepayment — the escrow releases when the goods pass inspection. Our close rate doubled.",
    name: "Elif Demir",
    role: "Head of Exports, Anadolu Electronics",
    market: "Türkiye → Iraq",
    initials: "ED",
  },
  {
    quote:
      "Cold-chain pharma into Basra is unforgiving. Galina's reefer vans and temperature-logged handovers have kept us 100% compliant for fourteen consecutive months.",
    name: "Omar Al-Fahad",
    role: "Distribution Manager, Gulf Pharma",
    market: "GCC → Iraq",
    initials: "OA",
  },
  {
    quote:
      "We ship fashion from London every Friday. Live tracking down to the courier's name is something our wholesale buyers in Erbil have never seen before.",
    name: "Charlotte Hughes",
    role: "Founder, Atelier 9 London",
    market: "UK → Iraq",
    initials: "CH",
  },
] as const;

export const FAQS = [
  {
    q: "How does the GRAND Guarantee escrow work?",
    a: "Your buyer deposits funds into a Galina-managed escrow account at checkout. We dispatch only after the deposit clears, and funds are released to you once the shipment passes delivery inspection — with disputes resolved within 72 hours through our arbitration desk.",
  },
  {
    q: "Which payment methods can Iraqi customers use?",
    a: "Cash on delivery, Qi Card, ZainCash, AsiaHawala, FIB and international cards. COD reconciliation is daily, with settlement to your account in USD or IQD within 48 hours of each delivery run.",
  },
  {
    q: "How long does customs clearance take?",
    a: "For pre-lodged, correctly classified shipments our Galina Clear unit clears 98.6% of air cargo through the green channel in under 4 hours at BGW, BSR and EBL. Sea clearance at Umm Qasr averages 1–2 days.",
  },
  {
    q: "Can I integrate tracking into my own store?",
    a: "Yes. Every shipment exposes webhook events and a REST endpoint — status, location and ePOD payloads — so your storefront and your customer's WhatsApp receive updates the moment they happen.",
  },
  {
    q: "What happens if a shipment is damaged or lost?",
    a: "All shipments carry standard carrier liability. Adding Galina Shield insurance covers full commercial value at 1.5% of declared value, with claims paid from escrow within 7 working days.",
  },
  {
    q: "Do you support returns and reverse logistics?",
    a: "Yes — return pickup from any of the 9 cities we serve, refurbishment grading at our bonded hubs, and either restock, local liquidation or consolidated return freight to your origin warehouse.",
  },
] as const;

export const OFFICES = [
  { city: "Baghdad", country: "Iraq", role: "Global HQ", detail: "Karrada, Al-Rasheed District" },
  { city: "Erbil", country: "Iraq", role: "Fulfilment Hub", detail: "100m Road Industrial Zone" },
  { city: "Istanbul", country: "Türkiye", role: "Origin Gateway", detail: "Beylikdüzü Cargo Park" },
  { city: "Dubai", country: "UAE", role: "GCC Desk", detail: "Jebel Ali Free Zone" },
  { city: "London", country: "United Kingdom", role: "Europe Desk", detail: "Heathrow Proximity" },
] as const;

export const HERO_STATS = [
  { value: 45, suffix: "M", label: "Iraqi consumers reached" },
  { value: 48, suffix: "h", label: "Fastest door-to-door" },
  { value: 9, suffix: "", label: "Iraqi cities served" },
  { value: 99.2, suffix: "%", label: "On-time delivery" },
] as const;

export const PARTNERS = ["Qi Card", "ZainCash", "AsiaHawala", "FIB", "FastPay", "Switch"] as const;

export const TRACKING_HINTS = ["GXL-4821-BGD", "GXL-7355-EBL", "GXL-9034-BSR"] as const;
