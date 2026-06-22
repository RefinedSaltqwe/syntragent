import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  publishScheduledPost,
  publishScheduledPostsCron,
} from "@/inngest/functions/publish-scheduled-posts";

/**
 * Creates the /api/inngest endpoint.
 *
 * Inngest Cloud sends HTTP requests to this endpoint whenever:
 * - A cron trigger fires
 * - An event is sent
 * - A function needs to resume
 * - A retry is needed
 *
 * This endpoint lives on your deployed backend (Vercel serverless function),
 * not inside the user's browser.
 *
 * Browser closed ❌
 * Website tab closed ❌
 * Backend endpoint running on Vercel ✅
 */
export const { GET, POST, PUT } = serve({
  client: inngest,

  /**
   * Registers all Inngest functions that belong to this application.
   *
   * publishScheduledPostsCron
   * - Runs every 10 minutes
   * - Finds due posts
   *
   * publishScheduledPost
   * - Triggered by post/publish.requested event
   * - Publishes to social providers
   */
  functions: [publishScheduledPostsCron, publishScheduledPost],
});
