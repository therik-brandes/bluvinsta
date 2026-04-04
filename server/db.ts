import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, posts, webhookLogs, Post, InsertPost, WebhookLog, InsertWebhookLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all posts for a user
 */
export async function getUserPosts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(posts.scheduledDate);
}

/**
 * Get a single post by ID
 */
export async function getPostById(postId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (result.length === 0) return undefined;
  if (result[0].userId !== userId) return undefined; // Verify ownership
  return result[0];
}

/**
 * Create a new post
 */
export async function createPost(post: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(post);
  return result;
}

/**
 * Update a post
 */
export async function updatePost(postId: number, userId: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verify ownership
  const existing = await getPostById(postId, userId);
  if (!existing) throw new Error("Post not found or unauthorized");
  await db.update(posts).set(data).where(eq(posts.id, postId));
}

/**
 * Delete a post
 */
export async function deletePost(postId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verify ownership
  const existing = await getPostById(postId, userId);
  if (!existing) throw new Error("Post not found or unauthorized");
  await db.delete(posts).where(eq(posts.id, postId));
}

/**
 * Log webhook call
 */
export async function logWebhookCall(log: InsertWebhookLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log webhook: database not available");
    return;
  }
  await db.insert(webhookLogs).values(log);
}

/**
 * Get webhook logs for a user
 */
export async function getUserWebhookLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookLogs).where(eq(webhookLogs.userId, userId)).orderBy(webhookLogs.sentAt).limit(limit);
}


