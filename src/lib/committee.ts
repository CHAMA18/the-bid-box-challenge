import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/auth-types";

/**
 * Committee state — the humans behind the gavel, as stored data.
 *
 * The standing committee lives in SQLite (CommitteeMember rows); seat
 * capacity and the quorum threshold are SystemSetting rows. The gavel seat
 * is never a stored row: it belongs to whoever is actually signed in, and
 * the API resolves that from the session cookie. If the tables are empty
 * (first boot), the standing committee is seeded once.
 */

export interface CommitteeMemberView {
  name: string;
  role: string;
  isChair: boolean;
  status: "PRESENT" | "EXCUSED";
}

export interface CommitteeState {
  seats: number;
  required: number;
  present: number;
  open: number;
  members: CommitteeMemberView[];
  you: { name: string } | null;
  lastSummonsAt: string | null;
}

const SEED_MEMBERS: Omit<CommitteeMemberView, "status">[] = [
  { name: "C. Mwangi", role: "CHAIR OF THE COMMITTEE", isChair: true },
  { name: "A. Banda", role: "FINANCE OFFICER", isChair: false },
  { name: "J. Otieno", role: "TECHNICAL ADVISOR", isChair: false },
  { name: "M. Chirwa", role: "LEGAL COUNSEL", isChair: false },
];

const DEFAULTS: Record<string, string> = {
  committee_seats: "9",
  quorum_required: "5",
  committee_last_summons_at: "",
};

let seedPromise: Promise<void> | null = null;

async function seedOnce(): Promise<void> {
  const count = await db.committeeMember.count();
  if (count === 0) {
    await db.committeeMember.createMany({
      data: SEED_MEMBERS.map((m, i) => ({ ...m, status: "PRESENT", seatOrder: i })),
    });
  }
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await db.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
}

export async function ensureCommittee(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedOnce().catch((err) => {
      seedPromise = null; /* allow a retry on the next request */
      throw err;
    });
  }
  return seedPromise;
}

async function setting(key: string): Promise<string> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getCommitteeState(user: AuthUser | null): Promise<CommitteeState> {
  await ensureCommittee();

  const [rows, seatsRaw, requiredRaw, summonsRaw] = await Promise.all([
    db.committeeMember.findMany({ orderBy: [{ seatOrder: "asc" }, { createdAt: "asc" }] }),
    setting("committee_seats"),
    setting("quorum_required"),
    setting("committee_last_summons_at"),
  ]);

  const seats = Math.max(1, parseInt(seatsRaw, 10) || 9);
  const required = Math.max(1, parseInt(requiredRaw, 10) || 5);

  const members: CommitteeMemberView[] = rows.map((r) => ({
    name: r.name,
    role: r.role,
    isChair: r.isChair,
    status: r.status === "EXCUSED" ? "EXCUSED" : "PRESENT",
  }));

  /* The signed-in officer always sits — they hold the gavel. */
  const you = user?.name?.trim() ? { name: user.name.trim() } : null;
  const present =
    members.filter((m) => m.status === "PRESENT").length + (you ? 1 : 0);
  const open = Math.max(0, seats - present);

  return {
    seats,
    required,
    present,
    open,
    members,
    you,
    lastSummonsAt: summonsRaw || null,
  };
}

export async function recordSummons(user: AuthUser | null): Promise<CommitteeState> {
  await ensureCommittee();
  await db.systemSetting.upsert({
    where: { key: "committee_last_summons_at" },
    update: { value: new Date().toISOString() },
    create: { key: "committee_last_summons_at", value: new Date().toISOString() },
  });
  return getCommitteeState(user);
}
