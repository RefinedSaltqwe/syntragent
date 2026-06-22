import { Inngest } from "inngest";

/**
 * Creates the Inngest client.
 *
 * Think of this as the identity of your application
 * inside Inngest Cloud.
 *
 * Inngest uses this ID to:
 * - Register functions
 * - Route events
 * - Manage cron jobs
 * - Handle retries
 * - Display runs in the dashboard
 *
 * This does NOT create a server.
 * This simply configures your Inngest app.
 */
export const inngest = new Inngest({
  id: "syntragent-ai-social-scheduling",
});
