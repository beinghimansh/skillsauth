/**
 * Tests for packages/cli/src/lib/verify.ts
 *
 * Uses a real @sigstore/bundle-compatible envelope. Only sigstore.createVerifier
 * is mocked — bundleFromJSON runs against the actual library so we exercise the
 * same parse code path the CLI uses in production.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must be hoisted before imports that load sigstore.
vi.mock('sigstore', () => ({
  createVerifier: vi.fn(),
}));

import * as sigstoreMod from 'sigstore';
import { verifyManifest } from '../lib/verify.js';
import type { ManifestResponse } from '../lib/api.js';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Builds a bundle that bundleFromJSON actually accepts (v0.1, cert chain). */
function makeValidBundleJson(
  bundleHash: string,
  rekorLogIndex: number | null = 99,
  overridePayload?: string
): string {
  const manifestPayload = overridePayload ?? JSON.stringify({
    schemaVersion: '1.0',
    fqn: 'acme/repo/skills/github',
    version: '1.0.0',
    bundleHash,
    scanId: 'scan-001',
    scanStatus: 'clean',
    scanCompletedAt: '2025-01-01T00:00:00.000Z',
    manifestCreatedAt: '2025-01-01T00:00:01.000Z',
    publisher: { tier: 0 },
    contentDigests: { 'SKILL.md': 'b'.repeat(64) },
  });

  const tlogEntry = rekorLogIndex !== null
    ? [{
        logId: { keyId: Buffer.alloc(8).toString('base64') },
        logIndex: String(rekorLogIndex),
        integratedTime: '1700000000',
        kindVersion: { kind: 'dsse', version: '0.0.1' },
        inclusionPromise: { signedEntryTimestamp: Buffer.alloc(64).toString('base64') },
        canonicalizedBody: '',
      }]
    : [];

  return JSON.stringify({
    mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.1',
    verificationMaterial: {
      x509CertificateChain: {
        certificates: [{ rawBytes: Buffer.alloc(64).toString('base64') }],
      },
      tlogEntries: tlogEntry,
    },
    dsseEnvelope: {
      payload: Buffer.from(manifestPayload).toString('base64'),
      payloadType: 'application/vnd.skillsauth.manifest+json;v=1',
      signatures: [{ sig: Buffer.alloc(64).toString('base64'), keyid: '' }],
    },
  });
}

function makeManifestResponse(
  bundleHash: string,
  rekorLogIndex: number | null = 99,
  overrides: Partial<ManifestResponse> = {}
): ManifestResponse {
  return {
    fqn: 'acme/repo/skills/github',
    version: '1.0.0',
    bundle: makeValidBundleJson(bundleHash, rekorLogIndex),
    manifestDigest: 'c'.repeat(64),
    manifestSignedAt: '2025-01-01T00:00:02.000Z',
    rekorLogIndex,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('verifyManifest (CLI)', () => {
  beforeEach(() => {
    const mockVerifier = { verify: vi.fn() }; // default: verification succeeds
    vi.mocked(sigstoreMod.createVerifier).mockResolvedValue(mockVerifier as any);
  });
  afterEach(() => vi.clearAllMocks());

  // ── parse errors ────────────────────────────────────────────────────────────

  it('returns ok:false exit:3 when bundle JSON is not parseable', async () => {
    const response: ManifestResponse = {
      fqn: 'x', version: '1', bundle: 'INVALID_JSON',
      manifestDigest: null, manifestSignedAt: null, rekorLogIndex: null,
    };
    const result = await verifyManifest(response, null);
    expect(result.ok).toBe(false);
    expect((result as any).exit).toBe(3);
    expect((result as any).reason).toBeTruthy();
  });

  it('returns ok:false exit:3 when bundle is valid JSON but invalid bundle format', async () => {
    const response: ManifestResponse = {
      fqn: 'x', version: '1', bundle: '{"totally":"wrong"}',
      manifestDigest: null, manifestSignedAt: null, rekorLogIndex: null,
    };
    const result = await verifyManifest(response, null);
    expect(result.ok).toBe(false);
    expect((result as any).exit).toBe(3);
  });

  // ── successful verification ─────────────────────────────────────────────────

  it('returns ok:true with correct rekorLogIndex', async () => {
    const bh = 'a'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh, 42), bh);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rekorLogIndex).toBe(42);
  });

  it('returns ok:true with rekorLogIndex null when no tlogEntries', async () => {
    const bh = 'a'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh, null), bh);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rekorLogIndex).toBeNull();
  });

  // ── certificate / Rekor errors ──────────────────────────────────────────────

  it('returns ok:false exit:3 with cert message when verifier throws cert error', async () => {
    const mockVerifier = {
      verify: vi.fn().mockImplementation(() => {
        throw new Error('certificate chain validation failed');
      }),
    };
    vi.mocked(sigstoreMod.createVerifier).mockResolvedValue(mockVerifier as any);

    const bh = 'a'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh), bh);
    expect(result.ok).toBe(false);
    expect((result as any).exit).toBe(3);
    expect((result as any).reason).toMatch(/Certificate chain invalid/i);
  });

  it('returns ok:false exit:3 with rekor message when verifier throws tlog error', async () => {
    const mockVerifier = {
      verify: vi.fn().mockImplementation(() => {
        throw new Error('rekor tlog inclusion check failed');
      }),
    };
    vi.mocked(sigstoreMod.createVerifier).mockResolvedValue(mockVerifier as any);

    const bh = 'a'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh), bh);
    expect(result.ok).toBe(false);
    expect((result as any).exit).toBe(3);
    expect((result as any).reason).toMatch(/Transparency log/i);
  });

  it('returns ok:false exit:3 with generic message for unknown verify error', async () => {
    const mockVerifier = {
      verify: vi.fn().mockImplementation(() => {
        throw new Error('bad signature bytes');
      }),
    };
    vi.mocked(sigstoreMod.createVerifier).mockResolvedValue(mockVerifier as any);

    const bh = 'a'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh), bh);
    expect(result.ok).toBe(false);
    expect((result as any).exit).toBe(3);
    expect((result as any).reason).toMatch(/Signature verification failed/i);
  });

  // ── bundle hash cross-check ─────────────────────────────────────────────────

  it('returns ok:false exit:3 with mismatch message when bundleHashes differ', async () => {
    const signedHash = 'a'.repeat(64);
    const apiHash = 'b'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(signedHash, 1), apiHash);
    expect(result.ok).toBe(false);
    expect((result as any).exit).toBe(3);
    expect((result as any).reason).toMatch(/Bundle hash mismatch|tampering/i);
  });

  it('does not block install when apiBundleHash is null', async () => {
    const bh = 'c'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh, 1), null);
    expect(result.ok).toBe(true);
  });

  it('does not block install when signedBundleHash absent from payload', async () => {
    const payloadWithoutHash = JSON.stringify({
      schemaVersion: '1.0',
      fqn: 'x/y/z',
      version: '1',
    });
    const bundleJson = makeValidBundleJson('a'.repeat(64), 1, payloadWithoutHash);
    const response: ManifestResponse = {
      fqn: 'x/y/z', version: '1', bundle: bundleJson,
      manifestDigest: null, manifestSignedAt: null, rekorLogIndex: null,
    };
    const result = await verifyManifest(response, 'b'.repeat(64));
    expect(result.ok).toBe(true);
  });

  // ── rekorLogIndex extraction ────────────────────────────────────────────────

  it('extracts rekorLogIndex from tlogEntries', async () => {
    const bh = 'd'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh, 1337), bh);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rekorLogIndex).toBe(1337);
  });

  it('returns rekorLogIndex null when tlogEntries is empty', async () => {
    const bh = 'e'.repeat(64);
    const result = await verifyManifest(makeManifestResponse(bh, null), null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rekorLogIndex).toBeNull();
  });

  // ── offline mode ─────────────────────────────────────────────────────────────

  it('calls createVerifier with tlogThreshold:0 and ctLogThreshold:0', async () => {
    const bh = 'f'.repeat(64);
    await verifyManifest(makeManifestResponse(bh), bh);
    expect(sigstoreMod.createVerifier).toHaveBeenCalledWith({
      tlogThreshold: 0,
      ctLogThreshold: 0,
    });
  });

  it('calls createVerifier exactly once per invocation', async () => {
    const bh = 'g'.repeat(64);
    await verifyManifest(makeManifestResponse(bh), bh);
    expect(sigstoreMod.createVerifier).toHaveBeenCalledOnce();
  });
});
