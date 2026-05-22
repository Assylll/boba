import { promises as fs } from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import {
  createInitialPersistedState,
  normalizePersistedState,
  PersistedStoreState,
} from "@/lib/pos-state";
import { prisma } from "@/server/prisma";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const STATE_ROW_KEY = "global";
const POSTGRES_LOCK_KEY = 91342001;
const STATE_STORAGE = (process.env.STATE_STORAGE ?? "").toLowerCase();
const USE_POSTGRES =
  STATE_STORAGE === "postgres" ||
  (STATE_STORAGE !== "file" && Boolean(process.env.DATABASE_URL));

let updateQueue: Promise<unknown> = Promise.resolve();

function toJsonState(state: PersistedStoreState): Prisma.InputJsonValue {
  return state as unknown as Prisma.InputJsonValue;
}

async function ensureStateFile(): Promise<void> {
  try {
    await fs.access(STATE_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
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
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function readStateFromPostgres(): Promise<PersistedStoreState> {
  const row = await prisma.appState.findUnique({
    where: { key: STATE_ROW_KEY },
  });

  if (!row) {
    const initial = createInitialPersistedState();
    await prisma.appState.create({
      data: { key: STATE_ROW_KEY, data: toJsonState(initial) },
    });
    return initial;
  }

  return normalizePersistedState(row.data as Partial<PersistedStoreState>);
}

async function writeStateToPostgres(state: PersistedStoreState): Promise<void> {
  await prisma.appState.upsert({
    where: { key: STATE_ROW_KEY },
    create: { key: STATE_ROW_KEY, data: toJsonState(state) },
    update: { data: toJsonState(state) },
  });
}

async function updateStateInPostgres(
  mutator: (current: PersistedStoreState) => PersistedStoreState | Promise<PersistedStoreState>
): Promise<PersistedStoreState> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${POSTGRES_LOCK_KEY})`;

    const row = await tx.appState.findUnique({
      where: { key: STATE_ROW_KEY },
    });

    const current = row
      ? normalizePersistedState(row.data as Partial<PersistedStoreState>)
      : createInitialPersistedState();
    const next = normalizePersistedState(await mutator(current));

    await tx.appState.upsert({
      where: { key: STATE_ROW_KEY },
      create: { key: STATE_ROW_KEY, data: toJsonState(next) },
      update: { data: toJsonState(next) },
    });

    return next;
  });
}

function logPostgresFallback(error: unknown): void {
  console.error(
    "PostgreSQL state storage failed. Falling back to file storage.",
    error
  );
}

export async function readState(): Promise<PersistedStoreState> {
  if (!USE_POSTGRES) {
    return readStateFromFile();
  }

  try {
    return await readStateFromPostgres();
  } catch (error) {
    if (STATE_STORAGE === "postgres") {
      throw error;
    }
    logPostgresFallback(error);
    return readStateFromFile();
  }
}

export async function writeState(state: PersistedStoreState): Promise<void> {
  if (!USE_POSTGRES) {
    await writeStateToFile(state);
    return;
  }

  try {
    await writeStateToPostgres(state);
  } catch (error) {
    if (STATE_STORAGE === "postgres") {
      throw error;
    }
    logPostgresFallback(error);
    await writeStateToFile(state);
  }
}

export async function updateState(
  mutator: (current: PersistedStoreState) => PersistedStoreState | Promise<PersistedStoreState>
): Promise<PersistedStoreState> {
  const task = async () => {
    if (!USE_POSTGRES) {
      const current = await readStateFromFile();
      const next = normalizePersistedState(await mutator(current));
      await writeStateToFile(next);
      return next;
    }

    try {
      return await updateStateInPostgres(mutator);
    } catch (error) {
      if (STATE_STORAGE === "postgres") {
        throw error;
      }
      logPostgresFallback(error);
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
