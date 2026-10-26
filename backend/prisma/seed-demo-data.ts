/**
 * Phase 0–6 demo data seed.
 *
 * Idempotent by design: every record is matched on its natural key (the unique
 * constraints in schema.prisma) and restored with upsert, so running the script
 * twice produces identical counts — nothing is duplicated.
 *
 *   pnpm --filter @trailcomand/backend exec tsx prisma/seed-demo-data.ts
 *
 * Prerequisite: prisma/seed.ts (permissions, workspace, Owner role/user).
 */
import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const DAY = 86_400_000;
const at = (baseIso: string, days: number) => new Date(Date.parse(`${baseIso}T00:00:00Z`) + days * DAY);

/**
 * The demo Everest Base Camp route, day by day.
 *
 * Every measurement here is a published route fact for this itinerary, not a
 * number invented to fill a field: the trip is 1400 m at Kathmandu, 2860 m at
 * Lukla, 5545 m at Kala Patthar, and the walking legs are the standard EBC
 * itinerary legs. `distanceKm` is the published trail distance rounded to one
 * decimal and `elevationGain` is the climb for the day (not the destination
 * altitude, which stays in `altitude`). Flight and city days carry no walking
 * figures or trekking lodge.
 *
 * Day 12 is the return-flight day: it is a transfer to Kathmandu, so it must not
 * inherit the trail lodge from the days around it.
 */
const EBC_ITINERARY: Array<{
  dayNumber: number;
  title: string;
  description: string;
  startLocation: string;
  endLocation: string;
  altitude: number;
  elevationGain: number | null;
  distanceKm: string | null;
  walkingHours: string | null;
  accommodation: string;
  meals: string[];
  activities: string[];
}> = [
  {
    dayNumber: 1,
    title: 'Fly to Lukla and trek to Phakding',
    description:
      'The 35-minute mountain flight from Kathmandu lands at Tenzing–Hillary Airport (2860 m) in the morning. After meeting the porter crew, walk north through Chaurikhang and Ghat, crossing the Dudh Koshi on suspension bridges, to spend the first night in Phakding.',
    startLocation: 'Kathmandu',
    endLocation: 'Phakding',
    altitude: 2610,
    elevationGain: -250,
    distanceKm: '7.8',
    walkingHours: '3.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Mountain flight', 'Trekking'],
  },
  {
    dayNumber: 2,
    title: 'Trek Phakding to Namche Bazaar',
    description:
      'Follow the Dudh Koshi through Benkar and Monjo to the Sagarmatha National Park checkpost, then climb steadily across the Hillary Suspension Bridge to Namche Bazaar, the Khumbu’s main village. The afternoon is free to rest and drink water.',
    startLocation: 'Phakding',
    endLocation: 'Namche Bazaar',
    altitude: 3440,
    elevationGain: 830,
    distanceKm: '10.9',
    walkingHours: '6.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Trekking'],
  },
  {
    dayNumber: 3,
    title: 'Acclimatisation day in Namche Bazaar',
    description:
      'A rest day to adjust to the altitude. A short morning walk to the Everest View Hotel (3880 m) gives the first clear view of Everest and Ama Dablam, then the afternoon is free in the village. Sleep at the same altitude as last night.',
    startLocation: 'Namche Bazaar',
    endLocation: 'Namche Bazaar',
    altitude: 3440,
    elevationGain: 440,
    distanceKm: '6.2',
    walkingHours: '3.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'DINNER'],
    activities: ['Acclimatisation walk'],
  },
  {
    dayNumber: 4,
    title: 'Trek Namche Bazaar to Tengboche',
    description:
      'Traverse the hillside above the Dudh Koshi to Phunki Tenga, then climb through birch and rhododendron forest to Tengboche, home to the largest monastery in Khumbu. Attend the late-afternoon prayer ceremony if time allows.',
    startLocation: 'Namche Bazaar',
    endLocation: 'Tengboche',
    altitude: 3870,
    elevationGain: 430,
    distanceKm: '9.3',
    walkingHours: '5.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Trekking', 'Monastery visit'],
  },
  {
    dayNumber: 5,
    title: 'Trek Tengboche to Dingboche',
    description:
      'Descend briefly to Deboche, cross the Imja Khola and pass the mani walls below Pangboche before climbing into the open valley above the treeline to Dingboche. The rest of the afternoon is for rest.',
    startLocation: 'Tengboche',
    endLocation: 'Dingboche',
    altitude: 4410,
    elevationGain: 540,
    distanceKm: '11.4',
    walkingHours: '5.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Trekking'],
  },
  {
    dayNumber: 6,
    title: 'Acclimatisation day in Dingboche',
    description:
      'Second acclimatisation day. Hike up the ridge above the village (about 4700 m) for views towards Island Peak and Makalu, then return to the lodge. Climb high, sleep low is the plan for the day.',
    startLocation: 'Dingboche',
    endLocation: 'Dingboche',
    altitude: 4410,
    elevationGain: 290,
    distanceKm: '5.6',
    walkingHours: '3.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'DINNER'],
    activities: ['Acclimatisation walk'],
  },
  {
    dayNumber: 7,
    title: 'Trek Dingboche to Lobuche',
    description:
      'Walk up the wide valley past the yak pastures of Pheriche, climb onto the Thukla ridge and continue to Lobuche. The afternoon is short so that the group can rest before entering the glacial moraine.',
    startLocation: 'Dingboche',
    endLocation: 'Lobuche',
    altitude: 4940,
    elevationGain: 530,
    distanceKm: '8.5',
    walkingHours: '4.5',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Trekking'],
  },
  {
    dayNumber: 8,
    title: 'Trek Lobuche to Gorak Shep and Everest Base Camp',
    description:
      'Follow the moraine of the Khumbu Glacier to Gorak Shep, drop bags at the lodge, then continue across the glacier to Everest Base Camp (5364 m) and return to sleep at Gorak Shep. This is the longest and hardest walking day of the trip.',
    startLocation: 'Lobuche',
    endLocation: 'Gorak Shep',
    altitude: 5140,
    elevationGain: 420,
    distanceKm: '12.4',
    walkingHours: '7.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Trekking', 'Everest Base Camp'],
  },
  {
    dayNumber: 9,
    title: 'Kala Patthar sunrise, then return to Pheriche',
    description:
      'An early start for the climb to Kala Patthar (5545 m), the best viewpoint onto Everest, then back past Gorak Shep and Lobuche to sleep lower in Pheriche.',
    startLocation: 'Gorak Shep',
    endLocation: 'Pheriche',
    altitude: 4370,
    elevationGain: 405,
    distanceKm: '14.6',
    walkingHours: '7.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Sunrise viewpoint', 'Trekking'],
  },
  {
    dayNumber: 10,
    title: 'Trek Pheriche to Namche Bazaar',
    description:
      'A long descent retracing the valley through Pangboche and Tengboche, then the climb back up to Namche Bazaar. The pace is relaxed as the group drops below 4000 m.',
    startLocation: 'Pheriche',
    endLocation: 'Namche Bazaar',
    altitude: 3440,
    elevationGain: null,
    distanceKm: '18.2',
    walkingHours: '7.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Trekking'],
  },
  {
    dayNumber: 11,
    title: 'Trek Namche Bazaar to Lukla',
    description:
      'The final walking day follows the Dudh Koshi back down through Monjo and Phakding to Lukla, with the last suspension bridges of the trip. Celebrate the finish with the crew in the evening.',
    startLocation: 'Namche Bazaar',
    endLocation: 'Lukla',
    altitude: 2860,
    elevationGain: null,
    distanceKm: '18.5',
    walkingHours: '7.0',
    accommodation: 'Lodge',
    meals: ['BREAKFAST', 'LUNCH', 'DINNER'],
    activities: ['Trekking'],
  },
  {
    dayNumber: 12,
    title: 'Fly from Lukla to Kathmandu',
    description:
      'Transfer day: check in at Tenzing–Hillary Airport for the morning flight back to Kathmandu, followed by an airport transfer to the hotel. The rest of the day is free to rest or explore Thamel.',
    startLocation: 'Lukla',
    endLocation: 'Kathmandu',
    altitude: 1400,
    elevationGain: null,
    distanceKm: null,
    walkingHours: null,
    accommodation: 'Hotel',
    meals: ['BREAKFAST'],
    activities: ['Mountain flight', 'Airport transfer'],
  },
  {
    dayNumber: 13,
    title: 'Kathmandu, free day and celebration dinner',
    description:
      'A free day in Kathmandu to recover, shop or visit the heritage sites of the old city. The group meets for a final dinner together in the evening.',
    startLocation: 'Kathmandu',
    endLocation: 'Kathmandu',
    altitude: 1400,
    elevationGain: null,
    distanceKm: null,
    walkingHours: null,
    accommodation: 'Hotel',
    meals: ['BREAKFAST', 'DINNER'],
    activities: ['Free day', 'Group dinner'],
  },
  {
    dayNumber: 14,
    title: 'Airport transfer and departure',
    description:
      'Check out of the hotel and transfer to Tribhuvan International Airport for the international flight home.',
    startLocation: 'Kathmandu',
    endLocation: 'Kathmandu',
    altitude: 1400,
    elevationGain: null,
    distanceKm: null,
    walkingHours: null,
    accommodation: 'Departure',
    meals: ['BREAKFAST'],
    activities: ['Airport transfer'],
  },
];

async function main() {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { slug: 'demo' } });
  const ws = workspace.id;
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@demo.com' } });
  log(`Target workspace: demo (${ws})`);

  // ── Agency contact details (what the traveller portal is allowed to show) ──
  // These are the only keys the portal reads out of workspace.settings. They are
  // merged rather than replaced so unrelated settings survive a re-seed.
  const existingSettings =
    workspace.settings && typeof workspace.settings === 'object' && !Array.isArray(workspace.settings)
      ? (workspace.settings as Record<string, unknown>)
      : {};
  await prisma.workspace.update({
    where: { id: ws },
    data: {
      name: 'TrailComand Demo',
      settings: {
        ...existingSettings,
        timezone: 'Asia/Kathmandu',
        contactEmail: 'ops@demo.example',
        contactPhone: '+977-1-4000000',
        address: 'Thamel, Kathmandu, Nepal',
        // Only a number the agency actually staffs. Left blank, not invented.
        emergencyContactPhone: '',
        emergencyInstructions:
          'For an emergency on the trail, tell your guide first: the guide carries a satellite messenger and can reach the office at any hour. If you cannot reach the guide, call the office line during Nepal business hours. This page is guidance only and does not contact emergency services for you.',
      },
    },
  });

  // ── Staff (Phase 5) ────────────────────────────────────────────────────────
  const staffSpecs: Array<{
    fullName: string; staffType: 'GUIDE' | 'PORTER' | 'COOK' | 'DRIVER' | 'ASSISTANT';
    licenseNumber: string | null; licenseExpiry: string | null;
    languages: string[]; experienceYears: number;
  }> = [
    { fullName: 'Dawa Sherpa', staffType: 'GUIDE', licenseNumber: 'NPL-G-1023', licenseExpiry: '2026-11-15', languages: ['Nepali', 'English', 'Sherpa'], experienceYears: 14 },
    { fullName: 'Pasang Sherpa', staffType: 'GUIDE', licenseNumber: 'NPL-G-1044', licenseExpiry: '2027-04-30', languages: ['Nepali', 'English'], experienceYears: 9 },
    { fullName: 'Lhakpa Tamang', staffType: 'GUIDE', licenseNumber: 'NPL-G-1077', licenseExpiry: '2028-02-28', languages: ['Nepali', 'English', 'Tamang'], experienceYears: 11 },
    { fullName: 'Mingma Sherpa', staffType: 'GUIDE', licenseNumber: 'NPL-G-1092', licenseExpiry: '2027-09-30', languages: ['Nepali', 'English'], experienceYears: 6 },
    { fullName: 'Bikash Gurung', staffType: 'PORTER', licenseNumber: null, licenseExpiry: null, languages: ['Nepali', 'Gurung'], experienceYears: 5 },
    { fullName: 'Suraj Rai', staffType: 'PORTER', licenseNumber: null, licenseExpiry: null, languages: ['Nepali'], experienceYears: 3 },
    { fullName: 'Kami Magar', staffType: 'COOK', licenseNumber: 'NPL-C-0311', licenseExpiry: '2027-06-30', languages: ['Nepali', 'English'], experienceYears: 8 },
    { fullName: 'Ram Thapa', staffType: 'ASSISTANT', licenseNumber: null, licenseExpiry: null, languages: ['Nepali', 'English'], experienceYears: 4 },
  ];
  const staff: Record<string, { id: string }> = {};
  for (const [index, spec] of staffSpecs.entries()) {
    const data = {
      workspaceId: ws,
      staffType: spec.staffType,
      fullName: spec.fullName,
      email: `${spec.fullName.split(' ')[0]!.toLowerCase()}.${spec.fullName.split(' ')[1]!.toLowerCase()}@demo.com`,
      phone: `+977-98${String(10_000_000 + index * 1_111_111).slice(0, 8)}`,
      licenseNumber: spec.licenseNumber,
      licenseExpiry: spec.licenseExpiry ? new Date(`${spec.licenseExpiry}T00:00:00Z`) : null,
      languages: spec.languages,
      certifications: spec.staffType === 'GUIDE' ? ['Wilderness First Aid'] : [],
      experienceYears: spec.experienceYears,
      status: 'AVAILABLE' as const,
      deletedAt: null,
    };
    const existing = await prisma.staffProfile.findFirst({ where: { workspaceId: ws, fullName: spec.fullName } });
    staff[spec.fullName] = existing
      ? await prisma.staffProfile.update({ where: { id: existing.id }, data })
      : await prisma.staffProfile.create({ data });
  }
  log(`Staff ensured: ${Object.keys(staff).length}`);

  // ── Suppliers + rates (Phase 6) ────────────────────────────────────────────
  const supplierSpecs: Array<{
    name: string; code: string; category: 'ACCOMMODATION' | 'TRANSPORT' | 'FOOD' | 'PERMIT' | 'EQUIPMENT' | 'INSURANCE';
    region: string; contactName: string; phone: string; rating: number;
  }> = [
    { name: 'Hotel Yak & Yeti', code: 'SUP-AC-01', category: 'ACCOMMODATION', region: 'Kathmandu', contactName: 'Anita Shrestha', phone: '+977-1-4248999', rating: 5 },
    { name: 'Everest View Lodge', code: 'SUP-AC-02', category: 'ACCOMMODATION', region: 'Khumbu', contactName: 'Pemba Sherpa', phone: '+977-98-5100221', rating: 4 },
    { name: 'Himalayan Glacier Transport', code: 'SUP-TR-01', category: 'TRANSPORT', region: 'Kathmandu', contactName: 'Suman Lama', phone: '+977-98-4420117', rating: 4 },
    { name: 'Annapurna Kitchen Supply', code: 'SUP-FD-01', category: 'FOOD', region: 'Annapurna', contactName: 'Gita Pun', phone: '+977-98-3340552', rating: 5 },
    { name: 'Nepal Trekking Permit Office', code: 'SUP-PM-01', category: 'PERMIT', region: 'Kathmandu', contactName: 'Front Desk', phone: '+977-1-4229157', rating: 3 },
    { name: 'Summit Gear Rentals', code: 'SUP-EQ-01', category: 'EQUIPMENT', region: 'Kathmandu', contactName: 'Raj Bhandari', phone: '+977-98-7710344', rating: 4 },
  ];
  const suppliers: Record<string, { id: string }> = {};
  for (const spec of supplierSpecs) {
    const data = {
      workspaceId: ws,
      name: spec.name,
      code: spec.code,
      category: spec.category,
      region: spec.region,
      contactName: spec.contactName,
      phone: spec.phone,
      status: 'ACTIVE' as const,
      rating: spec.rating,
      deletedAt: null,
    };
    suppliers[spec.name] = await prisma.supplier.upsert({
      where: { workspaceId_name: { workspaceId: ws, name: spec.name } },
      update: data,
      create: data,
    });
  }
  const rateSpecs: Array<{ supplier: string; serviceType: string; description: string; amount: string; unit: string }> = [
    { supplier: 'Hotel Yak & Yeti', serviceType: 'room_night', description: 'Deluxe double room', amount: '18500', unit: 'per_room' },
    { supplier: 'Everest View Lodge', serviceType: 'lodge_night', description: 'Twin room with breakfast', amount: '6500', unit: 'per_room' },
    { supplier: 'Himalayan Glacier Transport', serviceType: 'vehicle_day', description: '4WD with driver (Kathmandu–Lukla)', amount: '42000', unit: 'per_vehicle' },
    { supplier: 'Annapurna Kitchen Supply', serviceType: 'meal', description: 'Full board trail meals', amount: '2800', unit: 'per_person' },
    { supplier: 'Nepal Trekking Permit Office', serviceType: 'permit', description: 'Khumbu Pasang Lhamu / Sagarmatha permit', amount: '3000', unit: 'per_person' },
    { supplier: 'Summit Gear Rentals', serviceType: 'equipment_set', description: 'Sleeping bag, poles, crampons', amount: '4500', unit: 'per_person' },
  ];
  for (const spec of rateSpecs) {
    const supplier = suppliers[spec.supplier]!;
    const existing = await prisma.supplierRate.findFirst({ where: { supplierId: supplier.id, serviceType: spec.serviceType } });
    const data = {
      workspaceId: ws,
      supplierId: supplier.id,
      serviceType: spec.serviceType,
      description: spec.description,
      amount: spec.amount,
      currency: 'NPR',
      unit: spec.unit,
      validFrom: at('2026-01-01', 0),
      validTo: null,
    };
    if (existing) await prisma.supplierRate.update({ where: { id: existing.id }, data });
    else await prisma.supplierRate.create({ data });
  }
  log(`Suppliers ensured: ${Object.keys(suppliers).length}, rates: ${rateSpecs.length}`);

  // ── Destinations (Phase 1) ─────────────────────────────────────────────────
  const destinationSpecs: Array<{ name: string; region: string; altitude: number; description: string }> = [
    { name: 'Everest Region', region: 'Khumbu', altitude: 5545, description: 'Sagarmatha National Park — Sherpa villages, monasteries, and the Khumbu Glacier.' },
    { name: 'Annapurna Region', region: 'Annapurna', altitude: 5416, description: 'The classic circuit around the Annapurna massif via Thorong La.' },
    { name: 'Langtang Valley', region: 'Langtang', altitude: 4984, description: 'Glacier valley north of Kathmandu, close to the Tibetan border.' },
    { name: 'Manaslu Region', region: 'Manaslu', altitude: 5106, description: 'Remote restricted-area circuit around the world’s eighth-highest peak.' },
    { name: 'Kathmandu Valley', region: 'Bagmati', altitude: 1400, description: 'UNESCO heritage sites, temples, and the gateway to every trek.' },
  ];
  const destinations: Record<string, { id: string }> = {};
  for (const spec of destinationSpecs) {
    const data = { workspaceId: ws, name: spec.name, region: spec.region, country: 'Nepal', altitude: spec.altitude, description: spec.description, deletedAt: null };
    destinations[spec.name] = await prisma.destination.upsert({
      where: { workspaceId_name: { workspaceId: ws, name: spec.name } },
      update: data,
      create: data,
    });
  }
  log(`Destinations ensured: ${Object.keys(destinations).length}`);

  // ── Trek templates + days (Phase 1) ────────────────────────────────────────
  // `durationDays` is the published trip length shown to customers; `dayCount` is how
  // many day rows the catalogue carries (itinerary tabs include buffer/departure days).
  const templateSpecs: Array<{
    name: string; code: string; destination: string; region: string;
    difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'STRENUOUS';
    durationDays: number; dayCount: number; maxAltitude: number; basePrice: string;
  }> = [
    { name: 'Everest Base Camp Trek', code: 'EBC-14', destination: 'Everest Region', region: 'Khumbu', difficulty: 'CHALLENGING', durationDays: 14, dayCount: 16, maxAltitude: 5545, basePrice: '215000' },
    { name: 'Annapurna Base Camp Trek', code: 'ABC-11', destination: 'Annapurna Region', region: 'Annapurna', difficulty: 'MODERATE', durationDays: 11, dayCount: 12, maxAltitude: 4130, basePrice: '148000' },
    { name: 'Annapurna Circuit Trek', code: 'AC-12', destination: 'Annapurna Region', region: 'Annapurna', difficulty: 'STRENUOUS', durationDays: 12, dayCount: 14, maxAltitude: 5416, basePrice: '182000' },
    { name: 'Langtang Valley Trek', code: 'LV-8', destination: 'Langtang Valley', region: 'Langtang', difficulty: 'MODERATE', durationDays: 10, dayCount: 11, maxAltitude: 4984, basePrice: '96000' },
    { name: 'Kathmandu Valley Cultural Tour', code: 'KV-4', destination: 'Kathmandu Valley', region: 'Bagmati', difficulty: 'EASY', durationDays: 4, dayCount: 6, maxAltitude: 1400, basePrice: '42000' },
  ];
  // Fallback for templates created by older seed revisions (e.g. the retired Manaslu
  // template) so the catalogue is reset to exactly these five entries.
  await prisma.trekTemplate.deleteMany({ where: { workspaceId: ws, code: { notIn: templateSpecs.map((spec) => spec.code) } } });
  const templates: Array<{ id: string; spec: (typeof templateSpecs)[number] }> = [];
  for (const spec of templateSpecs) {
    const destinationId = destinations[spec.destination]!.id;
    const data = {
      workspaceId: ws,
      destinationId,
      name: spec.name,
      code: spec.code,
      region: spec.region,
      difficulty: spec.difficulty,
      durationDays: spec.durationDays,
      maxAltitude: spec.maxAltitude,
      bestSeasons: ['Spring', 'Autumn'],
      basePrice: spec.basePrice,
      basePriceCurrency: 'NPR',
      requiredDocuments: ['Passport', 'Travel insurance'],
      inclusions: ['Guide', 'Permits', 'Accommodation', 'Meals on trail'],
      exclusions: ['International flights', 'Personal gear', 'Tips'],
      status: 'ACTIVE' as const,
      deletedAt: null,
    };
    const existing = await prisma.trekTemplate.findFirst({ where: { workspaceId: ws, code: spec.code } });
    templates.push({ id: (existing ? await prisma.trekTemplate.update({ where: { id: existing.id }, data }) : await prisma.trekTemplate.create({ data })).id, spec });
  }
  let templateDayCount = 0;
  for (const { id, spec } of templates) {
    // 16 (EBC) + 12 (ABC) + 14 (AC) + 11 (LV) + 6 (KV) = 59 template days.
    for (let dayNumber = 1; dayNumber <= spec.dayCount; dayNumber++) {
      const isCityTour = spec.code === 'KV-4';
      const isTravelDay = dayNumber === 1 || dayNumber === spec.dayCount;
      const data = {
        title: dayNumber === 1 ? 'Arrival & briefing' : dayNumber === spec.dayCount ? 'Return to Kathmandu' : `Trekking day ${dayNumber - 1}`,
        description: `Day ${dayNumber} of the ${spec.name}.`,
        startLocation: spec.region,
        endLocation: spec.region,
        altitude: spec.maxAltitude,
        walkingHours: isTravelDay ? '0' : '5.0',
        accommodation: isCityTour ? 'Hotel' : 'Teahouse',
        meals: ['BREAKFAST', 'DINNER'],
        activities: [isCityTour ? 'Sightseeing' : 'Trekking'],
      };
      await prisma.trekTemplateDay.upsert({
        where: { templateId_dayNumber: { templateId: id, dayNumber } },
        update: data,
        create: { templateId: id, dayNumber, ...data },
      });
      templateDayCount++;
    }
  }
  log(`Templates ensured: ${templates.length}, template days: ${templateDayCount}`);

  // ── Customers (Phase 2) ────────────────────────────────────────────────────
  const customerSpecs: Array<{ fullName: string; email: string; nationality: string; phone: string }> = [
    { fullName: 'Sarah Mitchell', email: 'sarah.mitchell@example.com', nationality: 'United Kingdom', phone: '+44-7700-900123' },
    { fullName: 'James Whitfield', email: 'james.whitfield@example.com', nationality: 'United States', phone: '+1-415-555-0142' },
    { fullName: 'Emma Clarke', email: 'emma.clarke@example.com', nationality: 'Australia', phone: '+61-412-345-678' },
    { fullName: 'Lucas Meyer', email: 'lucas.meyer@example.com', nationality: 'Germany', phone: '+49-151-2345-6789' },
    { fullName: 'Yuki Tanaka', email: 'yuki.tanaka@example.com', nationality: 'Japan', phone: '+81-90-1234-5678' },
    { fullName: 'Alpine Explorers Ltd.', email: 'groups@alpineexplorers.example', nationality: 'New Zealand', phone: '+64-9-555-0199' },
  ];
  const customers: Record<string, { id: string }> = {};
  for (const spec of customerSpecs) {
    const existing = await prisma.customer.findFirst({ where: { workspaceId: ws, email: spec.email } });
    const data = {
      workspaceId: ws,
      customerType: spec.fullName.endsWith('Ltd.') ? ('CORPORATE' as const) : ('INDIVIDUAL' as const),
      fullName: spec.fullName,
      email: spec.email,
      phone: spec.phone,
      nationality: spec.nationality,
      source: 'Website',
      tags: [],
      deletedAt: null,
    };
    customers[spec.fullName] = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data })
      : await prisma.customer.create({ data });
  }
  log(`Customers ensured: ${Object.keys(customers).length}`);

  // ── Inquiries (Phase 2) ────────────────────────────────────────────────────
  const year = new Date().getFullYear();
  const inquirySpecs: Array<{
    number: string; customer: string; trek: string; status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTED';
    priority: 'MEDIUM' | 'HIGH'; groupSize: number; start: string;
  }> = [
    { number: `INQ-${year}-001`, customer: 'Sarah Mitchell', trek: 'Everest Base Camp Trek', status: 'NEW', priority: 'HIGH', groupSize: 4, start: '2026-11-10' },
    { number: `INQ-${year}-002`, customer: 'James Whitfield', trek: 'Annapurna Base Camp Trek', status: 'NEW', priority: 'MEDIUM', groupSize: 1, start: '2026-10-05' },
    { number: `INQ-${year}-003`, customer: 'Alpine Explorers Ltd.', trek: 'Annapurna Circuit Trek', status: 'NEW', priority: 'HIGH', groupSize: 4, start: '2026-10-18' },
  ];
  const inquiries: Record<string, { id: string }> = {};
  for (const spec of inquirySpecs) {
    const data = {
      workspaceId: ws,
      customerId: customers[spec.customer]!.id,
      inquiryNumber: spec.number,
      trekInterest: spec.trek,
      destinationText: spec.trek.split(' ')[0]!,
      preferredStart: new Date(`${spec.start}T00:00:00Z`),
      groupSize: spec.groupSize,
      adults: spec.groupSize,
      status: spec.status,
      priority: spec.priority,
      source: 'Website',
      assignedToId: owner.id,
      deletedAt: null,
    };
    inquiries[spec.number] = await prisma.inquiry.upsert({
      where: { workspaceId_inquiryNumber: { workspaceId: ws, inquiryNumber: spec.number } },
      update: data,
      create: data,
    });
  }
  log(`Inquiries ensured: ${Object.keys(inquiries).length}`);

  // ── Quotations (Phase 3) ───────────────────────────────────────────────────
  const quotationSpecs: Array<{
    number: string; customer: string; inquiry: string; trek: string;
    start: string; end: string; groupSize: number; subtotal: string; status: 'DRAFT' | 'SENT';
  }> = [
    { number: `QUO-${year}-001`, customer: 'Sarah Mitchell', inquiry: `INQ-${year}-001`, trek: 'Everest Base Camp Trek', start: '2026-11-10', end: '2026-11-23', groupSize: 2, subtotal: '430000', status: 'SENT' },
    { number: `QUO-${year}-002`, customer: 'James Whitfield', inquiry: `INQ-${year}-002`, trek: 'Annapurna Base Camp Trek', start: '2026-10-05', end: '2026-10-15', groupSize: 1, subtotal: '148000', status: 'DRAFT' },
  ];
  const quotations: Record<string, { id: string }> = {};
  for (const spec of quotationSpecs) {
    const data = {
      workspaceId: ws,
      inquiryId: inquiries[spec.inquiry]!.id,
      customerId: customers[spec.customer]!.id,
      quotationNumber: spec.number,
      version: 1,
      trekName: spec.trek,
      startDate: new Date(`${spec.start}T00:00:00Z`),
      endDate: new Date(`${spec.end}T00:00:00Z`),
      groupSize: spec.groupSize,
      subtotal: spec.subtotal,
      discount: '0',
      tax: '0',
      total: spec.subtotal,
      currency: 'NPR',
      inclusions: ['Guide', 'Permits', 'Accommodation', 'Meals on trail'],
      exclusions: ['International flights', 'Personal gear', 'Tips'],
      status: spec.status,
      sentAt: spec.status === 'SENT' ? at('2026-09-01', 0) : null,
      validUntil: spec.status === 'SENT' ? at('2026-10-01', 0) : null,
      deletedAt: null,
    };
    quotations[spec.number] = await prisma.quotation.upsert({
      where: { workspaceId_quotationNumber: { workspaceId: ws, quotationNumber: spec.number } },
      update: data,
      create: data,
    });
  }
  const lineItemSpecs: Array<{ quotation: string; category: string; description: string; quantity: string; unit: string; unitPrice: string; total: string }> = [
    ...Array.from({ length: 3 }, (_, index) => ({
      quotation: quotationSpecs[0]!.number,
      category: ['guide', 'accommodation', 'permit'][index]!,
      description: ['Lead guide + assistant', '16 nights accommodation', 'Khumbu permit'][index]!,
      quantity: ['1', '2', '2'][index]!,
      unit: ['package', 'per_person', 'per_person'][index]!,
      unitPrice: ['98000', '3000', '15000'][index]!,
      total: ['98000', '6000', '30000'][index]!,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      quotation: quotationSpecs[1]!.number,
      category: ['guide', 'accommodation', 'meal'][index]!,
      description: ['Lead guide', '10 nights accommodation', 'Full board meals'][index]!,
      quantity: ['1', '1', '1'][index]!,
      unit: ['package', 'per_person', 'per_person'][index]!,
      unitPrice: ['78000', '5000', '2800'][index]!,
      total: ['78000', '5000', '2800'][index]!,
    })),
    { quotation: quotationSpecs[0]!.number, category: 'transport', description: 'Airport transfers (both ways)', quantity: '1', unit: 'package', unitPrice: '12000', total: '12000' },
    { quotation: quotationSpecs[0]!.number, category: 'equipment', description: 'Rental gear set', quantity: '2', unit: 'per_person', unitPrice: '4500', total: '9000' },
    { quotation: quotationSpecs[1]!.number, category: 'transport', description: 'Private vehicle Pokhara–trailhead', quantity: '1', unit: 'per_vehicle', unitPrice: '18000', total: '18000' },
    { quotation: quotationSpecs[1]!.number, category: 'permit', description: 'ACAP permit', quantity: '1', unit: 'per_person', unitPrice: '3000', total: '3000' },
  ];
  for (const spec of lineItemSpecs) {
    const quotationId = quotations[spec.quotation]!.id;
    const existing = await prisma.quotationLineItem.findFirst({ where: { quotationId, category: spec.category, description: spec.description } });
    const data = { quotationId, category: spec.category, description: spec.description, quantity: spec.quantity, unit: spec.unit, unitPrice: spec.unitPrice, total: spec.total, isOptional: false };
    if (existing) await prisma.quotationLineItem.update({ where: { id: existing.id }, data });
    else await prisma.quotationLineItem.create({ data });
  }
  log(`Quotations ensured: ${Object.keys(quotations).length}, line items: ${lineItemSpecs.length}`);

  // ── Booking + payments (Phase 3) ───────────────────────────────────────────
  const bookingNumber = `BKG-${year}-001`;
  const bookingTotal = '468000';
  const bookingData = {
    workspaceId: ws,
    customerId: customers['Sarah Mitchell']!.id,
    quotationId: quotations[quotationSpecs[0]!.number]!.id,
    bookingNumber,
    trekName: 'Everest Base Camp Trek',
    startDate: at('2026-11-10', 0),
    endDate: at('2026-11-23', 0),
    groupSize: 4,
    totalAmount: bookingTotal,
    paidAmount: '234000',
    balanceAmount: '234000',
    currency: 'NPR',
    status: 'CONFIRMED' as const,
    confirmedAt: at('2026-09-05', 0),
    deletedAt: null,
  };
  const booking = await prisma.booking.upsert({
    where: { workspaceId_bookingNumber: { workspaceId: ws, bookingNumber } },
    update: bookingData,
    create: bookingData,
  });
  const paymentKeys: Array<{ paymentType: 'DEPOSIT'; amount: string; method: string; reference: string; receivedAt: Date }> = [
    { paymentType: 'DEPOSIT', amount: '234000', method: 'BANK_TRANSFER', reference: 'TXN-DEMO-001', receivedAt: at('2026-09-05', 0) },
  ];
  for (const spec of paymentKeys) {
    const existing = await prisma.payment.findFirst({ where: { bookingId: booking.id, reference: spec.reference } });
    const data = { workspaceId: ws, bookingId: booking.id, amount: spec.amount, currency: 'NPR', paymentType: spec.paymentType, method: spec.method, reference: spec.reference, receivedAt: spec.receivedAt, recordedById: owner.id };
    if (existing) await prisma.payment.update({ where: { id: existing.id }, data });
    else await prisma.payment.create({ data });
  }
  log(`Booking ensured: ${bookingNumber} (+${paymentKeys.length} payment)`);

  // ── Trip (Phase 4) + travelers, itinerary, versions ────────────────────────
  const tripNumber = `TRP-${year}-001`;
  // The trip's start date *is* day 1, so a fourteen-day itinerary ends on day 14.
  const tripStart = '2026-11-10';
  const tripEnd = at(tripStart, 13);

  const tripPayload = {
    workspaceId: ws,
    bookingId: booking.id,
    customerId: customers['Sarah Mitchell']!.id,
    tripNumber,
    name: 'Everest Base Camp — Mitchell Party',
    startDate: at(tripStart, 0),
    endDate: tripEnd,
    groupSize: 4,
    status: 'READY' as const,
    operationsManagerId: owner.id,
    leadGuideId: staff['Dawa Sherpa']!.id,
    deletedAt: null,
  };
  const trip = await prisma.trip.upsert({
    where: { workspaceId_tripNumber: { workspaceId: ws, tripNumber } },
    update: tripPayload,
    create: tripPayload,
  });

  const travelerSpecs: Array<{ fullName: string; email: string; nationality: string; isTripLeader: boolean; customerId?: string }> = [
    { fullName: 'Sarah Mitchell', email: 's.mitchell@example.com', nationality: 'United Kingdom', isTripLeader: true, customerId: customers['Sarah Mitchell']!.id },
    { fullName: 'Daniel Mitchell', email: 'daniel.mitchell@example.com', nationality: 'United Kingdom', isTripLeader: false },
    { fullName: 'Priya Raman', email: 'priya.raman@example.com', nationality: 'India', isTripLeader: false },
    { fullName: 'Tom Becker', email: 'tom.becker@example.com', nationality: 'Germany', isTripLeader: false },
  ];
  for (const spec of travelerSpecs) {
    const existing = await prisma.tripTraveler.findFirst({ where: { tripId: trip.id, fullName: spec.fullName } });
    const data = {
      workspaceId: ws,
      tripId: trip.id,
      customerId: spec.customerId ?? null,
      fullName: spec.fullName,
      email: spec.email,
      nationality: spec.nationality,
      isTripLeader: spec.isTripLeader,
    };
    if (existing) await prisma.tripTraveler.update({ where: { id: existing.id }, data });
    else await prisma.tripTraveler.create({ data });
  }

  // Older seed revisions re-created travelers instead of matching the natural key
  // (trip + full name), which left exact duplicates on the trip. Remove only rows
  // that duplicate a name defined above, keeping the oldest row - the one that owns
  // portal access and documents. Travelers this seed does not define are left alone.
  const seededNames = new Set(travelerSpecs.map((spec) => spec.fullName));
  const seededTravelers = await prisma.tripTraveler.findMany({
    where: { tripId: trip.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, fullName: true },
  });
  const seenTravelers = new Map<string, string>();
  for (const seededTraveler of seededTravelers) {
    if (!seededNames.has(seededTraveler.fullName)) continue;
    const keeperId = seenTravelers.get(seededTraveler.fullName);
    if (!keeperId) {
      seenTravelers.set(seededTraveler.fullName, seededTraveler.id);
      continue;
    }
    // Hand the duplicate's documents and portal link to the kept row before it goes.
    await prisma.tripDocument.updateMany({
      where: { travelerId: seededTraveler.id },
      data: { travelerId: keeperId },
    });
    const [duplicateAccess, keeperAccess] = await Promise.all([
      prisma.portalAccess.findUnique({ where: { travelerId: seededTraveler.id }, select: { id: true } }),
      prisma.portalAccess.findUnique({ where: { travelerId: keeperId }, select: { id: true } }),
    ]);
    if (duplicateAccess) {
      if (keeperAccess) await prisma.portalAccess.delete({ where: { id: duplicateAccess.id } });
      else await prisma.portalAccess.update({ where: { id: duplicateAccess.id }, data: { travelerId: keeperId } });
    }
    await prisma.tripTraveler.delete({ where: { id: seededTraveler.id } });
    log(`Removed duplicate traveler row: ${seededTraveler.fullName}`);
  }

  // Live timeline demo state: the trip is partway through, so days 1-2 are done,
  // day 3 is running, and day 5 is behind schedule (a transport delay).
  // Everything after that is still pending.
  const dayStatus = (dayNumber: number) => {
    if (dayNumber <= 2) return 'COMPLETED' as const;
    if (dayNumber === 3) return 'IN_PROGRESS' as const;
    if (dayNumber === 5) return 'DELAYED' as const;
    return 'PENDING' as const;
  };

  for (const spec of EBC_ITINERARY) {
    const data = {
      workspaceId: ws,
      tripId: trip.id,
      dayNumber: spec.dayNumber,
      title: spec.title,
      description: spec.description,
      // `location` is the legacy single label; start/end are the authoritative pair.
      location: spec.endLocation,
      startLocation: spec.startLocation,
      endLocation: spec.endLocation,
      altitude: spec.altitude,
      elevationGain: spec.elevationGain,
      distanceKm: spec.distanceKm,
      walkingHours: spec.walkingHours,
      accommodation: spec.accommodation,
      meals: spec.meals,
      activities: spec.activities,
      clientVisible: true,
      status: dayStatus(spec.dayNumber),
    };
    await prisma.itineraryDay.upsert({
      where: { tripId_dayNumber: { tripId: trip.id, dayNumber: spec.dayNumber } },
      update: data,
      create: data,
    });
  }

  // The published snapshot mirrors the live days so the office version history and
  // the traveller timeline cannot disagree about where each day starts and ends.
  const snapshot = {
    days: EBC_ITINERARY.map((spec) => ({
      dayNumber: spec.dayNumber,
      title: spec.title,
      startLocation: spec.startLocation,
      endLocation: spec.endLocation,
    })),
  };
  const versionData = {
    workspaceId: ws,
    tripId: trip.id,
    version: 1,
    status: 'PUBLISHED' as const,
    snapshot: snapshot as Prisma.InputJsonValue,
    publishedAt: at('2026-09-10', 0),
    publishedById: owner.id,
    changeNotes: 'Initial published itinerary',
  };
  const published = await prisma.itineraryVersion.upsert({
    where: { tripId_version: { tripId: trip.id, version: 1 } },
    update: versionData,
    create: versionData,
  });
  await prisma.trip.update({ where: { id: trip.id }, data: { publishedItineraryVersionId: published.id } });

  // ── Published trip updates ─────────────────────────────────────────
  // PROGRESS_UPDATE reports are the agency's client-visible update stream: they carry
  // an agency-authored message, a status and a publication time, which is what the
  // traveller Command Center lists. DELAY is the office investigation feed shown to
  // the traveller as "awaiting agency update", never as a confirmed change.
  const updateSpecs: Array<{
    clientId: string;
    reportType: 'PROGRESS_UPDATE' | 'DELAY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    hoursAgo: number;
  }> = [
    {
      clientId: 'demo-update-kathmandu-briefing',
      reportType: 'PROGRESS_UPDATE',
      severity: 'LOW',
      description:
        'Welcome briefing completed in Kathmandu. Permits and TIMS cards are in hand, duffel weights have been checked, and the Lukla flight is confirmed for tomorrow morning.',
      hoursAgo: 40,
    },
    {
      clientId: 'demo-report-lukla-headwinds',
      reportType: 'DELAY',
      severity: 'MEDIUM',
      description:
        'Strong headwinds at Lukla held the group on the ground this morning. The guide is re-timing today’s walk and the lodge in Phakding has been told to expect a late arrival.',
      hoursAgo: 16,
    },
    {
      clientId: 'demo-update-phakding-arrival',
      reportType: 'PROGRESS_UPDATE',
      severity: 'LOW',
      description:
        'The group reached Phakding safely after a shortened first day on the trail. Everyone is well rested and tomorrow’s walk to Namche Bazaar starts after breakfast.',
      hoursAgo: 3,
    },
  ];
  const seedNow = Date.now();
  for (const spec of updateSpecs) {
    const recordedAt = new Date(seedNow - spec.hoursAgo * 3_600_000);
    // clientId is unique, so a repeated seed updates the same row instead of
    // appending duplicate updates (which would also reset acknowledgements).
    await prisma.fieldReport.upsert({
      where: { clientId: spec.clientId },
      update: { description: spec.description, severity: spec.severity },
      create: {
        workspaceId: ws,
        tripId: trip.id,
        reporterId: owner.id,
        reportType: spec.reportType,
        severity: spec.severity,
        description: spec.description,
        photoUrls: [],
        recordedAt,
        syncedAt: recordedAt,
        clientId: spec.clientId,
      },
    });
  }
  log(`Trip updates ensured: ${updateSpecs.length}`);

  // ── Staff assignments + supplier bookings (Phases 5–6) ─────────────────────
  const assignmentSpecs: Array<{ staff: string; role: string; rate: string }> = [
    { staff: 'Dawa Sherpa', role: 'LEAD_GUIDE', rate: '95000' },
    { staff: 'Pasang Sherpa', role: 'ASSISTANT_GUIDE', rate: '65000' },
    { staff: 'Kami Magar', role: 'COOK', rate: '48000' },
  ];
  for (const spec of assignmentSpecs) {
    const existing = await prisma.staffAssignment.findFirst({ where: { tripId: trip.id, staffId: staff[spec.staff]!.id, role: spec.role } });
    const data = {
      workspaceId: ws,
      tripId: trip.id,
      staffId: staff[spec.staff]!.id,
      role: spec.role,
      startDate: tripPayload.startDate,
      endDate: tripPayload.endDate,
      status: 'CONFIRMED' as const,
      agreedRate: spec.rate,
      currency: 'NPR',
      confirmedAt: at('2026-09-12', 0),
      confirmedById: owner.id,
      deletedAt: null,
    };
    if (existing) await prisma.staffAssignment.update({ where: { id: existing.id }, data });
    else await prisma.staffAssignment.create({ data });
  }

  const supplierBookingSpecs: Array<{ supplier: string; serviceType: 'ACCOMMODATION' | 'TRANSPORT' | 'PERMIT'; description: string; serviceDate: string }> = [
    { supplier: 'Everest View Lodge', serviceType: 'ACCOMMODATION', description: 'Teahouse accommodation — 11 nights', serviceDate: tripStart },
    { supplier: 'Himalayan Glacier Transport', serviceType: 'TRANSPORT', description: 'Kathmandu airport transfers + Lukla flights', serviceDate: tripStart },
    { supplier: 'Nepal Trekking Permit Office', serviceType: 'PERMIT', description: 'Khumbu Pasang Lhamu permits × 4', serviceDate: tripStart },
  ];
  for (const spec of supplierBookingSpecs) {
    const supplierId = suppliers[spec.supplier]!.id;
    const existing = await prisma.supplierBooking.findFirst({ where: { tripId: trip.id, supplierId, description: spec.description } });
    const data = {
      workspaceId: ws,
      tripId: trip.id,
      supplierId,
      serviceType: spec.serviceType,
      description: spec.description,
      serviceDate: new Date(`${spec.serviceDate}T00:00:00Z`),
      endDate: tripPayload.endDate,
      quantity: 1,
      unit: 'booking',
      estimatedCost: '50000',
      confirmedCost: '45000',
      actualCost: null,
      currency: 'NPR',
      status: 'CONFIRMED' as const,
      confirmedAt: at('2026-09-15', 0),
      confirmedById: owner.id,
      deletedAt: null,
    };
    if (existing) await prisma.supplierBooking.update({ where: { id: existing.id }, data });
    else await prisma.supplierBooking.create({ data });
  }
  log(`Trip ensured: ${tripNumber} (${travelerSpecs.length} travelers, ${EBC_ITINERARY.length} days, ${assignmentSpecs.length} assignments, ${supplierBookingSpecs.length} supplier bookings)`);

  const counts = {
    destinations: await prisma.destination.count(),
    templates: await prisma.trekTemplate.count(),
    templateDays: await prisma.trekTemplateDay.count(),
    staff: await prisma.staffProfile.count(),
    suppliers: await prisma.supplier.count(),
    supplierRates: await prisma.supplierRate.count(),
    customers: await prisma.customer.count(),
    inquiries: await prisma.inquiry.count(),
    quotations: await prisma.quotation.count(),
    quotationLineItems: await prisma.quotationLineItem.count(),
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count(),
    trips: await prisma.trip.count(),
    tripTravelers: await prisma.tripTraveler.count(),
    itineraryDays: await prisma.itineraryDay.count(),
    itineraryVersions: await prisma.itineraryVersion.count(),
    staffAssignments: await prisma.staffAssignment.count(),
    supplierBookings: await prisma.supplierBooking.count(),
  };
  log('Counts: ' + JSON.stringify(counts));
  log('✅ Demo data seed complete');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
