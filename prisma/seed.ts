// Seed Galina Express demo shipments for the live tracking experience.
// Run with: bun prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.shipmentEvent.deleteMany();
  await db.shipment.deleteMany();

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

  // 1) Istanbul → Baghdad, Express Air, in transit mid-route
  await db.shipment.create({
    data: {
      code: "GXL-4821-BGD",
      origin: "Istanbul, Türkiye",
      originCode: "IST",
      destination: "Baghdad, Iraq",
      destinationCode: "BGW",
      service: "EXPRESS_AIR",
      status: "IN_TRANSIT",
      weightKg: 142.5,
      pieces: 6,
      shipper: "Anadolu Electronics A.Ş.",
      consignee: "Al-Rasheed Trading Co.",
      etaLabel: "Tomorrow, 14:00 (GMT+3)",
      events: {
        create: [
          { title: "Booking confirmed", location: "Istanbul, Türkiye", note: "Express Air · 6 pieces · 142.5 kg", timestamp: hoursAgo(52), done: true, sortOrder: 1 },
          { title: "Picked up from shipper", location: "Istanbul, Türkiye", note: "Warehouse IST-2, Beylikdüzü", timestamp: hoursAgo(48), done: true, sortOrder: 2 },
          { title: "Departed origin gateway", location: "Istanbul Airport (IST)", note: "Flight GX-214 · AWB 072-48219935", timestamp: hoursAgo(41), done: true, sortOrder: 3 },
          { title: "Arrived transit hub", location: "Erzurum Gateway", note: "Security screening cleared", timestamp: hoursAgo(18), done: true, sortOrder: 4 },
          { title: "In transit to Baghdad", location: "Air corridor IST → BGW", note: "Estimated wheels-up 22:40", timestamp: hoursAgo(6), done: false, sortOrder: 5 },
          { title: "Customs clearance", location: "Baghdad International (BGW)", note: "Documents pre-lodged via Galina Clear", timestamp: hoursAgo(2), done: false, sortOrder: 6 },
          { title: "Out for delivery", location: "Baghdad, Iraq", note: "Last-mile via Galina Karrada hub", timestamp: hoursAgo(1), done: false, sortOrder: 7 },
          { title: "Delivered", location: "Baghdad, Iraq", note: "Signature required · Al-Rasheed Trading", timestamp: hoursAgo(0), done: false, sortOrder: 8 },
        ],
      },
    },
  });

  // 2) Yiwu → Erbil, Economy Sea + Road, at customs
  await db.shipment.create({
    data: {
      code: "GXL-7355-EBL",
      origin: "Yiwu, China",
      originCode: "YIW",
      destination: "Erbil, Iraq",
      destinationCode: "EBL",
      service: "ECONOMY_SEA",
      status: "CUSTOMS",
      weightKg: 2860,
      pieces: 44,
      shipper: "Yiwu Sunshine Import & Export",
      consignee: "Zagros Home LLC",
      etaLabel: "Friday, end of day (GMT+3)",
      events: {
        create: [
          { title: "Booking confirmed", location: "Yiwu, China", note: "Economy Sea + Road · FCL 40'HQ", timestamp: hoursAgo(240), done: true, sortOrder: 1 },
          { title: "Container stuffed & sealed", location: "Ningbo Port (CNNGB)", note: "Seal GXL-771 2093", timestamp: hoursAgo(216), done: true, sortOrder: 2 },
          { title: "Vessel departed", location: "Ningbo Port (CNNGB)", note: "MV MSC Aurelia · Voy 512W", timestamp: hoursAgo(190), done: true, sortOrder: 3 },
          { title: "Transshipped", location: "Jebel Ali, UAE", note: "Feeder to Umm Qasr", timestamp: hoursAgo(96), done: true, sortOrder: 4 },
          { title: "Arrived Umm Qasr Port", location: "Umm Qasr, Iraq", note: "Berth 22 · discharged", timestamp: hoursAgo(30), done: true, sortOrder: 5 },
          { title: "Customs clearance", location: "Umm Qasr Customs", note: "Duty paid via GRAND Guarantee escrow", timestamp: hoursAgo(9), done: true, sortOrder: 6 },
          { title: "Road leg to Erbil", location: "Baghdad → Erbil corridor", note: "Convoy GX-R-77 · GPS sealed", timestamp: hoursAgo(4), done: false, sortOrder: 7 },
          { title: "Delivery appointment", location: "Erbil, Iraq", note: "Zagros Home DC, 100m Road", timestamp: hoursAgo(2), done: false, sortOrder: 8 },
        ],
      },
    },
  });

  // 3) Dubai → Basra, Express Air, out for delivery
  await db.shipment.create({
    data: {
      code: "GXL-9034-BSR",
      origin: "Dubai, UAE",
      originCode: "DXB",
      destination: "Basra, Iraq",
      destinationCode: "BSR",
      service: "EXPRESS_AIR",
      status: "OUT_FOR_DELIVERY",
      weightKg: 38.2,
      pieces: 3,
      shipper: "Gulf Pharma Distribution",
      consignee: "Basra Central Pharmacy",
      etaLabel: "Today, before 18:00 (GMT+3)",
      events: {
        create: [
          { title: "Booking confirmed", location: "Dubai, UAE", note: "Express Air · cold-chain 2–8°C", timestamp: hoursAgo(26), done: true, sortOrder: 1 },
          { title: "Picked up from shipper", location: "Dubai, UAE", note: "Temperature-controlled pickup", timestamp: hoursAgo(22), done: true, sortOrder: 2 },
          { title: "Departed origin gateway", location: "Dubai Intl (DXB)", note: "Flight GX-908", timestamp: hoursAgo(14), done: true, sortOrder: 3 },
          { title: "Arrived Basra", location: "Basra Intl (BSR)", note: "Cold room storage", timestamp: hoursAgo(7), done: true, sortOrder: 4 },
          { title: "Customs cleared", location: "Basra Intl (BSR)", note: "Priority pharma lane", timestamp: hoursAgo(5), done: true, sortOrder: 5 },
          { title: "Out for delivery", location: "Basra, Iraq", note: "Courier Majid H. · reefer van 12", timestamp: hoursAgo(1), done: true, sortOrder: 6 },
          { title: "Delivered", location: "Basra, Iraq", note: "Signature + temperature log handover", timestamp: hoursAgo(0), done: false, sortOrder: 7 },
        ],
      },
    },
  });

  console.log("Seeded:", await db.shipment.count(), "shipments");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
