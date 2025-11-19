export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize database
    const { initDatabase } = await import("./lib/db");
    const { initBillingDb } = await import("./lib/services/billingService");
    
    await initDatabase();
    await initBillingDb();
    
    // Start background cron jobs
    const { startCronJobs } = await import("./lib/cron");
    startCronJobs();
    
    console.log("✅ FeedBuilderly initialization complete");
  }
}
