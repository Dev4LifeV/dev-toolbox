## firebase-free-tier-calculator

Answers the question every Firebase developer has: **"How many users can I handle on the free tier?"**

Covers **every Firebase service** — Firestore, Realtime Database, Cloud Storage, Authentication, Hosting, Cloud Functions, App Hosting, FCM, Crashlytics, Analytics, Remote Config, App Check, Cloud Build, Secret Manager, and Cloud Logging.

### Usage

```bash
node firebase-free-tier-calculator.js 500
```

### What you get

**1. Complete free tier reference** — Every service limit in one place, so you don't have to dig through Firebase docs.

**2. Three user profiles** — Light, Moderate, Heavy — with per-service breakdowns, visual usage bars, and estimated cost:

```
── PROFILE: Moderate (opens 2-3x/day, interacts) ──
  Firestore reads:     50,000  █████████████████████████ 100.0%
  Firestore writes:    15,000  ███████████████████░░░░░░  75.0%
  Firestore deletes:    1,250  ██░░░░░░░░░░░░░░░░░░░░░░░  6.3%
  Storage downloads:   20,000  ██████████░░░░░░░░░░░░░░░  40.0%
  Storage egress:      2.86 GB/day  █████████████████████████ 200.0%
  Storage uploads:        307  █░░░░░░░░░░░░░░░░░░░░░░░░  1.5%  (150.0 MB/day)
  Function calls:       10,000  ████░░░░░░░░░░░░░░░░░░░░░  15.0%
  Push notifications:    3,000/day  (free — unlimited)

  Total cost/mo:     $0.00 (within free tier)
```

**3. A service-by-service dashboard** using a realistic mix (60% light, 30% moderate, 10% heavy):

```
  ┌─────────────────────────┬───────────┬───────────┬──────────────────────────────┬──────┐
  │ Service                 │  Used/day │ Free/day  │ Usage                        │  OK? │
  ├─────────────────────────┼───────────┼───────────┼──────────────────────────────┼──────┤
  │ Firestore reads         │    17,000 │    50,000 │ █████████░░░░░░░░░░░░░ 34.0% │ OK   │
  │ Firestore writes        │     5,150 │    20,000 │ ██████░░░░░░░░░░░░░░░░ 25.8% │ OK   │
  │ Firestore deletes       │       448 │    20,000 │ █░░░░░░░░░░░░░░░░░░░░░  2.2% │ OK   │
  │ Storage downloads       │     6,900 │    50,000 │ ███░░░░░░░░░░░░░░░░░░░ 13.8% │ OK   │
  │ Storage egress (GB)     │      0.99 │         1 │ █████████████████████░ 98.7%  │ !!   │
  │ Storage uploads         │       128 │    20,000 │ ░░░░░░░░░░░░░░░░░░░░░░  0.6% │ OK   │
  │ Auth MAU                │     1,250 │    50,000 │ █░░░░░░░░░░░░░░░░░░░░░  2.5% │ OK   │
  │ Functions/mo            │    99,000 │ 2,000,000 │ █░░░░░░░░░░░░░░░░░░░░░  5.0% │ OK   │
  │ FCM (push msgs)         │       any │ unlimited │ ░░░░░░░░░░░░░░░░░░░░░░ free  │ OK   │
  │ Crashlytics             │       any │ unlimited │ ░░░░░░░░░░░░░░░░░░░░░░ free  │ OK   │
  │ Analytics               │       any │ unlimited │ ░░░░░░░░░░░░░░░░░░░░░░ free  │ OK   │
  └─────────────────────────┴───────────┴───────────┴──────────────────────────────┴──────┘
```

**4. A monthly summary** with cost breakdown by service:

```
  Monthly summary:
    Firestore reads:    1,020,000  (free: 1,500,000)
    Firestore writes:     309,000  (free: 600,000)
    Storage downloads:    414,000  (free: 1,500,000)
    Storage egress:       59.22 GB  (free: 30 GB)
    Function calls:       198,000  (free: 2,000,000)
    Auth MAU:               2,500  (free: 50,000)

  Estimated cost/mo:  $3.49
    Storage egress:    $3.49
```

**5. A scale table** from 10 to 50,000 DAU with Firestore + Functions + total cost:

```
  ┌──────────────────┬───────┬───────────┬───────────┬──────────┬──────────┐
  │ Stage            │   DAU │ Reads/day │Writes/day │ Func/mo  │ Cost/mo  │
  ├──────────────────┼───────┼───────────┼───────────┼──────────┼──────────┤
  │ Hobby / MVP      │   100 │     3,400 │     1,030 │   19,800 │    $0.00 │
  │ Startup          │ 1,000 │    34,000 │    10,300 │  198,000 │    $3.49 │
  │ Growth           │ 5,000 │   170,000 │    51,500 │  990,000 │   $36.37 │
  │ Scale            │10,000 │   340,000 │   103,000 │1,980,000 │   $79.04 │
  │ Large scale      │50,000 │ 1,700,000 │   515,000 │9,900,000 │  $423.80 │
  └──────────────────┴───────┴───────────┴───────────┴──────────┴──────────┘
```

**6. Quick reference** for Storage, Hosting, and Realtime Database capacity.

### TL;DR

- A typical app handles **~1,500 DAU** on the free tier (bottleneck: Firestore reads)
- **Storage egress** (image downloads) is often the first hidden cost — it adds up fast
- At 5,000 DAU it costs **~$36/month** (mostly storage bandwidth)
- FCM, Crashlytics, Analytics, Remote Config, and App Check are **always free**
- Firebase is cheap even at scale. Stop worrying and ship.

### Services covered

| Service | Tracked metrics |
|---------|----------------|
| **Firestore** | Reads, writes, deletes, storage |
| **Realtime Database** | Connections, storage, downloads |
| **Cloud Storage** | Uploads (ops + MB), downloads (ops + GB egress), stored data |
| **Authentication** | MAU, phone verifications |
| **Hosting** | Bandwidth, storage |
| **Cloud Functions** | Invocations, CPU, memory |
| **App Hosting (Cloud Run)** | CPU, memory, requests, bandwidth |
| **FCM** | Always free |
| **Remote Config** | Always free |
| **Crashlytics** | Always free |
| **Analytics** | Always free |
| **App Check** | Always free |
| **Cloud Build** | Build minutes (per billing account) |
| **Cloud Logging** | Storage |
| **Secret Manager** | Active versions, access operations |

### How usage is estimated

Based on conservative averages across common app categories (social, e-commerce, SaaS, delivery, etc.):

| Action | Reads | Writes |
|--------|-------|--------|
| Login / auth flow | 2 | 1 |
| Load main screen | 5 | 0 |
| Browse content (paginated) | 3 | 0 |
| Interact (like, favorite) | 1 | 1 |
| Create content | 1 | 2 |
| Real-time listeners (per session) | 3 | 0 |
| Notifications | 2 | 1 |

Storage estimates:
- **Downloads**: ~150KB avg per file (mix of thumbnails + full images)
- **Uploads**: ~500KB avg per file (compressed images)
- Cloud Functions: ~0.5 invocations per Firestore write (triggered functions)

### Requirements

- Node.js 14+
- Zero dependencies

---

## Contributing

Each tool in this repo is a **single file** with **zero dependencies**. If you want to add a tool, keep it that way.

## License

MIT
