import { createClient } from "@supabase/supabase-js";
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables");
}
export const supabase = createClient(supabaseUrl, supabaseKey);
console.log("✅ Supabase client initialized:", {
    url: supabaseUrl,
    hasKey: !!supabaseKey,
});
// Initialize database tables
export async function initDatabase() {
    try {
        console.log("🔍 Checking database tables...");
        // Create sessions table
        const { error: sessionsError } = await supabase.rpc("create_sessions_table");
        if (sessionsError && !sessionsError.message.includes("already exists")) {
            console.warn("⚠️ Sessions table check:", sessionsError.message);
        }
        // Create feed_cache table
        const { error: feedError } = await supabase.rpc("create_feed_cache_table");
        if (feedError && !feedError.message.includes("already exists")) {
            console.warn("⚠️ Feed cache table check:", feedError.message);
        }
        // Create subscriptions table
        const { error: subsError } = await supabase.rpc("create_subscriptions_table");
        if (subsError && !subsError.message.includes("already exists")) {
            console.warn("⚠️ Subscriptions table check:", subsError.message);
        }
        console.log("✅ Database tables initialized");
    }
    catch (error) {
        console.error("❌ Error initializing database:", error);
    }
}
// Custom session storage for Shopify
export const customSessionStorage = {
    loadSession: async (sessionId) => {
        try {
            console.log(`📦 Loading session: ${sessionId}`);
            const { data, error } = await supabase
                .from("sessions")
                .select("*")
                .eq("id", sessionId)
                .single();
            if (error) {
                if (error.code === "PGRST116") {
                    // Not found
                    console.warn(`⚠️ Session not found: ${sessionId}`);
                    return null;
                }
                console.error(`❌ Error loading session ${sessionId}:`, error);
                return null;
            }
            if (!data || !data.data) {
                console.warn(`⚠️ Invalid session data for ${sessionId}`);
                return null;
            }
            const sessionData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
            console.log(`✅ Session loaded: ${sessionId} for shop ${sessionData.shop}`);
            return sessionData;
        }
        catch (error) {
            console.error(`❌ Error loading session ${sessionId}:`, error);
            return null;
        }
    },
    storeSession: async (session) => {
        try {
            console.log(`💾 Storing session: ${session.id} for shop: ${session.shop}`);
            if (!session || !session.id || !session.shop) {
                console.error(`❌ Invalid session object:`, session);
                return false;
            }
            const sessionData = typeof session === "string" ? session : JSON.stringify(session);
            const { error } = await supabase.from("sessions").upsert({
                id: session.id,
                shop: session.shop,
                data: sessionData,
                updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
            if (error) {
                console.error(`❌ Failed to store session:`, error);
                return false;
            }
            console.log(`✅ Session stored: ${session.id}`);
            // Verify
            const verify = await customSessionStorage.loadSession(session.id);
            if (verify) {
                console.log(`✅ Session verified in DB: ${session.id}`);
                return true;
            }
            else {
                console.error(`❌ Session verification FAILED: ${session.id}`);
                return false;
            }
        }
        catch (error) {
            console.error(`❌ Failed to store session:`, error);
            return false;
        }
    },
    deleteSession: async (sessionId) => {
        try {
            console.log(`🗑️ Deleting session: ${sessionId}`);
            const { error } = await supabase
                .from("sessions")
                .delete()
                .eq("id", sessionId);
            if (error) {
                console.error(`❌ Failed to delete session:`, error);
                return false;
            }
            console.log(`✅ Session deleted: ${sessionId}`);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to delete session:`, error);
            return false;
        }
    },
    findSessions: async (shopIds) => {
        try {
            let query = supabase.from("sessions").select("data");
            if (shopIds.length > 0) {
                query = query.in("shop", shopIds);
            }
            const { data, error } = await query;
            if (error) {
                console.error("❌ Error finding sessions:", error);
                return [];
            }
            return (data
                ?.map((row) => typeof row.data === "string" ? JSON.parse(row.data) : row.data)
                .filter(Boolean) || []);
        }
        catch (error) {
            console.error("❌ Error finding sessions:", error);
            return [];
        }
    },
    deleteSessions: async (sessionIds) => {
        try {
            const { error } = await supabase
                .from("sessions")
                .delete()
                .in("id", sessionIds);
            if (error) {
                console.error(`❌ Failed to delete sessions:`, error);
                return false;
            }
            console.log(`✅ Deleted ${sessionIds.length} sessions`);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to delete sessions:`, error);
            return false;
        }
    },
    findSessionsByShop: async (shop) => {
        try {
            const { data, error } = await supabase
                .from("sessions")
                .select("data")
                .eq("shop", shop);
            if (error) {
                console.error("❌ Error finding sessions by shop:", error);
                return [];
            }
            return (data
                ?.map((row) => typeof row.data === "string" ? JSON.parse(row.data) : row.data)
                .filter(Boolean) || []);
        }
        catch (error) {
            console.error("❌ Error finding sessions by shop:", error);
            return [];
        }
    },
};
// Feed cache storage utilities
export const feedCacheStorage = {
    getCache: async (shop, format, maxAge = 6 * 60 * 60 * 1000) => {
        const maxAgeDate = new Date(Date.now() - maxAge).toISOString();
        const { data, error } = await supabase
            .from("feed_cache")
            .select("*")
            .eq("shop", shop)
            .eq("format", format)
            .gt("created_at", maxAgeDate)
            .single();
        if (error) {
            if (error.code === "PGRST116") {
                // Not found
                return null;
            }
            console.error("Error getting cache:", error);
            return null;
        }
        return data;
    },
    saveCache: async (shop, format, content, productsCount) => {
        const { error } = await supabase.from("feed_cache").upsert({
            shop,
            format,
            content,
            products_count: productsCount,
            created_at: new Date().toISOString(),
        }, { onConflict: "shop,format" });
        if (error) {
            console.error("Error saving cache:", error);
        }
    },
    invalidateCache: async (shop) => {
        const { error } = await supabase.from("feed_cache").delete().eq("shop", shop);
        if (error) {
            console.error("Error invalidating cache:", error);
        }
        else {
            console.log(`🗑️ Invalidated feed cache for ${shop}`);
        }
    },
    getAllCachedFeeds: async (shop) => {
        const { data, error } = await supabase
            .from("feed_cache")
            .select("*")
            .eq("shop", shop)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Error getting cached feeds:", error);
            return [];
        }
        return data || [];
    },
};
