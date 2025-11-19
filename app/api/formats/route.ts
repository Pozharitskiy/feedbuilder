import { NextResponse } from "next/server";
import {
  IMPLEMENTED_FORMATS,
  FEED_CATEGORIES,
} from "@/lib/types/feed";

export async function GET() {
  return NextResponse.json({
    totalFormats: Object.values(FEED_CATEGORIES).flat().length,
    implementedFormats: [...IMPLEMENTED_FORMATS],
    implementedCount: IMPLEMENTED_FORMATS.length,
    categories: FEED_CATEGORIES,
    message: "Use GET /api/feed/:shop/:format to generate a feed",
  });
}
