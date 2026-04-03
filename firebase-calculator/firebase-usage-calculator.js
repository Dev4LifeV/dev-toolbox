#!/usr/bin/env node

/**
 * Firebase Free Tier Calculator
 *
 * Estimates usage and costs across ALL Firebase services
 * based on your number of daily active users.
 *
 * Usage:
 *   node firebase-free-tier-calculator.js [daily_active_users]
 *
 * Examples:
 *   node firebase-free-tier-calculator.js 100
 *   node firebase-free-tier-calculator.js 5000
 */

// ═══════════════════════════════════════════════════════════════
// FIREBASE FREE TIER LIMITS (Blaze plan, 2025)
// Source: firebase.google.com/pricing
// ═══════════════════════════════════════════════════════════════

const FREE_TIER = {
  // Firestore
  firestoreReadsPerDay: 50_000,
  firestoreWritesPerDay: 20_000,
  firestoreDeletesPerDay: 20_000,
  firestoreStorageGiB: 1,
  firestoreEgressGiBPerDay: 10,

  // Realtime Database
  rtdbConnections: 200,           // simultaneous connections
  rtdbStorageGB: 1,
  rtdbDownloadGB: 10,             // per month

  // Cloud Storage
  storageGB: 5,
  storageDownloadsPerDay: 50_000,
  storageUploadsPerDay: 20_000,
  storageEgressGB: 1,             // per day

  // Authentication
  authMAU: 50_000,
  authPhoneVerificationsPerDay: 10,
  authSamlMauFree: 50,

  // Hosting
  hostingStorageGB: 10,
  hostingBandwidthGiBPerMonth: 10,

  // Cloud Functions
  functionsInvocationsPerMonth: 2_000_000,
  functionsCpuSecondsPerMonth: 400_000,
  functionsEgressGB: 5,

  // Cloud Messaging (FCM)
  fcmFree: true,                  // unlimited

  // Remote Config
  remoteConfigFree: true,         // unlimited

  // Crashlytics
  crashlyticsFree: true,          // unlimited

  // Analytics
  analyticsFree: true,            // unlimited

  // App Check
  appCheckFree: true,             // unlimited (standard providers)

  // App Hosting (Cloud Run)
  appHostingCpuSeconds: 180_000,  // vCPU-seconds/mo
  appHostingMemoryGiBSeconds: 360_000,
  appHostingRequests: 2_000_000,
  appHostingEgressCachedGiB: 10,
  appHostingEgressUncachedGiB: 10,

  // Cloud Build
  cloudBuildMinutes: 2_500,       // per billing account

  // Secret Manager
  secretVersions: 6,
  secretAccessOps: 10_000,

  // Cloud Logging
  loggingGiB: 50,                 // per project/mo

  // Extensions
  extensionsFree: true,           // extensions themselves are free, but consume other resources
};

// ═══════════════════════════════════════════════════════════════
// COSTS BEYOND FREE TIER
// ═══════════════════════════════════════════════════════════════

const COSTS = {
  firestoreReadsPer100k: 0.06,
  firestoreWritesPer100k: 0.18,
  firestoreDeletesPer100k: 0.02,
  firestoreStoragePerGiBMonth: 0.18,

  rtdbGBStored: 5.00,
  rtdbGBDownloaded: 1.00,

  storagePerGBMonth: 0.026,
  storageClassAOps: 0.005,      // per 1,000 (uploads)
  storageClassBOps: 0.0004,     // per 1,000 (downloads)

  authPhonePerVerification: 0.06, // US/Canada, varies by region
  authSamlPerMAU: 0.015,

  hostingBandwidthPerGiB: 0.15,
  hostingStoragePerGB: 0.026,

  functionsPerMillion: 0.40,
  functionsCpuPerSecond: 0.0000125,
  functionsMemoryPerGBSecond: 0.0000025,

  appHostingCpuPerSecond: 0.000024,
  appHostingMemoryPerGiBSecond: 0.0000025,
  appHostingRequestsPerMillion: 0.40,
  appHostingEgressCachedPerGiB: 0.15,
  appHostingEgressUncachedPerGiB: 0.20,

  cloudBuildPerMinute: 0.006,

  secretPerVersion: 0.06,
  secretAccessPer10k: 0.03,

  loggingPerGiB: 0.50,
};

// ═══════════════════════════════════════════════════════════════
// USER BEHAVIOR PROFILES
//
// Average ops per session based on typical app patterns:
//
//   Login/Auth:        2 reads + 1 write
//   Load main screen:  5 reads (config, lists, collections)
//   Browse content:    3 reads (paginated queries)
//   Interact:          1 read + 1 write (validate + save)
//   Create content:    1 read + 2 writes (validate + create + update)
//   Real-time:         3 reads (listener snapshots)
//   Notifications:     2 reads + 1 write (fetch + mark read)
//   Upload image:      1 storage upload (~300KB avg)
//   Cloud Function:    triggered by writes (avg 0.5 per write)
// ═══════════════════════════════════════════════════════════════

// Average size of downloaded files (images, thumbnails, avatars)
const AVG_DOWNLOAD_SIZE_KB = 150; // ~150KB per downloaded file (mix of thumbnails + full images)

const PROFILES = {
  light: {
    label: 'Light (opens 1x/day, browses briefly)',
    sessionsPerDay: 1,
    readsPerSession: 15,
    writesPerSession: 3,
    deletesPerSession: 0.2,
    storageDownloadsPerSession: 5,  // images loaded per session (product photos, avatars, etc.)
    storageUploadsMB: 0.05,         // ~1 in 20 sessions uploads a ~1MB image
    functionTriggersPerSession: 2,  // cloud functions triggered per session
    pushNotificationsReceived: 1,   // FCM messages received/day
    hostingPageLoads: 0,            // 0 for mobile-only, 1+ for web apps
    realtimeDbReadsKB: 0,           // 0 if not using RTDB
  },
  moderate: {
    label: 'Moderate (opens 2-3x/day, interacts)',
    sessionsPerDay: 2.5,
    readsPerSession: 20,
    writesPerSession: 6,
    deletesPerSession: 0.5,
    storageDownloadsPerSession: 8,
    storageUploadsMB: 0.15,
    functionTriggersPerSession: 4,
    pushNotificationsReceived: 3,
    hostingPageLoads: 0,
    realtimeDbReadsKB: 0,
  },
  heavy: {
    label: 'Heavy (opens 4-5x/day, creates content)',
    sessionsPerDay: 4,
    readsPerSession: 25,
    writesPerSession: 10,
    deletesPerSession: 1,
    storageDownloadsPerSession: 12,
    storageUploadsMB: 0.5,
    functionTriggersPerSession: 6,
    pushNotificationsReceived: 5,
    hostingPageLoads: 0,
    realtimeDbReadsKB: 0,
  },
};

const PROFILE_MIX = { light: 0.6, moderate: 0.3, heavy: 0.1 };

// ═══════════════════════════════════════════════════════════════
// CALCULATOR ENGINE
// ═══════════════════════════════════════════════════════════════

// Average upload size (~500KB per image upload)
const AVG_UPLOAD_SIZE_KB = 500;

function calcProfile(dau, p) {
  const s = p.sessionsPerDay * dau;
  const downloads = Math.round(p.storageDownloadsPerSession * s);
  const downloadGB = (downloads * AVG_DOWNLOAD_SIZE_KB) / (1024 * 1024); // convert KB to GB
  const uploadsMB = p.storageUploadsMB * dau;
  const uploadOps = Math.round(uploadsMB / (AVG_UPLOAD_SIZE_KB / 1024)); // how many files
  const uploadGB = uploadsMB / 1024; // convert MB to GB
  return {
    firestoreReads: Math.round(p.readsPerSession * s),
    firestoreWrites: Math.round(p.writesPerSession * s),
    firestoreDeletes: Math.round(p.deletesPerSession * s),
    storageDownloads: downloads,
    storageDownloadGB: downloadGB,
    storageUploadOps: uploadOps,
    storageUploadsMB: uploadsMB,
    storageUploadGB: uploadGB,
    functionInvocations: Math.round(p.functionTriggersPerSession * s),
    pushNotifications: Math.round(p.pushNotificationsReceived * dau),
    hostingPageLoads: Math.round(p.hostingPageLoads * s),
    realtimeDbKB: Math.round(p.realtimeDbReadsKB * s),
  };
}

function calcWeightedMix(dau) {
  const result = {
    firestoreReads: 0, firestoreWrites: 0, firestoreDeletes: 0,
    storageDownloads: 0, storageDownloadGB: 0, storageUploadOps: 0, storageUploadsMB: 0, storageUploadGB: 0,
    functionInvocations: 0, pushNotifications: 0, hostingPageLoads: 0, realtimeDbKB: 0,
  };
  for (const [key, profile] of Object.entries(PROFILES)) {
    const r = calcProfile(dau, profile);
    const w = PROFILE_MIX[key];
    for (const k of Object.keys(result)) result[k] += r[k] * w;
  }
  for (const k of Object.keys(result)) result[k] = Math.round(result[k] * 100) / 100;
  // Round integers
  for (const k of ['firestoreReads', 'firestoreWrites', 'firestoreDeletes', 'storageDownloads', 'storageUploadOps', 'functionInvocations', 'pushNotifications', 'hostingPageLoads', 'realtimeDbKB']) {
    result[k] = Math.round(result[k]);
  }
  return result;
}

function calcMonthlyCosts(daily) {
  const costs = {};
  let total = 0;

  // Firestore
  const frExcess = Math.max(0, daily.firestoreReads * 30 - FREE_TIER.firestoreReadsPerDay * 30);
  const fwExcess = Math.max(0, daily.firestoreWrites * 30 - FREE_TIER.firestoreWritesPerDay * 30);
  const fdExcess = Math.max(0, daily.firestoreDeletes * 30 - FREE_TIER.firestoreDeletesPerDay * 30);
  costs.firestoreReads = (frExcess / 100_000) * COSTS.firestoreReadsPer100k;
  costs.firestoreWrites = (fwExcess / 100_000) * COSTS.firestoreWritesPer100k;
  costs.firestoreDeletes = (fdExcess / 100_000) * COSTS.firestoreDeletesPer100k;

  // Cloud Storage — operations
  const dlOpsExcess = Math.max(0, daily.storageDownloads * 30 - FREE_TIER.storageDownloadsPerDay * 30);
  costs.storageDownloadOps = (dlOpsExcess / 1_000) * COSTS.storageClassBOps;

  // Cloud Storage — egress bandwidth (downloads)
  const dlGBMonth = (daily.storageDownloadGB || 0) * 30;
  const egressExcess = Math.max(0, dlGBMonth - FREE_TIER.storageEgressGB * 30);
  costs.storageEgress = egressExcess * 0.12; // $0.12/GB egress (NA)

  // Cloud Storage — stored data
  const storedGBMonth = (daily.storageUploadGB || 0) * 30; // cumulative new data per month
  const storedExcess = Math.max(0, storedGBMonth - FREE_TIER.storageGB);
  costs.storageStored = storedExcess * COSTS.storagePerGBMonth;

  // Cloud Functions
  const funcExcess = Math.max(0, daily.functionInvocations * 30 - FREE_TIER.functionsInvocationsPerMonth);
  costs.functions = (funcExcess / 1_000_000) * COSTS.functionsPerMillion;

  // Hosting
  // Assume ~400KB per page load, convert to GiB
  const hostingGiB = (daily.hostingPageLoads * 30 * 400) / (1024 * 1024);
  const hostingExcess = Math.max(0, hostingGiB - FREE_TIER.hostingBandwidthGiBPerMonth);
  costs.hosting = hostingExcess * COSTS.hostingBandwidthPerGiB;

  for (const v of Object.values(costs)) total += v;
  costs.total = total;
  return costs;
}

// ═══════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════

const fmt = (n) => n.toLocaleString('en-US');
const B = '\x1b[1m', R = '\x1b[0m', G = '\x1b[32m', Y = '\x1b[33m', RED = '\x1b[31m', C = '\x1b[36m', D = '\x1b[2m';

function bar(used, total, w = 25) {
  const pct = Math.min(used / total, 2);
  const f = Math.round(pct * w);
  const e = w - Math.min(f, w);
  const c = pct > 1 ? RED : pct > 0.7 ? Y : G;
  return `${c}${'█'.repeat(Math.min(f, w))}${R}${'░'.repeat(e)} ${(pct * 100).toFixed(1)}%`;
}

function statusIcon(pct) {
  if (pct === 0) return `${D}--${R}`;
  if (pct <= 50) return `${G}OK${R}`;
  if (pct <= 80) return `${Y}!!${R}`;
  return `${RED}!!${R}`;
}

function fmtCost(v) {
  return v > 0 ? `${Y}$${v.toFixed(2)}${R}` : `${G}$0.00${R}`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN OUTPUT
// ═══════════════════════════════════════════════════════════════

function main() {
  const dau = parseInt(process.argv[2]) || 100;
  const mau = Math.round(dau * 2.5);

  console.log(`${B}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          FIREBASE FREE TIER CALCULATOR                     ║');
  console.log('║          All services — Blaze plan (2025)                  ║');
  console.log(`╚══════════════════════════════════════════════════════════════╝${R}`);
  console.log(`\n${C}Projection for ${fmt(dau)} DAU (≈ ${fmt(mau)} MAU)${R}\n`);

  // ─── COMPLETE FREE TIER REFERENCE ────────────────────────────
  console.log(`${B}── COMPLETE FREE TIER LIMITS ────────────────────────${R}`);
  console.log();
  console.log(`  ${B}Firestore${R}`);
  console.log(`    Reads:              ${fmt(FREE_TIER.firestoreReadsPerDay)}/day`);
  console.log(`    Writes:             ${fmt(FREE_TIER.firestoreWritesPerDay)}/day`);
  console.log(`    Deletes:            ${fmt(FREE_TIER.firestoreDeletesPerDay)}/day`);
  console.log(`    Storage:            ${FREE_TIER.firestoreStorageGiB} GiB`);
  console.log();
  console.log(`  ${B}Realtime Database${R}`);
  console.log(`    Simultaneous conn:  ${FREE_TIER.rtdbConnections}`);
  console.log(`    Storage:            ${FREE_TIER.rtdbStorageGB} GB`);
  console.log(`    Downloads:          ${FREE_TIER.rtdbDownloadGB} GB/mo`);
  console.log();
  console.log(`  ${B}Cloud Storage${R}`);
  console.log(`    Storage:            ${FREE_TIER.storageGB} GB`);
  console.log(`    Downloads:          ${fmt(FREE_TIER.storageDownloadsPerDay)}/day`);
  console.log(`    Uploads:            ${fmt(FREE_TIER.storageUploadsPerDay)}/day`);
  console.log();
  console.log(`  ${B}Authentication${R}`);
  console.log(`    MAU (email/social): ${fmt(FREE_TIER.authMAU)}`);
  console.log(`    Phone verify:       ${FREE_TIER.authPhoneVerificationsPerDay}/day`);
  console.log();
  console.log(`  ${B}Hosting${R}`);
  console.log(`    Storage:            ${FREE_TIER.hostingStorageGB} GB`);
  console.log(`    Bandwidth:          ${FREE_TIER.hostingBandwidthGiBPerMonth} GiB/mo`);
  console.log();
  console.log(`  ${B}Cloud Functions${R}`);
  console.log(`    Invocations:        ${fmt(FREE_TIER.functionsInvocationsPerMonth)}/mo`);
  console.log(`    CPU:                ${fmt(FREE_TIER.functionsCpuSecondsPerMonth)} seconds/mo`);
  console.log();
  console.log(`  ${B}App Hosting (Cloud Run)${R}`);
  console.log(`    CPU:                ${fmt(FREE_TIER.appHostingCpuSeconds)} vCPU-seconds/mo`);
  console.log(`    Memory:             ${fmt(FREE_TIER.appHostingMemoryGiBSeconds)} GiB-seconds/mo`);
  console.log(`    Requests:           ${fmt(FREE_TIER.appHostingRequests)}/mo`);
  console.log(`    Bandwidth:          ${FREE_TIER.appHostingEgressCachedGiB} GiB cached + ${FREE_TIER.appHostingEgressUncachedGiB} GiB uncached/mo`);
  console.log();
  console.log(`  ${B}Other (always free)${R}`);
  console.log(`    FCM (push):         Unlimited`);
  console.log(`    Remote Config:      Unlimited`);
  console.log(`    Crashlytics:        Unlimited`);
  console.log(`    Analytics:          Unlimited`);
  console.log(`    App Check:          Unlimited`);
  console.log(`    Cloud Build:        ${fmt(FREE_TIER.cloudBuildMinutes)} min/mo (per billing account)`);
  console.log(`    Cloud Logging:      ${FREE_TIER.loggingGiB} GiB/mo`);
  console.log(`    Secret Manager:     ${FREE_TIER.secretVersions} active versions`);
  console.log();

  // ─── PER-PROFILE ANALYSIS ───────────────────────────────────
  let wReads = 0, wWrites = 0;

  for (const [key, profile] of Object.entries(PROFILES)) {
    const r = calcProfile(dau, profile);
    const pct = PROFILE_MIX[key];
    wReads += r.firestoreReads * pct;
    wWrites += r.firestoreWrites * pct;
    const c = calcMonthlyCosts(r);

    console.log(`${B}── PROFILE: ${profile.label} ──${R}`);
    console.log(`  If ALL ${fmt(dau)} users matched this profile:\n`);
    console.log(`  Sessions/day:      ${profile.sessionsPerDay}`);
    console.log(`  Reads/session:     ${profile.readsPerSession}        Writes/session: ${profile.writesPerSession}`);
    console.log();
    console.log(`  Firestore reads:   ${fmt(r.firestoreReads).padStart(9)}  ${bar(r.firestoreReads, FREE_TIER.firestoreReadsPerDay)}`);
    console.log(`  Firestore writes:  ${fmt(r.firestoreWrites).padStart(9)}  ${bar(r.firestoreWrites, FREE_TIER.firestoreWritesPerDay)}`);
    console.log(`  Firestore deletes: ${fmt(r.firestoreDeletes).padStart(9)}  ${bar(r.firestoreDeletes, FREE_TIER.firestoreDeletesPerDay)}`);
    console.log(`  Storage downloads: ${fmt(r.storageDownloads).padStart(9)}  ${bar(r.storageDownloads, FREE_TIER.storageDownloadsPerDay)}`);
    console.log(`  Storage egress:    ${r.storageDownloadGB.toFixed(2).padStart(7)} GB/day  ${bar(r.storageDownloadGB, FREE_TIER.storageEgressGB)}`);
    console.log(`  Storage uploads:   ${fmt(r.storageUploadOps).padStart(9)}  ${bar(r.storageUploadOps, FREE_TIER.storageUploadsPerDay)}  (${r.storageUploadsMB.toFixed(1)} MB/day)`);
    console.log(`  Function calls:    ${fmt(r.functionInvocations).padStart(9)}  ${bar(r.functionInvocations * 30, FREE_TIER.functionsInvocationsPerMonth)}`);
    console.log(`  Push notifications:${fmt(r.pushNotifications).padStart(9)}/day  (free — unlimited)`);
    console.log();
    console.log(`  Total cost/mo:     ${c.total > 0 ? `${Y}$${c.total.toFixed(2)}${R}` : `${G}$0.00 (within free tier)${R}`}`);
    console.log();
  }

  // ─── REALISTIC PROJECTION ───────────────────────────────────
  const mix = calcWeightedMix(dau);
  const mixC = calcMonthlyCosts(mix);
  const mixLabel = Object.entries(PROFILE_MIX).map(([k, v]) => `${Math.round(v * 100)}% ${k}`).join(', ');

  console.log(`${B}══ REALISTIC PROJECTION (${mixLabel}) ══${R}\n`);

  // Service-by-service dashboard
  console.log('  ┌─────────────────────────┬───────────┬───────────┬──────────────────────────────┬──────┐');
  console.log('  │ Service                 │  Used/day │ Free/day  │ Usage                        │  OK? │');
  console.log('  ├─────────────────────────┼───────────┼───────────┼──────────────────────────────┼──────┤');

  const rows = [
    ['Firestore reads',   mix.firestoreReads,    FREE_TIER.firestoreReadsPerDay],
    ['Firestore writes',  mix.firestoreWrites,   FREE_TIER.firestoreWritesPerDay],
    ['Firestore deletes', mix.firestoreDeletes,  FREE_TIER.firestoreDeletesPerDay],
    ['Storage downloads', mix.storageDownloads,  FREE_TIER.storageDownloadsPerDay],
    ['Storage egress (GB)', Math.round(mix.storageDownloadGB * 100) / 100, FREE_TIER.storageEgressGB],
    ['Storage uploads',   mix.storageUploadOps,  FREE_TIER.storageUploadsPerDay],
    ['Auth MAU',          mau,                   FREE_TIER.authMAU, true],
    ['Functions/mo',      mix.functionInvocations * 30, FREE_TIER.functionsInvocationsPerMonth, true],
  ];

  for (const [label, used, free, isMonthly] of rows) {
    const pct = free > 0 ? (used / free) * 100 : 0;
    const usedStr = fmt(used).padStart(9);
    const freeStr = fmt(free).padStart(9);
    const b = bar(used, free, 22);
    const icon = statusIcon(pct);
    console.log(`  │ ${label.padEnd(23)} │ ${usedStr} │ ${freeStr} │ ${b} │ ${icon}   │`);
  }

  // Always-free services
  const freeRows = [
    'FCM (push msgs)',
    'Remote Config',
    'Crashlytics',
    'Analytics',
    'App Check',
  ];
  for (const label of freeRows) {
    console.log(`  │ ${label.padEnd(23)} │ ${`${D}any${R}`.padStart(18)} │ ${'unlimited'.padStart(9)} │ ${`${G}${'█'.repeat(0)}${'░'.repeat(22)}${R} free`.padEnd(39)} │ ${G}OK${R}   │`);
  }

  console.log('  └─────────────────────────┴───────────┴───────────┴──────────────────────────────┴──────┘');

  // Monthly summary
  console.log(`\n  ${B}Monthly summary:${R}`);
  console.log(`    Firestore reads:   ${fmt(mix.firestoreReads * 30).padStart(10)}  (free: ${fmt(FREE_TIER.firestoreReadsPerDay * 30)})`);
  console.log(`    Firestore writes:  ${fmt(mix.firestoreWrites * 30).padStart(10)}  (free: ${fmt(FREE_TIER.firestoreWritesPerDay * 30)})`);
  console.log(`    Storage downloads: ${fmt(mix.storageDownloads * 30).padStart(10)}  (free: ${fmt(FREE_TIER.storageDownloadsPerDay * 30)})`);
  console.log(`    Storage egress:    ${(mix.storageDownloadGB * 30).toFixed(2).padStart(8)} GB  (free: ${FREE_TIER.storageEgressGB * 30} GB)`);
  console.log(`    Function calls:    ${fmt(mix.functionInvocations * 30).padStart(10)}  (free: ${fmt(FREE_TIER.functionsInvocationsPerMonth)})`);
  console.log(`    Auth MAU:          ${fmt(mau).padStart(10)}  (free: ${fmt(FREE_TIER.authMAU)})`);

  console.log(`\n  ${B}Estimated cost/mo:${R}  ${mixC.total > 0 ? `${Y}$${mixC.total.toFixed(2)}${R}` : `${G}$0.00 (within free tier)${R}`}`);
  if (mixC.total > 0) {
    if (mixC.firestoreReads > 0) console.log(`    Firestore reads:   $${mixC.firestoreReads.toFixed(2)}`);
    if (mixC.firestoreWrites > 0) console.log(`    Firestore writes:  $${mixC.firestoreWrites.toFixed(2)}`);
    if (mixC.firestoreDeletes > 0) console.log(`    Firestore deletes: $${mixC.firestoreDeletes.toFixed(2)}`);
    if (mixC.storageDownloadOps > 0) console.log(`    Storage ops:       $${mixC.storageDownloadOps.toFixed(2)}`);
    if (mixC.storageEgress > 0) console.log(`    Storage egress:    $${mixC.storageEgress.toFixed(2)}`);
    if (mixC.storageStored > 0) console.log(`    Storage stored:    $${mixC.storageStored.toFixed(2)}`);
    if (mixC.functions > 0) console.log(`    Cloud Functions:   $${mixC.functions.toFixed(2)}`);
    if (mixC.hosting > 0) console.log(`    Hosting:           $${mixC.hosting.toFixed(2)}`);
  }

  // ─── MAX LIMITS ──────────────────────────────────────────────
  const rpu = mix.firestoreReads / dau || 1;
  const wpu = mix.firestoreWrites / dau || 1;
  const maxR = Math.floor(FREE_TIER.firestoreReadsPerDay / rpu);
  const maxW = Math.floor(FREE_TIER.firestoreWritesPerDay / wpu);
  const maxDAU = Math.min(maxR, maxW);
  const bottleneck = maxR < maxW ? 'Firestore reads' : 'Firestore writes';

  console.log(`\n${B}══ MAX DAU ON FREE TIER ═════════════════════════════════════════${R}\n`);
  console.log(`  Max DAU (Firestore):   ~${fmt(maxDAU)} (bottleneck: ${bottleneck})`);
  console.log(`  Max MAU (Auth):        ${fmt(FREE_TIER.authMAU)}`);
  console.log(`  Avg reads/user/day:    ~${rpu.toFixed(1)}`);
  console.log(`  Avg writes/user/day:   ~${wpu.toFixed(1)}`);

  // ─── SCALE TABLE ─────────────────────────────────────────────
  console.log(`\n${B}══ SCALE TABLE ═════════════════════════════════════════════════${R}\n`);
  console.log('  ┌──────────────────┬───────┬───────────┬───────────┬──────────┬──────────┐');
  console.log('  │ Stage            │   DAU │ Reads/day │Writes/day │ Func/mo  │ Cost/mo  │');
  console.log('  ├──────────────────┼───────┼───────────┼───────────┼──────────┼──────────┤');

  const scenarios = [10, 50, 100, 500, 1000, 2000, 5000, 10000, 50000];
  for (const s of scenarios) {
    const d = calcWeightedMix(s);
    const c = calcMonthlyCosts(d);
    const cStr = c.total > 0 ? `$${c.total.toFixed(2)}` : '$0.00';
    const label = s <= 100 ? 'Hobby / MVP' : s <= 1000 ? 'Startup' : s <= 5000 ? 'Growth' : s <= 10000 ? 'Scale' : 'Large scale';
    console.log(
      `  │ ${label.padEnd(16)} │ ${fmt(s).padStart(5)} │ ${fmt(d.firestoreReads).padStart(9)} │ ${fmt(d.firestoreWrites).padStart(9)} │ ${fmt(d.functionInvocations * 30).padStart(8)} │ ${cStr.padStart(8)} │`
    );
  }
  console.log('  └──────────────────┴───────┴───────────┴───────────┴──────────┴──────────┘');

  // ─── QUICK REFERENCE ─────────────────────────────────────────
  console.log(`\n${B}══ QUICK REFERENCE — STORAGE & HOSTING ═════════════════════════${R}\n`);
  console.log(`  Cloud Storage (${FREE_TIER.storageGB} GB free):`);
  console.log(`    ~10,000 images at 500KB    = 5 GB`);
  console.log(`    ~50,000 images at 100KB    = 5 GB`);
  console.log(`    ~100 videos at 50MB        = 5 GB`);
  console.log();
  console.log(`  Hosting (${FREE_TIER.hostingBandwidthGiBPerMonth} GiB/mo free):`);
  console.log(`    SPA (~400KB):               ~26,000 page loads/mo`);
  console.log(`    Static site (~50KB):        ~209,000 page loads/mo`);
  console.log(`    With CDN cache:             Virtually unlimited`);
  console.log();
  console.log(`  Realtime Database (${FREE_TIER.rtdbStorageGB} GB, ${FREE_TIER.rtdbConnections} connections):`);
  console.log(`    Chat app (1KB/msg):         ~1,000,000 messages stored`);
  console.log(`    Presence system:            ${FREE_TIER.rtdbConnections} simultaneous users max`);

  // ─── NOTES ───────────────────────────────────────────────────
  console.log(`
${D}  Notes:
  * DAU = Daily Active Users | MAU ≈ DAU x 2.5
  * Free tier is per Firebase project (Blaze plan)
  * Except: Cloud Build minutes are per billing account (shared across projects)
  * Read/write estimates are conservative averages for typical apps
  * Cloud Functions cost depends heavily on execution time (not just invocations)
  * Apps with many real-time listeners may consume more reads
  * Firestore offline cache can reduce actual reads by 20-40%
  * FCM, Crashlytics, Analytics, Remote Config, App Check are always free
  * Pricing as of 2025 — verify at firebase.google.com/pricing${R}
`);
}

main();
