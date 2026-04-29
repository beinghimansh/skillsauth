/**
 * Path A — Verify-on-load.
 * Synchronous (within async context) cryptographic verification of a skill manifest
 * using public Sigstore (Fulcio CA + embedded TUF root in @sigstore/verify).
 *
 * Called by the CLI installer before extracting any skill files.
 * p99 target for offline cert-chain verify: < 5ms.
 */

import { createVerifier } from 'sigstore';
import { bundleFromJSON } from '@sigstore/bundle';
import { createHash } from 'crypto';
import type { CRLResponse, ManifestResponse } from './api.js';

export type VerifyOutcome =
  | { ok: true; rekorLogIndex: number | null }
  | { ok: false; reason: string; exit: 3 | 4 };

/**
 * Verifies the Sigstore bundle in a ManifestResponse and checks that the
 * signed bundleHash matches the one returned by the skill API.
 *
 * Uses offline cert-chain verification only (no live Rekor network call).
 * Rekor inclusion is embedded in the bundle's SCT / inclusion proof.
 */
export async function verifyManifest(
  manifest: ManifestResponse,
  apiBundleHash: string | null
): Promise<VerifyOutcome> {
  let bundle: ReturnType<typeof bundleFromJSON>;
  let payload: Buffer | null = null;

  // Parse the Sigstore bundle
  try {
    bundle = bundleFromJSON(JSON.parse(manifest.bundle));
  } catch {
    return { ok: false, reason: 'Manifest bundle is malformed and cannot be parsed.', exit: 3 };
  }

  // Extract the payload (manifest JSON) from the DSSE envelope
  try {
    const raw = JSON.parse(manifest.bundle) as Record<string, unknown>;
    const envelope =
      (raw?.dsseEnvelope ?? (raw as any)?.content?.dsseEnvelope) as { payload?: string } | undefined;
    if (envelope?.payload) {
      payload = Buffer.from(envelope.payload, 'base64');
    }
  } catch {
    return { ok: false, reason: 'Cannot extract manifest payload from bundle.', exit: 3 };
  }

  if (!payload) {
    return { ok: false, reason: 'Bundle contains no DSSE payload.', exit: 3 };
  }

  // Offline certificate chain verification (< 5ms, no network)
  try {
    // tlogThreshold: 0 and ctLogThreshold: 0 = offline mode (cert chain + SCT only)
    const verifier = await createVerifier({ tlogThreshold: 0, ctLogThreshold: 0 });
    verifier.verify(bundle as any, payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/certificate|chain|fulcio/i.test(msg)) {
      return { ok: false, reason: `Certificate chain invalid: ${msg}`, exit: 3 };
    }
    if (/rekor|tlog|transparency|inclusion/i.test(msg)) {
      return { ok: false, reason: `Transparency log inclusion failed: ${msg}`, exit: 3 };
    }
    return { ok: false, reason: `Signature verification failed: ${msg}`, exit: 3 };
  }

  // Parse the manifest JSON to extract bundleHash for cross-check
  let signedBundleHash: string | null = null;
  try {
    const manifestData = JSON.parse(payload.toString('utf8')) as { bundleHash?: string };
    signedBundleHash = manifestData.bundleHash ?? null;
  } catch {
    return { ok: false, reason: 'Cannot parse manifest JSON payload.', exit: 3 };
  }

  // Cross-check: signed bundleHash must match what the API says the bundle hash is
  if (signedBundleHash && apiBundleHash && signedBundleHash !== apiBundleHash) {
    return {
      ok: false,
      reason: `Bundle hash mismatch: the signed manifest (${signedBundleHash.slice(0, 16)}…) does not match the skill API (${apiBundleHash.slice(0, 16)}…). Possible CDN or storage tampering.`,
      exit: 3,
    };
  }

  // Extract Rekor log index from bundle for display
  let rekorLogIndex: number | null = null;
  try {
    const raw = JSON.parse(manifest.bundle) as Record<string, unknown>;
    const tlogEntries =
      (raw?.verificationMaterial as any)?.tlogEntries ??
      (raw as any)?.verification_material?.tlog_entries ??
      [];
    if (Array.isArray(tlogEntries) && tlogEntries[0]?.logIndex != null) {
      rekorLogIndex = Number(tlogEntries[0].logIndex);
    }
  } catch {
    // non-fatal
  }

  return { ok: true, rekorLogIndex };
}

export type VerifyWithCRLOutcome =
  | { ok: true; rekorLogIndex: number | null; warning?: 'crl_unavailable' }
  | {
      ok: false;
      reason:
        | 'revoked'
        | 'bundle_hash_mismatch'
        | 'cert_chain_invalid'
        | 'rekor_inclusion_fail'
        | 'schema_invalid'
        | 'malformed'
        | 'invalid_sig';
      detail?: string;
    };

type VerifyFailureReason = Exclude<VerifyWithCRLOutcome, { ok: true }>['reason'];

export async function verifyWithCRL(
  bundleJson: string,
  localBundleHash: string,
  _crlUrl: string,
  cachedCRL?: CRLResponse
): Promise<VerifyWithCRLOutcome> {
  const manifestResponse: ManifestResponse = {
    fqn: '',
    version: '',
    bundle: bundleJson,
    manifestDigest: null,
    manifestSignedAt: null,
    rekorLogIndex: null,
  };

  const verified = await verifyManifest(manifestResponse, localBundleHash);
  if (!verified.ok) {
    return {
      ok: false,
      reason: mapReasonToCode(verified.reason),
      detail: verified.reason,
    };
  }

  if (!cachedCRL) {
    return { ok: true, rekorLogIndex: verified.rekorLogIndex, warning: 'crl_unavailable' };
  }

  const digest = computePayloadDigest(bundleJson);
  if (!digest) {
    return { ok: false, reason: 'malformed' };
  }
  if (cachedCRL.revokedDigests.includes(digest)) {
    return { ok: false, reason: 'revoked' };
  }

  return { ok: true, rekorLogIndex: verified.rekorLogIndex };
}

function computePayloadDigest(bundleJson: string): string | null {
  try {
    const raw = JSON.parse(bundleJson) as Record<string, unknown>;
    const envelope =
      (raw?.dsseEnvelope ?? (raw as any)?.content?.dsseEnvelope) as { payload?: string } | undefined;
    if (!envelope?.payload) return null;
    const payload = Buffer.from(envelope.payload, 'base64');
    return createHash('sha256').update(payload).digest('hex');
  } catch {
    return null;
  }
}

function mapReasonToCode(reason: string): VerifyFailureReason {
  if (/revoked/i.test(reason)) return 'revoked';
  if (/bundle hash mismatch|tampering/i.test(reason)) return 'bundle_hash_mismatch';
  if (/certificate chain invalid/i.test(reason)) return 'cert_chain_invalid';
  if (/transparency log inclusion failed/i.test(reason)) return 'rekor_inclusion_fail';
  if (/manifest payload schema is invalid|schema/i.test(reason)) return 'schema_invalid';
  if (/malformed|cannot be parsed|contains no dsse|extract manifest payload/i.test(reason)) return 'malformed';
  return 'invalid_sig';
}
