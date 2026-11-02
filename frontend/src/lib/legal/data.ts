import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./service";
import type { Policy, PolicyType, SupportContact } from "./types";

// The public legal texts, cached on our server and shared by every visitor
// (the backend caches them 5 minutes too). Publishing a new version in the
// admin panel clears the cache at once (updateTag(LEGAL_TAG)).

export const LEGAL_TAG = "legal";

type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

class LoadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.code);
  }
}

const UNAVAILABLE: ApiFailure = { status: 0, code: "API_UNAVAILABLE", message: "We couldn't connect to 360mart right now. Please try again in a moment.", fieldErrors: {} };

// A failed call throws inside the cache, so it is never cached.
async function attempt<T>(load: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: error instanceof LoadError ? error.failure : UNAVAILABLE };
  }
}

function settle<T>(res: { ok: true; data: T } | { ok: false; error: ApiFailure }): T {
  if (!res.ok) throw new LoadError(res.error);
  return res.data;
}

async function cachedPolicies(): Promise<Policy[]> {
  "use cache";
  cacheTag(LEGAL_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return settle(await api.listPolicies());
}

/** The current version of one policy with its text; null = not published yet. */
async function cachedPolicy(type: PolicyType): Promise<Policy | null> {
  "use cache";
  cacheTag(LEGAL_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  const res = await api.getPolicy(type);
  if (!res.ok && res.error.code === "POLICY_NOT_FOUND") return null;
  return settle(res);
}

async function cachedVersions(type: PolicyType): Promise<Policy[]> {
  "use cache";
  cacheTag(LEGAL_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  const res = await api.listVersions(type);
  if (!res.ok && res.error.code === "POLICY_NOT_FOUND") return [];
  return settle(res);
}

/** An old version never changes once published. Null = no such version. */
async function cachedVersion(type: PolicyType, version: number): Promise<Policy | null> {
  "use cache";
  cacheTag(LEGAL_TAG);
  cacheLife("days");
  const res = await api.getVersion(type, version);
  if (!res.ok && (res.error.code === "POLICY_NOT_FOUND" || res.error.status === 404)) return null;
  return settle(res);
}

async function cachedContact(): Promise<SupportContact> {
  "use cache";
  cacheTag(LEGAL_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return settle(await api.getContact());
}

// Read at request time (from the cache), never baked in at build time, so a
// build without the backend doesn't publish empty legal pages.
export async function getPolicies() {
  await connection();
  return attempt(cachedPolicies);
}
export async function getPolicy(type: PolicyType) {
  await connection();
  return attempt(() => cachedPolicy(type));
}
export async function getPolicyVersions(type: PolicyType) {
  await connection();
  return attempt(() => cachedVersions(type));
}
export async function getPolicyVersion(type: PolicyType, version: number) {
  await connection();
  return attempt(() => cachedVersion(type, version));
}
export async function getContact() {
  await connection();
  return attempt(cachedContact);
}
