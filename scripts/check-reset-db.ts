/**
 * DB-layer unit check for the org passphrase-reset primitives, run against
 * a THROWAWAY store (QUORUM_STORE_PATH) so the live register is untouched.
 */
process.env.QUORUM_STORE_PATH = "/home/z/my-project/quorum/db/reset-lab-store.json";

const {
  createOrganization,
  createOrgSession,
  createOrgPasswordReset,
  findOrgPasswordReset,
  consumeOrgPasswordReset,
  updateOrganizationPassword,
  deleteOrgSessionsByOrg,
  findOrgSessionWithOrg,
  findOrganizationByEmail,
} = await import("../src/lib/db.ts");
const { hashResetCode, normalizeResetCode, generateResetCode } = await import("../src/lib/org-auth.ts");

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"} — ${label}`);
  if (!cond) failures++;
};

// ── fixture org ──────────────────────────────────────────────────────────
const email = `reset-lab-${Date.now()}@probe.example`;
const org = createOrganization({
  name: "Reset Flow Lab Ltd",
  email,
  password: "old-passphrase-1",
  registrationNo: `RL${Date.now()}`,
  country: "Zambia",
});
check("org created", Boolean(org?.id));

const sess = createOrgSession(org.id, new Date(Date.now() + 864e5), `sess_${Date.now()}`);
check("session findable by token", findOrgSessionWithOrg(sess.token)?.org.id === org.id);

// ── issuance ─────────────────────────────────────────────────────────────
const code = generateResetCode();
check("code shape XXXX-XXXX", /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code));

const hash1 = hashResetCode(code);
const row = createOrgPasswordReset(org.id, hash1, new Date(Date.now() + 15 * 60_000));
check("reset row stored", findOrgPasswordReset(hash1)?.orgId === org.id);

// normalization: dash-less / lowercase input hashes identically
check("normalization is case/separator-insensitive", hashResetCode(code.replace("-", "").toLowerCase()) === hash1);
check("normalizeResetCode strips separators + folds case", normalizeResetCode("ab-C1d2") === "ABC1D2");

// ── one outstanding code per org: fresh issuance retires the old ─────────
const code2 = generateResetCode();
const hash2 = hashResetCode(code2);
createOrgPasswordReset(org.id, hash2, new Date(Date.now() + 15 * 60_000));
check("old code retired by fresh issuance", findOrgPasswordReset(hash1) === null);
check("new code findable", findOrgPasswordReset(hash2)?.orgId === org.id);

// ── consumption: single-use ──────────────────────────────────────────────
consumeOrgPasswordReset(hash2);
check("code consumed once", findOrgPasswordReset(hash2)?.usedAt !== null);
consumeOrgPasswordReset(hash2); // second call must be a no-op
check("consume is idempotent", findOrgPasswordReset(hash2)?.usedAt !== null);

// ── password replacement + session revocation ────────────────────────────
const updated = updateOrganizationPassword(org.id, "new-passphrase-9");
check("password updated", updated?.password === "new-passphrase-9");
const revoked = deleteOrgSessionsByOrg(org.id);
check("sessions revoked (1 removed)", revoked === 1);
check("session really gone", findOrgSessionWithOrg(sess) === null);

// ── expiry semantics (as the route evaluates them) ───────────────────────
const expiredHash = hashResetCode("ZZZZ-9999");
createOrgPasswordReset(org.id, expiredHash, new Date(Date.now() - 1000));
const expiredRow = findOrgPasswordReset(expiredHash);
const expiredValid =
  expiredRow && expiredRow.orgId === org.id && expiredRow.usedAt === null && expiredRow.expiresAt.getTime() > Date.now();
check("expired code rejected by route predicate", expiredValid === false);

// ── store round-trip: reset rows survive reload with Date revival ────────
const fresh = await import(`../src/lib/db.ts?reload=${Date.now()}`);
const reloaded = fresh.findOrgPasswordReset(expiredHash);
check("row survives reload", reloaded !== null);
check("expiresAt revived as Date", reloaded?.expiresAt instanceof Date);
check("createdAt revived as Date", reloaded?.createdAt instanceof Date);

console.log(failures === 0 ? "\nALL DB-LAYER CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
