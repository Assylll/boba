import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import {
  createInitialPersistedState,
  normalizePersistedState,
  PersistedStoreState,
} from "@/lib/pos-state";

const STATE_STORAGE = (process.env.STATE_STORAGE ?? "").toLowerCase();
const REDIS_REST_URL =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const HAS_UPSTASH_ENV = Boolean(
  REDIS_REST_URL && REDIS_REST_TOKEN
);
const USE_REDIS =
  (STATE_STORAGE === "redis" && HAS_UPSTASH_ENV) ||
  (STATE_STORAGE !== "redis" && STATE_STORAGE !== "file" && HAS_UPSTASH_ENV);
const STATE_REDIS_KEY =
  process.env.STATE_REDIS_KEY?.trim() || "boba-pos:state:global";

const STATE_DATA_DIR =
  process.env.STATE_DATA_DIR?.trim() ||
  (process.env.VERCEL ? "/tmp/boba-pos" : path.join(process.cwd(), "data"));
const STATE_FILE = path.join(STATE_DATA_DIR, "state.json");

let updateQueue: Promise<unknown> = Promise.resolve();
let redisClient: Redis | null = null;
let hasWarnedMissingRedisEnv = false;

function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) {
    throw new Error(
      "Missing Redis env vars. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL + KV_REST_API_TOKEN."
    );
  }

  redisClient = new Redis({
    url: REDIS_REST_URL,
    token: REDIS_REST_TOKEN,
  });
  return redisClient;
}

function shouldWarnMissingRedisEnv(): boolean {
  return STATE_STORAGE === "redis" && !HAS_UPSTASH_ENV && !hasWarnedMissingRedisEnv;
}

async function ensureStateFile(): Promise<void> {
  try {
    await fs.access(STATE_FILE);
  } catch {
    await fs.mkdir(STATE_DATA_DIR, { recursive: true });
    const initial = createInitialPersistedState();
    await fs.writeFile(STATE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStateFromFile(): Promise<PersistedStoreState> {
  await ensureStateFile();
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedStoreState>;
    return normalizePersistedState(parsed);
  } catch {
    const initial = createInitialPersistedState();
    await writeStateToFile(initial);
    return initial;
  }
}

async function writeStateToFile(state: PersistedStoreState): Promise<void> {
  await fs.mkdir(STATE_DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function parseRedisState(
  value: PersistedStoreState | Partial<PersistedStoreState> | string
): PersistedStoreState {
  if (typeof value === "string") {
    try {
      return normalizePersistedState(
        JSON.parse(value) as Partial<PersistedStoreState>
      );
    } catch {
      return createInitialPersistedState();
    }
  }

  return normalizePersistedState(value as Partial<PersistedStoreState>);
}

async function readStateFromRedis(): Promise<PersistedStoreState> {
  const redis = getRedisClient();
  const value = await redis.get<Partial<PersistedStoreState> | string>(STATE_REDIS_KEY);

  if (!value) {
    const initial = createInitialPersistedState();
    await redis.set(STATE_REDIS_KEY, initial);
    return initial;
  }

  return parseRedisState(value);
}

async function writeStateToRedis(state: PersistedStoreState): Promise<void> {
  const redis = getRedisClient();
  await redis.set(STATE_REDIS_KEY, state);
}

function logRedisFallback(error: unknown): void {
  console.error("Redis state storage failed. Falling back to file storage.", error);
}

export async function readState(): Promise<PersistedStoreState> {
  if (shouldWarnMissingRedisEnv()) {
    hasWarnedMissingRedisEnv = true;
    console.error(
      "STATE_STORAGE=redis is configured, but Redis env vars are missing. Falling back to file storage."
    );
  }

  if (!USE_REDIS) {
    return readStateFromFile();
  }

  try {
    return await readStateFromRedis();
  } catch (error) {
    logRedisFallback(error);
    return readStateFromFile();
  }
}

export async function writeState(state: PersistedStoreState): Promise<void> {
  if (shouldWarnMissingRedisEnv()) {
    hasWarnedMissingRedisEnv = true;
    console.error(
      "STATE_STORAGE=redis is configured, but Redis env vars are missing. Falling back to file storage."
    );
  }

  if (!USE_REDIS) {
    await writeStateToFile(state);
    return;
  }

  try {
    await writeStateToRedis(state);
  } catch (error) {
    logRedisFallback(error);
    await writeStateToFile(state);
  }
}

export async function updateState(
  mutator: (current: PersistedStoreState) => PersistedStoreState | Promise<PersistedStoreState>
): Promise<PersistedStoreState> {
  if (shouldWarnMissingRedisEnv()) {
    hasWarnedMissingRedisEnv = true;
    console.error(
      "STATE_STORAGE=redis is configured, but Redis env vars are missing. Falling back to file storage."
    );
  }

  const task = async () => {
    if (!USE_REDIS) {
      const current = await readStateFromFile();
      const next = normalizePersistedState(await mutator(current));
      await writeStateToFile(next);
      return next;
    }

    try {
      const current = await readStateFromRedis();
      const next = normalizePersistedState(await mutator(current));
      await writeStateToRedis(next);
      return next;
    } catch (error) {
      logRedisFallback(error);
      const current = await readStateFromFile();
      const next = normalizePersistedState(await mutator(current));
      await writeStateToFile(next);
      return next;
    }
  };

  const result = updateQueue.then(task, task);
  updateQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
