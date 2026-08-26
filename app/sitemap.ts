import { supabase } from "../lib/supabase";

export default async function sitemap() {
  const baseUrl = "https://pcturgus.lt";

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${baseUrl}/taisykles`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/privatumo-politika`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/kontaktai`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/prisijungti`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${baseUrl}/registracija`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
  ];

  const { data: products } = await supabase
    .from("products")
    .select("id, created_at")
    .eq("status", "aktyvus");

  const productPages = (products || []).map((p) => ({
    url: `${baseUrl}/skelbimai/${p.id}`,
    lastModified: new Date(p.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages];
}
