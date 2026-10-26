import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { logAuditEvent } from '../../../lib/audit.js';
import { PortalRepository } from '../portal.repository.js';
import { leakedPortalKeys } from '../portal.projection.js';
import { resolvePortalStatus } from '../portal.repository.js';
import { PORTAL_ACCESS_GRACE_DAYS } from '../portal.repository.js';
import { isPortalTokenFormat, portalExpiryFor } from '../portal.repository.js';
import { PortalService, generatePortalToken, HELP_REQUESTS_PER_HOUR } from '../portal.service.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

const VALID_TOKEN = 'a'.repeat(64);
const WS = 'ws-1';
const TRIP = 'trip-1';
const TRAVELER = 'traveler-1';

const future = () => new Date(Date.now() + 86_400_000);
const past = () => new Date(Date.now() - 86_400_000);

function accessRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'access-1',
    workspaceId: WS,
    tripId: TRIP,
    travelerId: TRAVELER,
    status: 'ACTIVE' as const,
    expiresAt: future(),
    traveler: { id: TRAVELER, fullName: 'Sarah Mitchell' },
    ...overrides,
  };
}

function clientTrip(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TRIP,
    tripNumber: 'TRP-2026-001',
    customerId: 'customer-1',
    name: 'Everest Base Camp — Mitchell Party',
    startDate: new Date('2026-11-10T00:00:00Z'),
    endDate: new Date('2026-11-23T00:00:00Z'),
    groupSize: 4,
    status: 'READY',
    leadGuideId: 'staff-1',
    itineraryDays: [
      {
        id: 'day-1',
        dayNumber: 1,
        title: 'Fly to Lukla and trek to Phakding',
        description: 'Mountain flight, then the first walk of the trek.',
        location: 'Phakding',
        startLocation: 'Kathmandu',
        endLocation: 'Phakding',
        altitude: 2610,
        elevationGain: -250,
        distanceKm: { toString: () => '7.8' },
        startTime: null,
        endTime: null,
        walkingHours: { toString: () => '3.0' },
        accommodation: 'Lodge',
        meals: ['BREAKFAST', 'DINNER'],
        activities: ['Mountain flight', 'Trekking'],
        status: 'COMPLETED' as const,
        // Deliberately present in the row to prove the projection drops it.
        internalNotes: 'Do not publish: supplier rate 6500/room',
      },
    ],
    travelers: [
      {
        id: TRAVELER,
        customerId: 'customer-1',
        fullName: 'Sarah Mitchell',
        isTripLeader: true,
        nationality: 'United Kingdom',
        email: 'sarah@example.com',
        phone: '+44-7700-900123',
        passportNumber: 'GB1234567',
        passportExpiry: new Date('2030-01-01T00:00:00Z'),
        insuranceProvider: 'Global Rescue',
        insurancePolicyNumber: 'GR-1',
        dietaryRequirements: 'Vegetarian',
        emergencyContactName: 'Daniel Mitchell',
        emergencyContactPhone: '+44-7700-900124',
      },
    ],
    workspace: {
      name: 'Demo Agency',
      settings: {
        contactEmail: 'ops@demo.com',
        contactPhone: '+977-1-4000000',
        address: 'Thamel',
        timezone: 'Asia/Kathmandu',
        emergencyInstructions: 'Tell your guide first.',
        publishGuideContact: true,
      },
    },
    ...overrides,
  };
}

function updateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'update-1',
    reportType: 'PROGRESS_UPDATE',
    severity: 'LOW',
    description: 'The group reached Phakding safely.',
    recordedAt: new Date('2026-11-12T09:00:00Z'),
    createdAt: new Date('2026-11-12T09:00:00Z'),
    itineraryDayId: 'day-1',
    ...overrides,
  };
}

function stubHappyPath() {
  vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(accessRow() as never);
  vi.spyOn(PortalRepository, 'findClientTrip').mockResolvedValue(clientTrip() as never);
  vi.spyOn(PortalRepository, 'touchLastLogin').mockResolvedValue(undefined as never);
  vi.spyOn(PortalRepository, 'listDocuments').mockResolvedValue([] as never);
  vi.spyOn(PortalRepository, 'listClientUpdates').mockResolvedValue([] as never);
  vi.spyOn(PortalRepository, 'listAcknowledgements').mockResolvedValue([] as never);
  vi.spyOn(PortalRepository, 'findPublishedGuide').mockResolvedValue(null as never);
}

describe('portal token format', () => {
  it('accepts only 32-byte lowercase hex', () => {
    expect(isPortalTokenFormat(generatePortalToken())).toBe(true);
    expect(isPortalTokenFormat(VALID_TOKEN)).toBe(true);
    expect(isPortalTokenFormat('A'.repeat(64))).toBe(false);
    expect(isPortalTokenFormat('a'.repeat(63))).toBe(false);
    expect(isPortalTokenFormat('a'.repeat(65))).toBe(false);
    expect(isPortalTokenFormat('z'.repeat(64))).toBe(false);
    expect(isPortalTokenFormat('')).toBe(false);
  });

  it('generates a different token each time', () => {
    expect(generatePortalToken()).not.toBe(generatePortalToken());
  });
});

describe('portal expiry', () => {
  it('grants exactly the grace period beyond the trip end date', () => {
    const end = new Date('2026-11-23T00:00:00Z');
    const expiry = portalExpiryFor(end);
    const days = Math.round((expiry.getTime() - end.getTime()) / 86_400_000);
    expect(days).toBe(PORTAL_ACCESS_GRACE_DAYS);
  });

  it('treats an ACTIVE row past its date as expired', () => {
    expect(resolvePortalStatus('ACTIVE', future())).toBe('ACTIVE');
    expect(resolvePortalStatus('ACTIVE', past())).toBe('EXPIRED');
  });

  it('keeps REVOKED revoked even before the expiry date', () => {
    expect(resolvePortalStatus('REVOKED', future())).toBe('REVOKED');
  });
});

describe('PortalService.validatePortalToken', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects a malformed token before querying the database', async () => {
    const findSpy = vi.spyOn(PortalRepository, 'findAccessByToken');
    await expect(PortalService.validatePortalToken('tampered-token')).rejects.toThrow(AppError);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('returns the identity the token belongs to', async () => {
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(accessRow() as never);
    const portal = await PortalService.validatePortalToken(VALID_TOKEN);
    expect(portal).toMatchObject({
      workspaceId: WS,
      tripId: TRIP,
      travelerId: TRAVELER,
      travelerName: 'Sarah Mitchell',
    });
  });

  it('rejects an unknown token with the same 404 as a malformed one', async () => {
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(null as never);
    const error = await PortalService.validatePortalToken(VALID_TOKEN).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(404);
  });

  it.each([
    ['expired', { status: 'ACTIVE', expiresAt: past() }],
    ['revoked', { status: 'REVOKED', expiresAt: future() }],
  ])('rejects a %s link with an indistinguishable 404', async (_label, override) => {
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(accessRow(override) as never);
    const call = async (token: string): Promise<AppError> =>
      (await PortalService.validatePortalToken(token).catch((e: unknown) => e)) as AppError;
    const malformed = await call('bad');
    const unusable = await call(VALID_TOKEN);
    expect(unusable.statusCode).toBe(404);
    expect(unusable.message).toBe(malformed.message);
  });
});

describe('PortalService.getClientTripData — projection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
    stubHappyPath();
  });

  it("returns only the token's own traveler and a five-section payload", async () => {
    const tripSpy = vi
      .spyOn(PortalRepository, 'findClientTrip')
      .mockResolvedValue(clientTrip() as never);

    const data = await PortalService.getClientTripData(VALID_TOKEN);

    expect(tripSpy).toHaveBeenCalledWith(WS, TRIP, TRAVELER);
    expect(data.visitor.fullName).toBe('Sarah Mitchell');
    expect(Object.keys(data).sort()).toEqual(
      ['documents', 'emergency', 'expiresAt', 'home', 'itinerary', 'syncedAt', 'trip', 'updates', 'visitor'].sort(),
    );
    expect(data.itinerary).toHaveLength(1);
    expect(data.itinerary[0].title).toBe('Fly to Lukla and trek to Phakding');
    expect(data.itinerary[0].startLocation).toBe('Kathmandu');
    expect(data.itinerary[0].endLocation).toBe('Phakding');
    expect(data.itinerary[0].distanceKm).toBe('7.8');
    expect(data.itinerary[0].elevationGain).toBe(-250);
    expect(data.itinerary[0].accommodation).toBe('Lodge');
    expect(data.home.agency.agencyName).toBe('Demo Agency');
    expect(data.trip.timezone).toBe('Asia/Kathmandu');
  });

  it('leaks no cost, supplier, staff-rate or internal-note data', async () => {
    const data = await PortalService.getClientTripData(VALID_TOKEN);
    const serialized = JSON.stringify(data).toLowerCase();

    for (const forbidden of [
      'internalnotes',
      'internalnotes',
      'totalamount',
      'paidamount',
      'balanceamount',
      'estimatedcost',
      'actualcost',
      'agreedrate',
      'supplier',
      'recoveryplan',
      'profit',
      'margin',
      'passportnumber',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    // The serialized payload also passes the runtime guard.
    expect(leakedPortalKeys(data)).toEqual([]);
  });

  it('never exposes another traveler on the trip', async () => {
    const data = await PortalService.getClientTripData(VALID_TOKEN);
    expect(data).not.toHaveProperty('travelers');
    expect(data).not.toHaveProperty('companions');
    expect(JSON.stringify(data)).toContain('Sarah Mitchell');
  });

  it('treats a deleted traveler as an invalid link', async () => {
    vi.spyOn(PortalRepository, 'findClientTrip').mockResolvedValue(
      clientTrip({ travelers: [] }) as never,
    );
    await expect(PortalService.getClientTripData(VALID_TOKEN)).rejects.toThrow(AppError);
  });

  it('treats a deleted trip as an invalid link', async () => {
    vi.spyOn(PortalRepository, 'findClientTrip').mockResolvedValue(null as never);
    await expect(PortalService.getClientTripData(VALID_TOKEN)).rejects.toThrow(AppError);
  });

  it('records the login after a successful read', async () => {
    const touch = vi.spyOn(PortalRepository, 'touchLastLogin').mockResolvedValue(undefined as never);
    await PortalService.getClientTripData(VALID_TOKEN);
    expect(touch).toHaveBeenCalledWith('access-1');
  });

  it('returns empty sections rather than failing when there are no updates or documents', async () => {
    const data = await PortalService.getClientTripData(VALID_TOKEN);
    expect(data.updates).toEqual([]);
    expect(data.home.unacknowledged).toEqual([]);
    expect(data.home.headlineUpdate).toBeNull();
    expect(data.documents).toEqual([]);
  });

  it('maps an agency announcement to CONFIRMED and a delay to PENDING', async () => {
    vi.spyOn(PortalRepository, 'listClientUpdates').mockResolvedValue([
      updateRow({ id: 'u-1', reportType: 'PROGRESS_UPDATE' }),
      updateRow({ id: 'u-2', reportType: 'DELAY', severity: 'MEDIUM', recordedAt: new Date('2026-11-12T10:00:00Z') }),
    ] as never);

    const data = await PortalService.getClientTripData(VALID_TOKEN);
    const byId = new Map(data.updates.map((update) => [update.id, update]));

    expect(byId.get('u-1')?.state).toBe('CONFIRMED');
    expect(byId.get('u-1')?.requiresAcknowledgement).toBe(true);
    expect(byId.get('u-2')?.state).toBe('PENDING');
    expect(byId.get('u-2')?.requiresAcknowledgement).toBe(false);
    // Chronological, newest first.
    expect(data.updates[0].id).toBe('u-2');
  });

  it('shows Awaiting agency update while a high-severity disruption is open', async () => {
    vi.spyOn(PortalRepository, 'listClientUpdates').mockResolvedValue([
      updateRow({ id: 'u-2', reportType: 'DELAY', severity: 'HIGH' }),
    ] as never);
    const data = await PortalService.getClientTripData(VALID_TOKEN);
    expect(data.home.status).toBe('PENDING');
    expect(data.home.statusLabel).toBe('Awaiting agency update');
  });

  it('does not escalate the trip status for a single delayed day', async () => {
    vi.spyOn(PortalRepository, 'findClientTrip').mockResolvedValue(
      clientTrip({
        itineraryDays: [
          { ...clientTrip().itineraryDays[0], status: 'DELAYED' },
        ],
      }) as never,
    );
    const data = await PortalService.getClientTripData(VALID_TOKEN);
    expect(data.home.status).toBe('CONFIRMED');
    expect(data.home.statusLabel).toBe('Day 1 is running late');
  });

  it('reports the real trip status when nothing is wrong', async () => {
    const data = await PortalService.getClientTripData(VALID_TOKEN);
    expect(data.home.statusLabel).toBe('Confirmed and ready');
  });

  it('marks a published announcement as acknowledged for this traveller', async () => {
    vi.spyOn(PortalRepository, 'listClientUpdates').mockResolvedValue([updateRow()] as never);
    vi.spyOn(PortalRepository, 'listAcknowledgements').mockResolvedValue([
      { updateId: 'update-1', acknowledgedAt: new Date('2026-11-12T11:00:00Z') },
    ] as never);

    const data = await PortalService.getClientTripData(VALID_TOKEN);
    expect(data.updates[0].acknowledgedAt).toBe('2026-11-12T11:00:00.000Z');
    expect(data.home.unacknowledged).toEqual([]);
    expect(data.itinerary[0].changeNotice?.updateId).toBe('update-1');
  });

  it('only publishes a guide phone when the agency opted in', async () => {
    const guide = { fullName: 'Dawa Sherpa', phone: '+977-98-0001', staffType: 'GUIDE' };
    const guideSpy = vi
      .spyOn(PortalRepository, 'findPublishedGuide')
      .mockResolvedValue(guide as never);

    await PortalService.getClientTripData(VALID_TOKEN);
    expect(guideSpy).toHaveBeenLastCalledWith(WS, 'staff-1', true);

    vi.spyOn(PortalRepository, 'findClientTrip').mockResolvedValue(
      clientTrip({
        workspace: { name: 'Demo Agency', settings: { contactPhone: '+977-1-4000000' } },
      }) as never,
    );
    await PortalService.getClientTripData(VALID_TOKEN);
    expect(guideSpy).toHaveBeenLastCalledWith(WS, 'staff-1', false);
  });

  it('refuses to respond at all if an internal field reaches the payload', async () => {
    vi.spyOn(PortalRepository, 'findClientTrip').mockResolvedValue(
      clientTrip({
        workspace: {
          name: 'Demo Agency',
          settings: { contactEmail: 'ops@demo.com', totalAmount: '999' },
        },
      }) as never,
    );
    // settings themselves are never echoed: only contact keys are read.
    const data = await PortalService.getClientTripData(VALID_TOKEN);
    expect(JSON.stringify(data)).not.toContain('999');
  });
});

describe('PortalService.acknowledgeUpdate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(accessRow() as never);
  });

  it('persists the acknowledgement against the token owner', async () => {
    vi.spyOn(PortalRepository, 'findClientUpdate').mockResolvedValue(updateRow() as never);
    const ack = vi.spyOn(PortalRepository, 'acknowledgeUpdate').mockResolvedValue({
      updateId: 'update-1',
      acknowledgedAt: new Date('2026-11-12T12:00:00Z'),
    } as never);

    const result = await PortalService.acknowledgeUpdate(VALID_TOKEN, 'update-1');

    expect(ack).toHaveBeenCalledWith({
      workspaceId: WS,
      tripId: TRIP,
      travelerId: TRAVELER,
      updateId: 'update-1',
    });
    expect(result.acknowledgedAt).toBe('2026-11-12T12:00:00.000Z');
  });

  it("rejects an update that does not belong to the token's trip", async () => {
    const find = vi.spyOn(PortalRepository, 'findClientUpdate').mockResolvedValue(null as never);
    const ack = vi.spyOn(PortalRepository, 'acknowledgeUpdate');

    const error = (await PortalService.acknowledgeUpdate(VALID_TOKEN, 'someone-elses-update').catch(
      (e: unknown) => e,
    )) as AppError;

    expect(error.statusCode).toBe(404);
    expect(find).toHaveBeenCalledWith(WS, TRIP, 'someone-elses-update');
    expect(ack).not.toHaveBeenCalled();
  });

  it('is idempotent: a second call keeps the original timestamp', async () => {
    vi.spyOn(PortalRepository, 'findClientUpdate').mockResolvedValue(updateRow() as never);
    const first = new Date('2026-11-12T12:00:00Z');
    vi.spyOn(PortalRepository, 'acknowledgeUpdate').mockImplementation(
      async (input) => ({ updateId: input.updateId, acknowledgedAt: first }) as never,
    );

    const a = await PortalService.acknowledgeUpdate(VALID_TOKEN, 'update-1');
    const b = await PortalService.acknowledgeUpdate(VALID_TOKEN, 'update-1');
    expect(a).toEqual(b);
  });

  it('refuses to acknowledge through an expired link', async () => {
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(
      accessRow({ expiresAt: past() }) as never,
    );
    const ack = vi.spyOn(PortalRepository, 'acknowledgeUpdate');
    await expect(PortalService.acknowledgeUpdate(VALID_TOKEN, 'update-1')).rejects.toThrow(AppError);
    expect(ack).not.toHaveBeenCalled();
  });

  it('audits the acknowledgement', async () => {
    vi.spyOn(PortalRepository, 'findClientUpdate').mockResolvedValue(updateRow() as never);
    vi.spyOn(PortalRepository, 'acknowledgeUpdate').mockResolvedValue({
      updateId: 'update-1',
      acknowledgedAt: new Date(),
    } as never);

    await PortalService.acknowledgeUpdate(VALID_TOKEN, 'update-1');
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'portal.update.acknowledged', entityId: 'update-1' }),
    );
  });
});

describe('PortalService.submitHelpRequest', () => {
  const input = {
    message: '  Our transfer from Lukla has not arrived and we are waiting at the lodge.  ',
    clientId: '11111-1111-4111-8111-111',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    stubHappyPath();
    vi.spyOn(PortalRepository, 'countHelpRequestsSince').mockResolvedValue(0);
    vi.spyOn(PortalRepository, 'findHelpRequestByClientId').mockResolvedValue(null as never);
    vi.spyOn(PortalRepository, 'findTravelerCustomer').mockResolvedValue({
      customerId: 'customer-1',
      fullName: 'Sarah Mitchell',
    } as never);
  });

  it('files the request against the token trip, traveller and workspace', async () => {
    const create = vi.spyOn(PortalRepository, 'createHelpInquiry').mockResolvedValue({
      id: 'inquiry-1',
      inquiryNumber: 'INQ-2026-010',
      createdAt: new Date('2026-11-12T13:00:00Z'),
    } as never);
    const activity = vi.spyOn(PortalRepository, 'addInquiryActivity').mockResolvedValue({ id: 'act-1' } as never);

    const result = await PortalService.submitHelpRequest(VALID_TOKEN, input);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS,
        customerId: 'customer-1',
        message: 'Our transfer from Lukla has not arrived and we are waiting at the lodge.',
      }),
    );
    expect(create.mock.calls[0][0].metadata).toMatchObject({
      portalHelp: expect.objectContaining({
        clientId: input.clientId,
        travelerId: TRAVELER,
        tripId: TRIP,
        travelerName: 'Sarah Mitchell',
      }),
    });
    expect(activity).toHaveBeenCalledWith(expect.objectContaining({ inquiryId: 'inquiry-1' }));
    expect(result).toMatchObject({ reportId: 'inquiry-1', status: 'RECEIVED' });
  });

  it('never trusts a client-supplied traveller id', async () => {
    const create = vi.spyOn(PortalRepository, 'createHelpInquiry').mockResolvedValue({
      id: 'inquiry-1',
      inquiryNumber: 'INQ-2026-010',
      createdAt: new Date(),
    } as never);
    vi.spyOn(PortalRepository, 'addInquiryActivity').mockResolvedValue({ id: 'act-1' } as never);

    await PortalService.submitHelpRequest(VALID_TOKEN, {
      ...input,
      travelerId: 'someone-else',
    } as never);

    expect(create.mock.calls[0][0].metadata).toMatchObject({
      portalHelp: expect.objectContaining({ travelerId: TRAVELER }),
    });
  });

  it('deduplicates a retried submission by clientId', async () => {
    vi.spyOn(PortalRepository, 'findHelpRequestByClientId').mockResolvedValue({
      id: 'inquiry-existing',
      createdAt: new Date('2026-11-12T13:00:00Z'),
    } as never);
    const create = vi.spyOn(PortalRepository, 'createHelpInquiry');

    const result = await PortalService.submitHelpRequest(VALID_TOKEN, input);

    expect(create).not.toHaveBeenCalled();
    expect(result.reportId).toBe('inquiry-existing');
  });

  it('throttles a traveller who raises too many requests in an hour', async () => {
    vi.spyOn(PortalRepository, 'countHelpRequestsSince').mockResolvedValue(HELP_REQUESTS_PER_HOUR);
    const create = vi.spyOn(PortalRepository, 'createHelpInquiry');

    const error = (await PortalService.submitHelpRequest(VALID_TOKEN, input).catch(
      (e: unknown) => e,
    )) as AppError;

    expect(error.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('does not report success when the write fails', async () => {
    vi.spyOn(PortalRepository, 'createHelpInquiry').mockRejectedValue(new Error('db down'));
    await expect(PortalService.submitHelpRequest(VALID_TOKEN, input)).rejects.toThrow();
  });

  it('refuses a help request through an expired link', async () => {
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(
      accessRow({ expiresAt: past() }) as never,
    );
    const create = vi.spyOn(PortalRepository, 'createHelpInquiry');
    await expect(PortalService.submitHelpRequest(VALID_TOKEN, input)).rejects.toThrow(AppError);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('PortalService.getTravelerDocument', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(accessRow() as never);
  });

  it("scopes the lookup to the token's own traveller and trip", async () => {
    const find = vi.spyOn(PortalRepository, 'findTravelerDocument').mockResolvedValue({
      id: 'doc-1',
      documentType: 'PASSPORT',
      fileName: 'passport.pdf',
      fileUrl: 'https://files.example.com/passport.pdf',
      uploadedByTraveler: true,
      createdAt: new Date(),
      workspaceId: WS,
      tripId: TRIP,
      travelerId: TRAVELER,
    } as never);

    const doc = await PortalService.getTravelerDocument(VALID_TOKEN, 'doc-1');
    expect(find).toHaveBeenCalledWith({
      documentId: 'doc-1',
      workspaceId: WS,
      tripId: TRIP,
      travelerId: TRAVELER,
    });
    expect(doc.id).toBe('doc-1');
  });

  it("404s for another traveller's document", async () => {
    vi.spyOn(PortalRepository, 'findTravelerDocument').mockResolvedValue(null as never);
    await expect(
      PortalService.getTravelerDocument(VALID_TOKEN, 'not-mine'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('PortalService.generatePortalAccess', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects a traveler that is not on the trip', async () => {
    vi.spyOn(PortalRepository, 'findTraveler').mockResolvedValue(null as never);
    const upsert = vi.spyOn(PortalRepository, 'upsertAccess');
    await expect(
      PortalService.generatePortalAccess(WS, TRIP, TRAVELER, { userId: 'user-1' }),
    ).rejects.toThrow(AppError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('issues a token that expires after the trip end date plus grace', async () => {
    vi.spyOn(PortalRepository, 'findTraveler').mockResolvedValue({
      id: TRAVELER,
      fullName: 'Sarah Mitchell',
    } as never);
    vi.spyOn(PortalRepository, 'findTrip').mockResolvedValue({
      id: TRIP,
      endDate: new Date('2026-11-23T00:00:00Z'),
      status: 'READY',
    } as never);
    const upsert = vi.spyOn(PortalRepository, 'upsertAccess').mockResolvedValue({
      id: 'access-1',
      status: 'ACTIVE',
      expiresAt: portalExpiryFor(new Date('2026-11-23T00:00:00Z')),
      token: VALID_TOKEN,
    } as never);

    const link = await PortalService.generatePortalAccess(WS, TRIP, TRAVELER, { userId: 'user-1' });

    expect(upsert).toHaveBeenCalledOnce();
    expect(link.token).toHaveLength(64);
    expect(link.url).toBe(`/portal/view/${VALID_TOKEN}`);
    expect(link.status).toBe('ACTIVE');
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'portal.access.issued', userId: 'user-1' }),
    );
  });
});

describe('PortalService.uploadTravelerDocument', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(accessRow() as never);
  });

  it("stamps the upload with the token's traveler, ignoring any client-supplied id", async () => {
    const create = vi.spyOn(PortalRepository, 'createDocument').mockResolvedValue({
      id: 'doc-1',
      documentType: 'PASSPORT',
      fileName: 'passport.pdf',
      fileUrl: 'https://files.example.com/passport.pdf',
      uploadedByTraveler: true,
      createdAt: new Date('2026-10-25T00:00:00Z'),
    } as never);

    const doc = await PortalService.uploadTravelerDocument(VALID_TOKEN, {
      documentType: 'PASSPORT',
      fileName: 'passport.pdf',
      fileUrl: 'https://files.example.com/passport.pdf',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS,
        tripId: TRIP,
        travelerId: TRAVELER,
        uploadedById: null,
        uploadedByTraveler: true,
      }),
    );
    expect(doc.documentType).toBe('PASSPORT');
  });

  it('refuses an upload through an expired link', async () => {
    vi.spyOn(PortalRepository, 'findAccessByToken').mockResolvedValue(
      accessRow({ expiresAt: past() }) as never,
    );
    const create = vi.spyOn(PortalRepository, 'createDocument');
    await expect(
      PortalService.uploadTravelerDocument(VALID_TOKEN, {
        documentType: 'INSURANCE',
        fileName: 'policy.pdf',
        fileUrl: 'https://files.example.com/policy.pdf',
      }),
    ).rejects.toThrow(AppError);
    expect(create).not.toHaveBeenCalled();
  });
});
