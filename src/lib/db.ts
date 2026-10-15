import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";

/**
 * Quorum's web-app store: one JSON file, no ORM, no native dependencies.
 *
 * Data is small (accounts, sessions, a standing committee, settings, pilot
 * requests, workspace invites), so the whole store is held in memory and
 * written back atomically (temp file + rename) after every change. Every
 * operation is synchronous, so a single Node process never interleaves two
 * writes. The file lives in `db/`, which is gitignored.
 *
 * Uniqueness that a relational schema would enforce (email, session token,
 * invite code) is enforced here: the create functions throw on a duplicate.
 */

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string; // scrypt:salt:hash, or "oauth:google" for Google-only accounts
  emailVerified: boolean;
  organization: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRow {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ContactRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  createdAt: Date;
}

export interface CommitteeMemberRow {
  id: string;
  name: string;
  role: string;
  isChair: boolean;
  status: string; // PRESENT | EXCUSED
  seatOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type InviteStatus = "PENDING" | "CLAIMED" | "REVOKED";

export interface InviteRow {
  id: string;
  code: string;
  email: string | null;
  role: string; // OFFICER | COMMITTEE
  createdBy: string;
  inviterName: string;
  claimedBy: string | null;
  claimedByEmail: string | null;
  status: InviteStatus;
  createdAt: Date;
  updatedAt: Date;
  claimedAt: Date | null;
}

interface StoreShape {
  users: UserRow[];
  sessions: SessionRow[];
  contacts: ContactRow[];
  committeeMembers: CommitteeMemberRow[];
  settings: Record<string, string>;
  invites: InviteRow[];
}

const FILE = path.join(process.cwd(), "db", "quorum-store.json");
const DATE_FIELDS = ["createdAt", "updatedAt", "expiresAt", "claimedAt"] as const;

function revive<T>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const copy = { ...(row as Record<string, unknown>) };
    for (const field of DATE_FIELDS) {
      if (typeof copy[field] === "string") copy[field] = new Date(copy[field] as string);
    }
    return copy as T;
  });
}

function load(): StoreShape {
  const empty: StoreShape = {
    users: [],
    sessions: [],
    contacts: [],
    committeeMembers: [],
    settings: {},
    invites: [],
  };
  if (!existsSync(FILE)) return empty;
  const raw = JSON.parse(readFileSync(FILE, "utf8")) as Partial<Record<keyof StoreShape, unknown>>;
  return {
    users: revive<UserRow>(raw.users),
    sessions: revive<SessionRow>(raw.sessions),
    contacts: revive<ContactRow>(raw.contacts),
    committeeMembers: revive<CommitteeMemberRow>(raw.committeeMembers),
    settings: (raw.settings as Record<string, string>) ?? {},
    invites: revive<InviteRow>(raw.invites),
  };
}

/* One store per process. globalThis survives Next.js hot reloads in dev. */
const globalForStore = globalThis as unknown as { __quorumStore?: StoreShape };
const store: StoreShape = globalForStore.__quorumStore ?? load();
globalForStore.__quorumStore = store;

function persist(): void {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, FILE);
}

const now = () => new Date();
const newId = () => randomUUID();

/* ── Users ──────────────────────────────────────────────────────────────── */

export function findUserByEmail(email: string): UserRow | null {
  return store.users.find((u) => u.email === email) ?? null;
}

export function findUserById(id: string): UserRow | null {
  return store.users.find((u) => u.id === id) ?? null;
}

export function listUsers(): UserRow[] {
  return [...store.users].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function createUser(data: {
  name: string;
  email: string;
  password: string;
  organization?: string | null;
  emailVerified?: boolean;
}): UserRow {
  if (findUserByEmail(data.email)) throw new Error(`User already exists: ${data.email}`);
  const at = now();
  const user: UserRow = {
    id: newId(),
    name: data.name,
    email: data.email,
    password: data.password,
    emailVerified: data.emailVerified ?? false,
    organization: data.organization ?? null,
    createdAt: at,
    updatedAt: at,
  };
  store.users.push(user);
  persist();
  return user;
}

export function markUserVerified(id: string): UserRow | null {
  const user = findUserById(id);
  if (!user) return null;
  user.emailVerified = true;
  user.updatedAt = now();
  persist();
  return user;
}

/* ── Sessions ───────────────────────────────────────────────────────────── */

export function createSession(userId: string, expiresAt: Date, token: string): SessionRow {
  if (store.sessions.some((s) => s.token === token)) throw new Error("Session token collision");
  const session: SessionRow = { id: newId(), token, userId, expiresAt, createdAt: now() };
  store.sessions.push(session);
  persist();
  return session;
}

/** Looks up a session by its opaque token and returns it with its user. */
export function findSessionWithUser(token: string): { session: SessionRow; user: UserRow } | null {
  const session = store.sessions.find((s) => s.token === token);
  if (!session) return null;
  const user = findUserById(session.userId);
  return user ? { session, user } : null;
}

export function deleteSessionByToken(token: string): void {
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.token !== token);
  if (store.sessions.length !== before) persist();
}

/* ── Pilot requests (landing page) ──────────────────────────────────────── */

export function createContactMessage(data: {
  name: string;
  email: string;
  company: string | null;
  message: string;
}): ContactRow {
  const row: ContactRow = { id: newId(), ...data, createdAt: now() };
  store.contacts.push(row);
  persist();
  return row;
}

/* ── Committee roster + settings ────────────────────────────────────────── */

export function listCommitteeMembers(): CommitteeMemberRow[] {
  return [...store.committeeMembers].sort(
    (a, b) => a.seatOrder - b.seatOrder || a.createdAt.getTime() - b.createdAt.getTime()
  );
}

export function getSetting(key: string): string | undefined {
  return store.settings[key];
}

export function setSetting(key: string, value: string): void {
  store.settings[key] = value;
  persist();
}

/* ── Workspace invites ──────────────────────────────────────────────────── */

export function listInvites(take = 100): InviteRow[] {
  return [...store.invites]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, take);
}

export function findInviteById(id: string): InviteRow | null {
  return store.invites.find((i) => i.id === id) ?? null;
}

export function findInviteByCode(code: string): InviteRow | null {
  return store.invites.find((i) => i.code === code) ?? null;
}

export function createInvite(data: {
  code: string;
  email: string | null;
  role: string;
  createdBy: string;
  inviterName: string;
}): InviteRow {
  if (findInviteByCode(data.code)) throw new Error("Invite code collision");
  const at = now();
  const row: InviteRow = {
    id: newId(),
    ...data,
    claimedBy: null,
    claimedByEmail: null,
    status: "PENDING",
    createdAt: at,
    updatedAt: at,
    claimedAt: null,
  };
  store.invites.push(row);
  persist();
  return row;
}

export function updateInvite(
  id: string,
  patch: Partial<Pick<InviteRow, "status" | "claimedBy" | "claimedByEmail" | "claimedAt">>
): InviteRow | null {
  const row = findInviteById(id);
  if (!row) return null;
  Object.assign(row, patch, { updatedAt: now() });
  persist();
  return row;
}
