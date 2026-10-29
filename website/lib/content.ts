/**
 * Marketing copy, kept out of components so it can be reviewed as copy.
 *
 * STATUS HONESTY RULE
 * -------------------
 * TrailComand's product is still in development. Every capability described in
 * this file carries an explicit status, and the statuses below were set by
 * reading the product source in this repository — not by trusting the brief:
 *
 *   "Available in development build" — the behaviour exists in the codebase
 *        today, but the platform has not been released to customers.
 *   "In development"                  — partially built or being finished.
 *   "Planned"                         — designed / intended, not built.
 *
 * Nothing here claims live customers, ROI, automated recovery, or that the
 * platform books suppliers or sends messages. Those claims remain false: the
 * codebase has no outbound messaging or supplier-booking integration. It only
 * stores contact numbers and produces drafts for a person to send.
 */

export type CapabilityStatus =
  "Available in development build" | "In development" | "Planned";

export type Capability = {
  id: string;
  title: string;
  status: CapabilityStatus;
  problem: string;
  what: string;
  benefit: string;
};

/* -------------------------------------------------------------------------- */
/* Product facts shared by several pages                                      */
/* -------------------------------------------------------------------------- */

export const productStage = {
  headline: "TrailComand is in development",
  body: "We are building TrailComand now and onboarding a small number of trekking agencies to use it with real trips. It is not a finished public product, and this site does not claim customers, integrations, or results it does not have yet.",
};

export const pilot = {
  headline: "We are onboarding 3 trekking agencies for a free 3-month pilot.",
  supporting: "No credit card required. Just honest feedback.",
  places: 3,
  durationMonths: 3,
  included: [
    "Working access to the trip, disruption and recovery workflows for the length of the pilot.",
    "A short setup conversation so your own trips and itineraries are loaded, not a demo dataset.",
    "A direct line to the team for problems, missing pieces and feature requests.",
    "A written summary of what we heard, so you can decide whether to continue.",
  ],
  expectations: [
    "Try it on at least one real multi-day trip, or on upcoming departures you are planning.",
    "Give us honest feedback — useful, boring and negative all count.",
    "Tell us early when something gets in your way, rather than working around it silently.",
  ],
  conversation: [
    {
      step: "01",
      title: "You describe your operation",
      body: "How many departures you run, who coordinates them, how guides, lodges and transport are confirmed today, and where things tend to break.",
    },
    {
      step: "02",
      title: "We check fit",
      body: "We look at whether your trips and disruption patterns are something we can genuinely support right now. If not, we say so and suggest waiting.",
    },
    {
      step: "03",
      title: "We set up together",
      body: "If it fits, we agree the scope of the pilot, load a real itinerary, and schedule a short walkthrough with the people who will actually use it.",
    },
    {
      step: "04",
      title: "You use it, we listen",
      body: "Over three months you use it on live trips, we support you directly, and at the end we review what worked, what did not, and what comes next.",
    },
  ],
  pricingNote:
    "Commercial pricing will be discussed after the pilot and based on operational needs.",
} as const;

/* -------------------------------------------------------------------------- */
/* Home — problem                                                             */
/* -------------------------------------------------------------------------- */

export const problems = [
  {
    id: "whatsapp",
    title: "Endless WhatsApp threads",
    body: "The lodge cancels in one group chat, the guide replies in another, and the transport update lands in a third. Finding the version that matters takes longer than acting on it.",
  },
  {
    id: "spreadsheets",
    title: "Manual Excel spreadsheets",
    body: "Itineraries, rooming lists and supplier contacts live in separate files that are edited by different people. A change on one sheet rarely reaches the others.",
  },
  {
    id: "costs",
    title: "Untracked disruption costs",
    body: "Replacement lodges, extra transfers and staff overtime get paid, then need to be reconstructed from memory when the trip is over and the invoice is due.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Home — solution                                                            */
/* -------------------------------------------------------------------------- */

export const solutionPillars = [
  {
    id: "impact",
    title: "Auto Impact Analysis",
    status: "In development" as CapabilityStatus,
    body: "Designed to take a recorded disruption and lay out the trip components it touches — the affected itinerary day, the supplier booking, assigned staff — so nobody has to work that out from memory.",
    honesty:
      "Today this impact assessment is recorded against the disruption; automatic detection from live feeds is not built.",
  },
  {
    id: "timeline",
    title: "Live Trip Timeline",
    status: "Available in development build" as CapabilityStatus,
    body: "One operational view of the trip: itinerary days, current status, and the disruptions recorded against them, in the order they happened.",
    honesty:
      "The timeline reflects data saved in TrailComand. It is not a real-time feed from guides' devices.",
  },
  {
    id: "offline",
    title: "Offline Client Portal",
    status: "In development" as CapabilityStatus,
    body: "Planned offline-friendly traveler access: the traveler's trip view keeps a last-saved copy so an itinerary can still be read once signal drops on the trail.",
    honesty:
      "A first version of this caching exists in our development build and is still being hardened. It is not yet offered as a supported offline capability.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Home — how it works                                                        */
/* -------------------------------------------------------------------------- */

export const howItWorks = [
  {
    step: "01",
    title: "Record the change",
    body: "Log the disruption against the trip and the day it affects: what happened, which category, how severe, who reported it.",
    note: null,
  },
  {
    step: "02",
    title: "Understand the impact",
    body: "Review the trip details and dependencies recorded for that trip, then set out what is affected before anyone starts moving people.",
    note: "Automatic impact detection is in development.",
  },
  {
    step: "03",
    title: "Coordinate recovery",
    body: "Prepare a recovery plan with tasks, owners and due dates, get it approved, and keep a record of what was done and why.",
    note: "TrailComand does not act on your behalf — your team still makes the calls and sends the messages.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Home — audiences                                                           */
/* -------------------------------------------------------------------------- */

export const audiences = [
  {
    title: "Trekking and expedition agencies",
    body: "Multi-day departures where a single cancelled lodge or closed pass reshapes the next three days for a whole group.",
  },
  {
    title: "Inbound adventure tour operators",
    body: "Teams assembling itineraries from partner lodges, transport and guides, and answering for the result to travelers abroad.",
  },
  {
    title: "Operators coordinating complex itineraries",
    body: "Anyone who needs one place where guides, accommodation, transport and suppliers are tracked together instead of apart.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Home — FAQ                                                                 */
/* -------------------------------------------------------------------------- */

export const faqs = [
  {
    question: "Who is TrailComand designed for?",
    answer:
      "Trekking agencies and adventure travel operators running multi-day trips, and the operations people who coordinate guides, accommodation, transport and suppliers for them. It is built around disruption handling rather than sales or booking.",
  },
  {
    question: "What problems does it aim to solve?",
    answer:
      "Keeping a reliable record of what changed on a trip, working out which parts of the trip are affected, coordinating the recovery with owners and deadlines, and giving travelers a clear place to see the latest itinerary.",
  },
  {
    question: "Is TrailComand ready for production?",
    answer:
      "No. TrailComand is in development. The core trip, itinerary and disruption workflows exist and are used with real trips during the pilot, but features are still changing and we are not presenting it as a finished, generally available product.",
  },
  {
    question: "What does the pilot include?",
    answer:
      "A free three-month pilot for three trekking agencies: working access to the workflows above, setup with your own trips, direct support from the team, and an honest review at the end. No credit card is required and we ask for feedback in return.",
  },
  {
    question: "Does the platform automatically book suppliers or send messages?",
    answer:
      "No. TrailComand records and organizes; it does not contact suppliers, book replacements or send messages to travelers on its own. Anything you send, you review and send yourself. Automated sending is not built.",
  },
  {
    question: "How can an agency request a pilot?",
    answer:
      "Use the contact form on this site and tell us about your agency, the trips you run, and how you coordinate them today. We reply to every enquiry, including the ones we cannot take on.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Features page                                                              */
/* -------------------------------------------------------------------------- */

export const featureSections: ReadonlyArray<Capability> = [
  {
    id: "disruptions",
    title: "Disruption recording and impact assessment",
    status: "Available in development build",
    problem:
      "The reason a trip changed is usually the first thing forgotten and the first thing asked about afterwards.",
    what: "A disruption is logged against a specific trip and itinerary day, with a category (weather, route closure, supplier cancellation, transport delay, staff unavailability and similar), a severity, a reporter and a status from reported through to resolved. Impact assessments are recorded against it so the affected components are written down next to the event.",
    benefit:
      "Any coordinator can pick the trip up and see what happened, when, and what it touched — without searching a chat history for the original message.",
  },
  {
    id: "timeline",
    title: "Trip timeline and itinerary visibility",
    status: "Available in development build",
    problem:
      "The itinerary is one thing; what actually happened on each day is another, and the two rarely live together.",
    what: "Trips carry day-by-day itineraries that can be updated, and each disruption points at the day it affects. The trip view brings the itinerary and the disruptions recorded against it into a single reading order instead of separate documents.",
    benefit:
      "You can answer 'what does the rest of this departure look like now?' in one place, and travelers get a consistent picture rather than a screenshot of an older plan.",
  },
  {
    id: "recovery",
    title: "Recovery plans and operational follow-up",
    status: "Available in development build",
    problem:
      "Recovery work gets done, but who was supposed to do what — and whether it actually happened — often lives only in someone's head.",
    what: "A disruption can carry a recovery plan with an explicit approval step, then tasks with owners, due dates and a completion record. Task status and evidence notes stay attached to the trip, and the disruption moves through its own status flow to resolution and closure.",
    benefit:
      "The plan and its completion are auditable after the fact, which is what you need when reconciling costs or explaining an outcome to a partner.",
  },
  {
    id: "suppliers",
    title: "Supplier and booking context",
    status: "Available in development build",
    problem:
      "When a lodge cancels, the question is immediately: which booking, whom do I call, and what is already committed elsewhere on the same dates?",
    what: "Supplier records (accommodation, transport, equipment and so on) are linked to trips through supplier bookings, with contact details, status and agreed rates kept alongside the trip. A disruption can be assessed against those bookings instead of a personal address book.",
    benefit:
      "The right contact and the commercial context are in front of you while you re-plan, rather than scattered across someone's phone.",
  },
  {
    id: "communication",
    title: "Traveler updates and drafted messages",
    status: "In development",
    problem:
      "During a disruption the group chat becomes the official record, and travelers hear different versions of the same day.",
    what: "Trips have traveler records and a token-based traveler portal where the current itinerary and updates can be seen and acknowledged. Our development build can also produce an AI-assisted draft of a traveler update from the trip's recorded details, which a person reviews and edits before sending.",
    benefit:
      "One reviewable source for the message you send, and a portal that shows the same updated itinerary to everyone on the trip.",
    // Two separate caveats: the portal is real, the AI drafting is a draft-only aid.
  },
  {
    id: "offline",
    title: "Offline and field access",
    status: "In development",
    problem:
      "Guides on the route have the least signal and the most need for the day's plan.",
    what: "Guide-facing check-ins and field reports can be saved on the device when the connection drops and sent when it returns. The traveler portal keeps a limited last-saved copy of the trip view.",
    benefit:
      "A record survives a dead zone instead of being typed out again that evening.",
  },
  {
    id: "ai",
    title: "AI-assisted drafting",
    status: "In development",
    problem:
      "Writing the same 'the lodge has changed' message for the tenth time is slow and easy to get subtly wrong.",
    what: "A draft of a traveler update, a supplier availability email, or a three-bullet trip summary can be generated from the trip and disruption records that are already saved. Drafts are not saved and nothing is sent.",
    benefit:
      "A starting point written from the real record, which you check and rewrite before it goes anywhere.",
  },
];

export const capabilityStatusNotes: ReadonlyArray<{
  status: CapabilityStatus;
  meaning: string;
}> = [
  {
    status: "Available in development build",
    meaning:
      "The workflow exists in our codebase and is exercised during the pilot. It is still changing, and TrailComand is not a generally available release.",
  },
  {
    status: "In development",
    meaning:
      "Partially built and actively being finished. Expect rough edges; we will tell you what is usable before you rely on it.",
  },
  {
    status: "Planned",
    meaning: "Designed but not built. Not available in today's build.",
  },
];

/* -------------------------------------------------------------------------- */
/* About page                                                                 */
/* -------------------------------------------------------------------------- */

export const aboutPrinciples = [
  {
    title: "Clearer records",
    body: "A disruption is only manageable if someone can see what happened next time. We would rather write the record down well than automate around it.",
  },
  {
    title: "More informed decisions",
    body: "Recovery decisions are made under time pressure by people who are also running a trip. The product should shorten the distance between 'what changed' and 'what do we do'.",
  },
  {
    title: "Better coordination",
    body: "Fewer parallel versions of the same itinerary: one trip record that staff, guides and travelers can be pointed at.",
  },
] as const;

export const aboutHonesty = [
  "TrailComand is in development. There are no press releases, funding announcements or customer logos to show, because none exist yet.",
  "There is no public founder biography on this page. If you want to know who you would be working with, ask on the contact form and we will answer directly.",
  "The pilot is real and small on purpose. Three agencies, three months, and our full attention while the product is still moving.",
] as const;
