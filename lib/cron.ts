// Background cron jobs for feed updates
import cron from "node-cron";
import { feedUpdater } from "./services/feedUpdater";

let isStarted = false;

export function startCronJobs() {
  if (isStarted) {
    console.log("⚠️ Cron jobs already started");
    return;
  }

  console.log("⏰ Starting cron jobs...");
  feedUpdater.start();
  isStarted = true;
}

// Auto-start in production
if (process.env.NODE_ENV === "production") {
  startCronJobs();
}
