import { create } from "xmlbuilder2";

type Variant = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  inventoryQuantity: number;
  weight: number | null;
  weightUnit: string | null;
};

type Product = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  description: string;
  image?: string | null;
  variants: Variant[];
};

export function flattenProducts(payload: any): Product[] {
  const edges = payload?.edges ?? [];
  return edges.map((e: any) => {
    const n = e.node;
    const image = n.images?.edges?.[0]?.node?.url ?? null;
    const variants = (n.variants?.edges ?? []).map((ve: any) => ve.node);
    return {
      id: n.id,
      title: n.title,
      handle: n.handle,
      vendor: n.vendor,
      description: n.description ?? "",
      image,
      variants,
    };
  });
}

function computeUnitPrice(
  price: number,
  weight?: number | null,
  weightUnit?: string | null
) {
  if (!weight || weight <= 0) return null;
  const unit = (weightUnit || "KG").toLowerCase();
  // нормализуем к кг
  const kg = unit === "G" ? weight / 1000 : unit === "KG" ? weight : null;
  if (!kg || kg <= 0) return null;
  return price / kg;
}

export function buildXmlFeed(shopDomain: string, products: Product[]) {
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("offers");

  for (const p of products) {
    for (const v of p.variants) {
      const price = Number(v.price);
      const unitPrice = computeUnitPrice(
        price,
        v.weight,
        v.weightUnit || undefined
      );

      const o = root.ele("o", {
        id: v.id,
        price: price.toFixed(2),
        stock: Math.max(0, v.inventoryQuantity),
      });
      o.ele("name").txt(
        p.title + (v.title && v.title !== "Default Title" ? ` — ${v.title}` : "")
      );
      if (p.image) o.ele("img").txt(p.image);
      o.ele("url").txt(`https://${shopDomain}/products/${p.handle}`);
      o.ele("desc").txt((p.description || "").slice(0, 5000));
      o.ele("brand").txt(p.vendor || "");
      if (v.sku) o.ele("sku").txt(v.sku);
      if (v.barcode) o.ele("gtin").txt(v.barcode);
      if (unitPrice != null) {
        o.ele("unit_price").txt(unitPrice.toFixed(2));
        o.ele("unit_measure").txt("kg");
      }
    }
  }

  return root.end({ prettyPrint: true });
}

