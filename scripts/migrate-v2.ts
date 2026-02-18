/**
 * Migration Script: v1 (single gamedata key) → v2 (multi-key user/score/group pattern)
 *
 * Run with: npx tsx scripts/migrate-v2.ts
 *
 * What it does:
 * 1. Reads old `gamedata` key (never deletes it — kept as backup)
 * 2. Creates 3 legacy user records (legacy_james, legacy_tyler, legacy_david)
 * 3. Creates "AHA GGs OG" group (grp_og) with all 3 as members + admins
 * 4. Re-keys every score into individual score keys
 * 5. Sets up friend relationships between all 3 legacy users
 * 6. Generates + prints 3 claim codes
 * 7. Populates reserved usernames set
 * 8. Marks migration:v2:complete flag
 *
 * Idempotent — safe to re-run.
 */

import { Redis } from '@upstash/redis';
import {
  UserId, GroupId, UserProfile, Group, DailyScore, ClaimCode,
  LEGACY_TO_USERNAME, LEGACY_TO_ID, LEGACY_DISPLAY_NAMES, LEGACY_IDS,
  RESERVED_USERNAMES,
} from '../lib/types';

// Old v1 types (for reading gamedata)
interface OldPlayerDayData {
  rounds: [number, number, number];
  submitted: boolean;
}

interface OldDayData {
  james: OldPlayerDayData | null;
  tyler: OldPlayerDayData | null;
  david: OldPlayerDayData | null;
  revealed: boolean;
}

interface OldGameData {
  days: Record<string, OldDayData>;
}

const OLD_PLAYERS = ['james', 'tyler', 'david'] as const;

function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function main() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN env vars');
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  // Check if already migrated
  const migrated = await redis.get('migration:v2:complete');
  if (migrated === 'true' || migrated === true) {
    console.log('Migration already complete. Re-running anyway (idempotent)...\n');
  }

  // 1. Read old gamedata
  console.log('1. Reading old gamedata...');
  const gamedata = await redis.get<OldGameData>('gamedata');
  if (!gamedata || !gamedata.days) {
    console.log('   No gamedata found (empty database). Creating fresh setup...\n');
  } else {
    const dayCount = Object.keys(gamedata.days).length;
    console.log(`   Found ${dayCount} days of data.\n`);
  }

  // 2. Create legacy user records
  console.log('2. Creating legacy user records...');
  for (const oldName of OLD_PLAYERS) {
    const legacyId = LEGACY_TO_ID[oldName];
    const username = LEGACY_TO_USERNAME[oldName];
    const displayName = LEGACY_DISPLAY_NAMES[legacyId] || oldName;

    const profile: UserProfile = {
      id: legacyId,
      googleId: '', // no Google account yet
      displayName,
      username,
      avatarUrl: null,
      email: '',
      type: 'legacy',
      claimed: false,
      createdAt: new Date().toISOString(),
      friends: LEGACY_IDS.filter(id => id !== legacyId),
      groups: ['grp_og' as GroupId],
    };

    await redis.set(`user:${legacyId}`, JSON.stringify(profile));
    await redis.set(`user:username:${username.toLowerCase()}`, legacyId);
    await redis.sadd(`user:groups:${legacyId}`, 'grp_og');
    console.log(`   Created ${legacyId} (${displayName} → @${username})`);
  }
  console.log();

  // 3. Create OG group
  console.log('3. Creating AHA GGs OG group...');
  const ogGroup: Group = {
    id: 'grp_og' as GroupId,
    name: 'AHA GGs OG',
    createdBy: 'legacy_james' as UserId,
    admins: [...LEGACY_IDS],
    members: [...LEGACY_IDS],
    settings: { revealMode: 'all_submitted' },
    isOriginal: true,
    createdAt: new Date().toISOString(),
  };
  await redis.set('group:grp_og', JSON.stringify(ogGroup));
  console.log('   Created grp_og with all 3 legacy members.\n');

  // 4. Re-key scores
  if (gamedata?.days) {
    console.log('4. Re-keying scores...');
    let scoreCount = 0;

    for (const [dateKey, day] of Object.entries(gamedata.days)) {
      for (const oldName of OLD_PLAYERS) {
        const pd = day[oldName];
        if (pd?.submitted) {
          const legacyId = LEGACY_TO_ID[oldName];
          const dailyScore: DailyScore = {
            userId: legacyId,
            date: dateKey,
            rounds: pd.rounds,
            submitted: true,
            submittedAt: new Date().toISOString(), // approximate
          };

          await redis.set(`scores:${legacyId}:${dateKey}`, JSON.stringify(dailyScore));
          await redis.sadd(`submissions:${dateKey}`, legacyId);
          await redis.sadd(`user:scores:dates:${legacyId}`, dateKey);
          scoreCount++;
        }
      }
    }
    console.log(`   Migrated ${scoreCount} individual score records.\n`);
  } else {
    console.log('4. No scores to migrate.\n');
  }

  // 5. Set up friend relationships
  console.log('5. Setting up friend relationships...');
  for (let i = 0; i < LEGACY_IDS.length; i++) {
    for (let j = i + 1; j < LEGACY_IDS.length; j++) {
      await redis.sadd(`friends:${LEGACY_IDS[i]}`, LEGACY_IDS[j]);
      await redis.sadd(`friends:${LEGACY_IDS[j]}`, LEGACY_IDS[i]);
    }
  }
  console.log('   All 3 legacy users are friends.\n');

  // 6. Generate claim codes
  console.log('6. Generating claim codes...');
  const claimCodes: Record<string, string> = {};

  for (const oldName of OLD_PLAYERS) {
    // Use env var if provided, otherwise generate random
    const envKey = `CLAIM_CODE_${oldName.toUpperCase()}`;
    const code = process.env[envKey] || generateClaimCode();
    claimCodes[oldName] = code;

    const claimCode: ClaimCode = {
      code,
      legacyId: LEGACY_TO_ID[oldName],
      legacyUsername: oldName,
      claimed: false,
      claimedBy: null,
      claimedAt: null,
    };

    await redis.set(`claim:${code}`, JSON.stringify(claimCode));
    console.log(`   ${oldName}: ${code}`);
  }

  // Add unclaimed legacy users
  for (const legacyId of LEGACY_IDS) {
    await redis.sadd('legacy:unclaimed', legacyId);
  }
  console.log();

  // 7. Populate reserved usernames
  console.log('7. Populating reserved usernames...');
  const reserved = Array.from(RESERVED_USERNAMES);
  for (const name of reserved) {
    await redis.sadd('reserved:usernames', name);
  }
  console.log(`   Added ${reserved.length} reserved usernames.\n`);

  // 8. Mark migration complete
  console.log('8. Marking migration complete...');
  await redis.set('migration:v2:complete', 'true');
  console.log('   Done!\n');

  // Summary
  console.log('='.repeat(50));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(50));
  console.log('\nClaim codes (give these to your friends):');
  console.log(`  James → jimbo:    ${claimCodes.james}`);
  console.log(`  Tyler → tbone:    ${claimCodes.tyler}`);
  console.log(`  David → thewizard: ${claimCodes.david}`);
  console.log('\nOld gamedata key preserved as backup (not deleted).');
  console.log('Run the app to verify everything works.\n');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
