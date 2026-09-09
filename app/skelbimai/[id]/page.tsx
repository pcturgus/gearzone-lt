import type { Metadata } from "next";
import { supabase } from "../../../lib/supabase";
import SkelbimoDetalusClient from "./SkelbimoDetalusClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabase
    .from("products")
    .select("title, description, price, category, city")
    .eq("id", id)
    .single();
  if (!product) {
    return {
      title: "Skelbimas nerastas | PCturgus.lt",
    };
  }

  const title = `${product.title} – ${product.price} € | PCturgus.lt`;
  const description = product.description
    ? product.description.slice(0, 155)
    : `${product.title} – ${product.category} skelbimas ${product.city} mieste. Pirk ir parduok PC komponentus PCturgus.lt platformoje.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default function Page() {
  return <SkelbimoDetalusClient />;
}
