/**
 * Phase 0–6 demo data seed.
 *
 * Idempotent by design: every record is matched on its natural key (the unique
 * constraints in schema.prisma) and restored with upsert, so running the script
 * twice produces identical counts — nothing is duplicated.
 *
 *   pnpm --filter @tripchange/backend exec tsx prisma/seed-demo-data.ts
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

async function main() {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { slug: 'demo' } });
  const ws = workspace.id;
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@demo.com' } });
  log(`Target workspace: demo (${ws})`);

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
  const tripStart = '2026-11-10';
  const tripDays = Array.from({ length: 12 }, (_, index) => index + 1);

  const tripPayload = {
    workspaceId: ws,
    bookingId: booking.id,
    customerId: customers['Sarah Mitchell']!.id,
    tripNumber,
    name: 'Everest Base Camp — Mitchell Party',
    startDate: at(tripStart, 0),
    endDate: at(tripStart, 13),
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
    { fullName: 'Sarah Mitchell', email: 'sarah.mitchell@example.com', nationality: 'United Kingdom', isTripLeader: true, customerId: customers['Sarah Mitchell']!.id },
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

  for (const dayNumber of tripDays) {
    const data = {
      workspaceId: ws,
      tripId: trip.id,
      dayNumber,
      title: dayNumber === 1 ? 'Fly to Lukla & trek to Phakding' : dayNumber === 12 ? 'Fly back to Kathmandu' : `Trek day ${dayNumber}`,
      description: `Day ${dayNumber} of the Everest Base Camp itinerary.`,
      location: 'Khumbu',
      altitude: dayNumber === 12 ? 1400 : 2800 + dayNumber * 120,
      walkingHours: dayNumber === 12 ? '0' : '5.5',
      accommodation: 'Teahouse',
      meals: ['BREAKFAST', 'DINNER'],
      activities: ['Trekking'],
      clientVisible: true,
    };
    await prisma.itineraryDay.upsert({
      where: { tripId_dayNumber: { tripId: trip.id, dayNumber } },
      update: data,
      create: data,
    });
  }

  const snapshot = {
    days: tripDays.map((dayNumber) => ({
      dayNumber,
      title: dayNumber === 1 ? 'Fly to Lukla & trek to Phakding' : dayNumber === 12 ? 'Fly back to Kathmandu' : `Trek day ${dayNumber}`,
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
  log(`Trip ensured: ${tripNumber} (4 travelers, 12 days, 3 assignments, 3 supplier bookings)`);

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
