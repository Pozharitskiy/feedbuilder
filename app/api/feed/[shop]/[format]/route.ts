import { NextRequest, NextResponse } from "next/server";
import { ShopifyClient } from "@/lib/services/shopifyClient";
import { FeedBuilder } from "@/lib/services/feedBuilder";
import { feedCacheStorage } from "@/lib/db";
import { sessionStorage } from "@/lib/shopify";
import {
  FeedFormat,
  IMPLEMENTED_FORMATS,
  isImplemented,
} from "@/lib/types/feed";
import { billingService } from "@/lib/services/billingService";
import { isPlanAllowed, PLANS } from "@/lib/types/billing";

export async function GET(
  request: NextRequest,
  { params }: { params: { shop: string; format: string } }
) {
  try {
    const { shop, format } = params;
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    console.log(
      `🔨 Feed request: ${format} for ${shop}${
        forceRefresh ? " (force refresh)" : ""
      }`
    );

    // Validate format
    if (!isImplemented(format)) {
      return NextResponse.json(
        {
          error: "Invalid or not yet implemented format",
          message: `Currently supported formats: ${IMPLEMENTED_FORMATS.join(", ")}`,
          requestedFormat: format,
        },
        { status: 400 }
      );
    }

    // Check that shop has installed the app
    let session = await sessionStorage.loadSession(`offline_${shop}`);

    if (!session) {
      console.log(`⚠️ No offline session for ${shop}, trying online`);
      session = await sessionStorage.loadSession(`online_${shop}`);
    }

    if (!session) {
      return NextResponse.json(
        {
          error: "Shop not found",
          message: "This shop has not installed the app yet",
        },
        { status: 404 }
      );
    }

    // 💰 BILLING: Check subscription and plan limits
    const subscription = await billingService.getSubscription(shop);
    if (!subscription) {
      return NextResponse.json(
        {
          error: "Subscription not found",
          message: "Please contact support",
        },
        { status: 404 }
      );
    }

    const client = new ShopifyClient(shop, session.accessToken!);
    const products = await client.getAllProducts();
    const productsCount = products.length;

    const planCheck = isPlanAllowed(
      subscription.planName,
      format,
      productsCount
    );

    if (!planCheck.allowed) {
      return NextResponse.json(
        {
          error: "Plan limit exceeded",
          message: planCheck.reason,
          currentPlan: subscription.planName,
          upgradeUrl: `/billing/pricing?shop=${shop}`,
          details: {
            format,
            productsCount,
            maxProducts: PLANS[subscription.planName].maxProducts,
          },
        },
        { status: 403 }
      );
    }

    // Check cache (if not force refresh)
    if (!forceRefresh) {
      const cached = await feedCacheStorage.getCache(shop, format);
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.created_at).getTime();
        console.log(
          `✅ Serving cached ${format} feed for ${shop} (age: ${Math.round(
            cacheAge / 1000 / 60
          )} min)`
        );

        // Set correct content-type
        const csvFormats = ["ceneo", "idealo", "bol", "prisjakt", "csv"];
        const contentType = csvFormats.includes(format)
          ? "text/csv"
          : "application/xml";

        return new NextResponse(cached.content, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=21600", // 6 hours
            "X-Products-Count": cached.products_count.toString(),
            "X-Cache": "HIT",
            "X-Generated-At": new Date(cached.created_at).toISOString(),
          },
        });
      }
    }

    console.log(`🔧 Generating fresh ${format} feed for ${shop}`);

    // Generate feed
    const builder = new FeedBuilder({
      format: format as FeedFormat,
      shop,
      title: `${shop} Product Feed`,
      currency: "USD",
      filterByAvailability: searchParams.get("available") === "true",
      filterByStatus: true,
      includeVariants: true,
    });

    const result = await builder.build();

    // Save to cache
    await feedCacheStorage.saveCache(
      shop,
      format,
      result.content,
      result.variantsCount
    );

    console.log(
      `✅ Feed generated and cached: ${result.productsCount} products, ${result.variantsCount} variants`
    );

    // Set correct content-type
    const csvFormats = ["ceneo", "idealo", "bol", "prisjakt", "csv"];
    const contentType = csvFormats.includes(format)
      ? "text/csv"
      : "application/xml";

    return new NextResponse(result.content, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=21600", // 6 hours
        "X-Products-Count": result.productsCount.toString(),
        "X-Variants-Count": result.variantsCount.toString(),
        "X-Cache": "MISS",
        "X-Generated-At": new Date(result.generatedAt).toISOString(),
      },
    });
  } catch (error: any) {
    console.error("❌ Feed generation error:", error);
    return NextResponse.json(
      {
        error: "Feed generation failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
