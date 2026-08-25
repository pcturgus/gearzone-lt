"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import UserBadge, { LEVELS } from "./components/UserBadge";
import LiveFeed from "./components/LiveFeed";

const categories = [
  { icon: "🎮", name: "Vaizdo plokštės", image: "vaizdo-plokstes.png" },
  { icon: "🧠", name: "Procesoriai", image: "procesoriai.png" },
  { icon: "🔌", name: "Pagrindinės plokštės", image: "pagrindines-plokstes.png" },
  { icon: "🧮", name: "Operatyvioji atmintis", image: "ram.png" },
  { icon: "💾", name: "SSD / HDD", image: "ssd-hdd.png" },
  { icon: "⚡", name: "Maitinimo blokai", image: "maitinimo-blokai.png" },
  { icon: "📦", name: "Korpusai", image: "korpusai.png" },
  { icon: "🧊", name: "Aušintuvai", image: "ausintuvai.png" },
  { icon: "🖱️", name: "Pelės", image: "peles.png" },
  { icon: "⌨️", name: "Klaviatūros", image: "klaviaturos.png" },
  { icon: "🟪", name: "Pelių kilimėliai", image: "peliu-kilimeliai.png" },
  { icon: "🎧", name: "Ausinės / mikrofonai", image: "ausines-mikrofonai.png" },
  { icon: "🖥️", name: "Monitoriai", image: "monitoriai.png" },
  { icon: "🪑", name: "Kėdės ir stalai", image: "kedes-stalai.png" },
  { icon: "📡", name: "Tinklo įranga", image: "tinklo-iranga.png" },
];
const categoryIcons: Record<string, string> = Object.fromEntries(categories.map((c) => [c.name, c.icon]));
const ONLINE_THRESHOLD_MS = 60 * 1000;

type Seller = { username: string | null; sales_count: number | null } | null;

type Product = {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  category: string;
  condition: string;
  city: string;
  description: string | null;
  photos: string[] | null;
  seller_id: string | null;
  created_at: string;
  status: string;
  views_count: number;
  seller: Seller;
};

type NotificationRow = {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
};

type ConversationRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product: { id: string; title: string; price: number; photos: string[] | null } | null;
  otherId: string;
  otherUsername: string;
  otherSales: number;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  read_at: string | null;
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ką tik";
  if (mins < 60) return `prieš ${mins} min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `prieš ${hours} val.`;
  return `prieš ${Math.floor(hours / 24)} d.`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "laukia_patvirtinimo") {
    return (
      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full z-10">
        LAUKIA PATVIRTINIMO
      </span>
    );
  }
  if (status === "rezervuota") {
    return (
      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full z-10">
        REZERVUOTA
      </span>
    );
  }
  if (status === "parduota") {
    return (
      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-[#6B7280] text-white px-2 py-0.5 rounded-full z-10">
        PARDUOTA
      </span>
    );
  }
  return null;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });
}

function CategoryIcon({ c, size = "w-5 h-5" }: { c: { image: string; icon: string; name: string }; size?: string }) {
  return (
    <span className={`${size} inline-flex items-center justify-center shrink-0 rounded-md overflow-hidden bg-[#F6F7FB]`}>
      <img
        src={`/categories/${c.image}`}
        alt={c.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling!.classList.remove("hidden");
        }}
      />
      <span className="text-sm hidden">{c.icon}</span>
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceFilter, setPriceFilter] = useState("any");
  const [customMinPrice, setCustomMinPrice] = useState("");
  const [customMaxPrice, setCustomMaxPrice] = useState("");
  const [conditionFilter, setConditionFilter] = useState("any");
  const [cityFilter, setCityFilter] = useState("visi");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [levelsModalOpen, setLevelsModalOpen] = useState(false);

  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [starting, setStarting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // MĖGSTAMI
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesPanelOpen, setFavoritesPanelOpen] = useState(false);

  // PRANEŠIMAI
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  // REDAGAVIMAS
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editOldPrice, setEditOldPrice] = useState("");
  const [editStatus, setEditStatus] = useState("aktyvus");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // MANO SKELBIMAI
  const [myListingsOpen, setMyListingsOpen] = useState(false);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [mlEditingPriceId, setMlEditingPriceId] = useState<string | null>(null);
  const [mlEditPriceValue, setMlEditPriceValue] = useState("");
  const [mlEditPriceError, setMlEditPriceError] = useState("");
  const [mlEditPriceSaving, setMlEditPriceSaving] = useState(false);
  const [mlDeletingId, setMlDeletingId] = useState<string | null>(null);

  // POKALBIŲ SKYDELIS
  const [chatOpen, setChatOpen] = useState(false);
  const [chatView, setChatView] = useState<"list" | "thread">("list");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [activeConv, setActiveConv] = useState<ConversationRow | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadText, setThreadText] = useState("");
  const [threadSending, setThreadSending] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [myUsername, setMyUsername] = useState("Tu");
  const [mySales, setMySales] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from("products")
        .select(
          "id, title, price, old_price, category, condition, city, description, photos, seller_id, created_at, status, views_count, seller:profiles(username, sales_count)"
        )
        .order("created_at", { ascending: false });
      const normalized = (data || []).map((p: any) => ({
        ...p,
        seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
      }));
      setProducts(normalized);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  async function loadUnreadCount(uid: string) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
    const convIds = (convs || []).map((c) => c.id);
    if (convIds.length === 0) {
      setUnreadCount(0);
      return;
    }
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("read", false)
      .neq("sender_id", uid);
    setUnreadCount(count || 0);
  }

  async function loadFavorites(uid: string) {
    const { data } = await supabase.from("favorites").select("product_id").eq("user_id", uid);
    setFavorites(new Set((data || []).map((f) => f.product_id)));
  }

  async function loadNotifications(uid: string) {
    const { data } = await supabase
      .from("notifications")
      .select("id, message, created_at, read")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
    setUnreadNotifCount((data || []).filter((n) => !n.read).length);
  }

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("username, sales_count, role").eq("id", user.id).single();
        setUsername(profile?.username || "Vartotojas");
        setMyUsername(profile?.username || "Tu");
        setMySales(profile?.sales_count || 0);
        loadUnreadCount(user.id);
        loadFavorites(user.id);
        loadNotifications(user.id);

        if (profile?.role === "admin") {
          setIsAdmin(true);
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .in("status", ["laukia_patvirtinimo", "laukia_istrynimo"]);
          setPendingCount(count || 0);
        } else {
          setIsAdmin(false);
          setPendingCount(0);
        }
      } else {
        setUsername(null);
        setUnreadCount(0);
        setFavorites(new Set());
        setNotifications([]);
        setUnreadNotifCount(0);
        setIsAdmin(false);
        setPendingCount(0);
      }
    }
    loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadUser());
    return () => listener.subscription.unsubscribe();
  }, []);

  // heartbeat - mano online statusas kol turiu atidarytą chat skydelį
  useEffect(() => {
    if (!currentUserId || !chatOpen) return;
    async function ping() {
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", currentUserId);
    }
    ping();
    const interval = setInterval(ping, 25000);
    return () => clearInterval(interval);
  }, [currentUserId, chatOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  async function openProduct(p: Product) {
    setSelectedPhoto(0);
    const isOwn = currentUserId && currentUserId === p.seller_id;
    console.log("openProduct:", { title: p.title, currentUserId, seller_id: p.seller_id, isOwn });
    if (!isOwn) {
      const updated = { ...p, views_count: (p.views_count || 0) + 1 };
      setSelected(updated);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, views_count: updated.views_count } : x)));
      console.log("Kviečiu increment_views su id:", p.id);
      supabase.rpc("increment_views", { listing_id: p.id }).then(({ error, data }) => {
        if (error) console.error("increment_views klaida:", error.message, error);
        else console.log("increment_views pavyko:", data);
      });
    } else {
      console.log("Praleista - tai tavo pačio skelbimas");
      setSelected(p);
    }
  }

  function prevPhoto(e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelectedPhoto((i) => (i === 0 ? selectedPhotos.length - 1 : i - 1));
  }

  function nextPhoto(e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelectedPhoto((i) => (i === selectedPhotos.length - 1 ? 0 : i + 1));
  }

  async function toggleFavorite(p: Product, e?: React.MouseEvent) {
    e?.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/prisijungti");
      return;
    }

    const isFav = favorites.has(p.id);

    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", p.id);
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    } else {
      const { error } = await supabase.from("favorites").insert({ user_id: user.id, product_id: p.id });
      if (!error) {
        setFavorites((prev) => new Set(prev).add(p.id));

        if (p.seller_id && p.seller_id !== user.id) {
          const { data: myProfile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
          await supabase.from("notifications").insert({
            user_id: p.seller_id,
            from_user_id: user.id,
            product_id: p.id,
            message: `Vartotojas ${myProfile?.username || "Vartotojas"} pamėgo jūsų skelbimą „${p.title}“`,
          });
        }
      }
    }
  }

  async function openNotifications() {
    setNotificationsPanelOpen(true);
    if (!currentUserId) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotifCount(0);
    }
  }

  function openEditModal(p: Product, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditTitle(p.title);
    setEditDescription(p.description || "");
    setEditPrice(String(p.price));
    setEditOldPrice(p.old_price ? String(p.old_price) : "");
    setEditStatus(p.status || "aktyvus");
    setEditError("");
    setEditModalOpen(true);
  }

  async function saveEdit() {
    if (!selected) return;
    setEditSaving(true);
    setEditError("");

    const newPrice = Number(editPrice);
    const priceChanged = newPrice !== selected.price;

    // kainos keitimas eina per apsaugotą funkciją su 12h limitu
    if (priceChanged) {
      const { data, error } = await supabase.rpc("update_listing_price", {
        p_product_id: selected.id,
        p_new_price: newPrice,
      });

      if (error || !data?.success) {
        setEditSaving(false);
        setEditError(data?.error || error?.message || "Nepavyko atnaujinti kainos.");
        return;
      }
    }

    // "parduota" per redagavimo langą irgi turi eiti per admin peržiūrą, ne tiesiogiai
    const finalStatus = editStatus === "parduota" ? "laukia_istrynimo" : editStatus;

    const { error: fieldsError } = await supabase
      .from("products")
      .update({
        title: editTitle,
        description: editDescription || null,
        old_price: editOldPrice ? Number(editOldPrice) : null,
        status: finalStatus,
      })
      .eq("id", selected.id);

    setEditSaving(false);

    if (fieldsError) {
      setEditError("Nepavyko išsaugoti: " + fieldsError.message);
      return;
    }

    const updated = {
      ...selected,
      title: editTitle,
      description: editDescription || null,
      price: newPrice,
      old_price: editOldPrice ? Number(editOldPrice) : null,
      status: finalStatus,
    };
    setSelected(updated);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditModalOpen(false);
  }

  async function openMyListings() {
    setMyListingsOpen(true);
    setMyListingsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/prisijungti");
      return;
    }

    const { data: mine } = await supabase
      .from("products")
      .select("id, title, price, old_price, status, photos, views_count, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    const list = mine || [];
    const ids = list.map((p) => p.id);

    let favCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: counts } = await supabase.rpc("get_favorite_counts", { product_ids: ids });
      (counts || []).forEach((c: any) => {
        favCounts[c.product_id] = Number(c.count);
      });
    }

    setMyListings(list.map((p) => ({ ...p, favCount: favCounts[p.id] || 0 })));
    setMyListingsLoading(false);
  }

  function mlStartEditPrice(p: any) {
    setMlEditingPriceId(p.id);
    setMlEditPriceValue(String(p.price));
    setMlEditPriceError("");
  }

  async function mlSaveEditPrice(p: any) {
    setMlEditPriceSaving(true);
    setMlEditPriceError("");

    const newPrice = Number(mlEditPriceValue);
    const { data, error } = await supabase.rpc("update_listing_price", {
      p_product_id: p.id,
      p_new_price: newPrice,
    });

    setMlEditPriceSaving(false);

    if (error || !data?.success) {
      setMlEditPriceError(data?.error || error?.message || "Nepavyko atnaujinti kainos.");
      return;
    }

    setMyListings((prev) => prev.map((x) => (x.id === p.id ? { ...x, price: newPrice } : x)));
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, price: newPrice } : x)));
    setMlEditingPriceId(null);
  }

  async function mlMarkAsSold(p: any) {
    if (!confirm("Skelbimas bus pateiktas administracijos peržiūrai kaip parduotas. Tęsti?")) return;
    const { error } = await supabase.from("products").update({ status: "laukia_istrynimo" }).eq("id", p.id);
    if (!error) {
      setMyListings((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "laukia_istrynimo" } : x)));
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "laukia_istrynimo" } : x)));
    }
  }

  async function mlDeleteListing(p: any) {
    if (p.photos && p.photos.length > 0) {
      const paths = p.photos
        .map((url: string) => {
          const marker = "/product-photos/";
          const idx = url.indexOf(marker);
          return idx === -1 ? null : url.substring(idx + marker.length);
        })
        .filter((x: string | null): x is string => !!x);
      if (paths.length > 0) {
        await supabase.storage.from("product-photos").remove(paths);
      }
    }

    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (!error) {
      setMyListings((prev) => prev.filter((x) => x.id !== p.id));
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    }
    setMlDeletingId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
  }

  // atidaro pokalbių sąrašą skydelyje
  async function openChatList() {
    setChatOpen(true);
    setChatView("list");
    setConversationsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/prisijungti");
      return;
    }

    const { data } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, product:products(id, title, price, photos)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const rows = (data || []) as any[];

    const enriched: ConversationRow[] = await Promise.all(
      rows.map(async (row) => {
        const otherId = row.buyer_id === user.id ? row.seller_id : row.buyer_id;
        const { data: profile } = await supabase.from("profiles").select("username, sales_count").eq("id", otherId).single();
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", row.id)
          .eq("read", false)
          .neq("sender_id", user.id);
        return {
          id: row.id,
          buyer_id: row.buyer_id,
          seller_id: row.seller_id,
          product: Array.isArray(row.product) ? row.product[0] : row.product,
          otherId,
          otherUsername: profile?.username || "Vartotojas",
          otherSales: profile?.sales_count || 0,
          unreadCount: count || 0,
        };
      })
    );

    setConversations(enriched);
    setConversationsLoading(false);
  }

  // atidaro konkretų pokalbį skydelyje (iš sąrašo arba iš "Rašyti pardavėjui")
  async function openThread(conv: ConversationRow) {
    setActiveConv(conv);
    setChatView("thread");
    setThreadLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("last_seen").eq("id", conv.otherId).single();
    if (profile?.last_seen) {
      setOtherOnline(Date.now() - new Date(profile.last_seen).getTime() < ONLINE_THRESHOLD_MS);
    } else {
      setOtherOnline(false);
    }

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, read, read_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    setThreadMessages(msgs || []);
    setThreadLoading(false);

    await supabase
      .from("messages")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conv.id)
      .neq("sender_id", user.id)
      .eq("read", false);

    loadUnreadCount(user.id);
  }

  async function handleSendThread(e: React.FormEvent) {
    e.preventDefault();
    if (!threadText.trim() || !activeConv || !currentUserId) return;

    setThreadSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: activeConv.id, sender_id: currentUserId, content: threadText.trim() })
      .select("id, sender_id, content, created_at, read, read_at")
      .single();
    setThreadSending(false);

    if (!error && data) {
      setThreadMessages((prev) => [...prev, data]);
      setThreadText("");
    }
  }

  function closeChat() {
    setChatOpen(false);
    setChatView("list");
    setActiveConv(null);
  }

  async function handleMessageSeller() {
    if (!selected || !selected.seller_id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/prisijungti");
      return;
    }

    setStarting(true);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("product_id", selected.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", selected.seller_id)
      .maybeSingle();

    let convRow = existing;

    if (!convRow) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ product_id: selected.id, buyer_id: user.id, seller_id: selected.seller_id })
        .select("id, buyer_id, seller_id")
        .single();

      if (error) {
        setStarting(false);
        alert("Nepavyko pradėti pokalbio: " + error.message);
        return;
      }
      convRow = created;
    }

    setStarting(false);

    const conv: ConversationRow = {
      id: convRow!.id,
      buyer_id: convRow!.buyer_id,
      seller_id: convRow!.seller_id,
      product: { id: selected.id, title: selected.title, price: selected.price, photos: selected.photos },
      otherId: selected.seller_id,
      otherUsername: selected.seller?.username || "Pardavėjas",
      otherSales: selected.seller?.sales_count || 0,
      unreadCount: 0,
    };

    setSelected(null);
    setChatOpen(true);
    openThread(conv);
  }

  const filtered = products
    .filter((p) => {
      const matchesCategory = !activeCategory || p.category === activeCategory;
      const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());

      let matchesPrice = true;
      if (priceFilter === "under50") matchesPrice = p.price <= 50;
      else if (priceFilter === "50-100") matchesPrice = p.price > 50 && p.price <= 100;
      else if (priceFilter === "100-250") matchesPrice = p.price > 100 && p.price <= 250;
      else if (priceFilter === "250-500") matchesPrice = p.price > 250 && p.price <= 500;
      else if (priceFilter === "500-1000") matchesPrice = p.price > 500 && p.price <= 1000;
      else if (priceFilter === "1000+") matchesPrice = p.price > 1000;
      else if (priceFilter === "custom") {
        const min = customMinPrice ? Number(customMinPrice) : 0;
        const max = customMaxPrice ? Number(customMaxPrice) : Infinity;
        matchesPrice = p.price >= min && p.price <= max;
      }

      const matchesCondition = conditionFilter === "any" || p.condition === conditionFilter;

      const matchesCity =
        cityFilter === "visi" ||
        cityFilter === "lietuva" ||
        (p.city || "").trim().toLowerCase() === cityFilter.toLowerCase();

      return matchesCategory && matchesSearch && matchesPrice && matchesCondition && matchesCity;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "cheapest") return a.price - b.price;
      if (sortBy === "expensive") return b.price - a.price;
      if (sortBy === "views") return (b.views_count || 0) - (a.views_count || 0);
      return 0;
    });

  const latest = products.slice(0, 5);
  const selectedPhotos = selected?.photos && selected.photos.length > 0 ? selected.photos : [];
  const isOwnListing = selected && currentUserId && currentUserId === selected.seller_id;
  const lastMineIndex = [...threadMessages].map((m) => m.sender_id).lastIndexOf(currentUserId || "");

  return (
    <div className="overflow-x-hidden w-full pb-16 md:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0B1220] px-4 md:px-8 py-3 md:py-3.5">
        <div className="flex items-center gap-3 md:gap-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-white w-9 h-9 flex items-center justify-center shrink-0"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex items-center gap-2 text-white font-extrabold text-base md:text-lg shrink-0">
            <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#5B4FE5] flex items-center justify-center text-sm">🖥️</span>
            GearZone<span className="text-[#8B7FFF]">.lt</span>
          </div>

          <button className="hidden md:flex items-center gap-2 text-white/90 text-sm font-semibold border border-white/15 px-4 py-2 rounded-lg">
            ☰ Kategorijos
          </button>

          <div className="hidden md:flex flex-1 max-w-2xl">
            <div className="flex items-center bg-white rounded-lg px-4 py-2.5 w-full">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ieškok komponentų, pvz. RTX 4070, Ryzen 5, 32GB RAM..."
                className="flex-1 outline-none text-sm text-[#12172B] placeholder:text-[#9CA3AF]"
              />
              <span className="text-[#9CA3AF]">🔍</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4 ml-auto">
            <Link href="/ikelti" className="hidden md:block bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-4 py-2.5 rounded-lg">
              + Įkelti skelbimą
            </Link>
            {username && (
              <button onClick={openChatList} className="hidden md:block relative text-white/80 hover:text-white text-lg">
                💬
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}
            {username && (
              <button onClick={() => setFavoritesPanelOpen(true)} className="hidden md:block relative text-white/80 hover:text-white text-lg">
                ♡
              </button>
            )}
            {username ? (
              <button onClick={openNotifications} className="relative text-white/80 hover:text-white text-lg">
                🔔
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </span>
                )}
              </button>
            ) : (
              <span className="text-white/80 text-lg">🔔</span>
            )}
            {isAdmin && (
              <Link href="/admin/moderacija" className="hidden md:block relative text-white/80 hover:text-white text-lg">
                🛡️
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </Link>
            )}

            {username ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-2 text-white/90 text-sm font-semibold">
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">👤</span>
                  <span className="hidden md:inline">{username} ▾</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-11 bg-white border border-[#E4E7EE] rounded-xl shadow-lg py-2 w-52 z-50">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        openMyListings();
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB]"
                    >
                      Mano skelbimai
                    </button>
                    <button
                      onClick={() => {
                        setLevelsModalOpen(true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB]"
                    >
                      Sužinoti daugiau apie lygius
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB]">
                      Atsijungti
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/prisijungti" className="text-white/90 text-sm font-semibold px-3 py-2 hover:text-white">
                  Prisijungti
                </Link>
                <Link href="/registracija" className="border border-white/25 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
                  Registruotis
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE PAIEŠKA - antra eilutė */}
        <div className="md:hidden mt-3">
          <div className="flex items-center bg-white rounded-lg px-4 py-2.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ieškok komponentų..."
              className="flex-1 outline-none text-sm text-[#12172B] placeholder:text-[#9CA3AF]"
            />
            <span className="text-[#9CA3AF]">🔍</span>
          </div>
        </div>
      </header>

      {/* MOBILE HAMBURGER MENU */}
      <div
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/40 z-[90] transition-opacity md:hidden ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      <div
        className={`fixed top-0 left-0 h-full w-[280px] bg-white z-[95] shadow-2xl flex flex-col transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E4E7EE]">
          <span className="text-sm font-extrabold">Meniu</span>
          <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-full hover:bg-[#F6F7FB] flex items-center justify-center text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-left px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
          >
            Kategorijos
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-left px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
          >
            Skelbimai
          </button>
          {username && (
            <>
              <button
                onClick={() => { setMobileMenuOpen(false); setFavoritesPanelOpen(true); }}
                className="w-full text-left px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
              >
                Mėgstami
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); openChatList(); }}
                className="w-full text-left px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
              >
                Žinutės
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); openNotifications(); }}
                className="w-full text-left px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
              >
                Pranešimai
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); openMyListings(); }}
                className="w-full text-left px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
              >
                Mano skelbimai
              </button>
              {isAdmin && (
                <Link
                  href="/admin/moderacija"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
                >
                  Moderacija
                </Link>
              )}
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full text-left px-3 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg mt-2"
              >
                Atsijungti
              </button>
            </>
          )}
          {!username && (
            <>
              <Link
                href="/prisijungti"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F6F7FB] rounded-lg"
              >
                Prisijungti
              </Link>
              <Link
                href="/registracija"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-3 text-sm font-bold text-[#5B4FE5] hover:bg-[#EEF0FF] rounded-lg"
              >
                Registruotis
              </Link>
            </>
          )}
        </div>
      </div>

      {/* HERO */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 py-5 md:py-8">
        <div className="bg-[#0B1220] rounded-2xl p-5 md:p-10 flex items-center justify-between overflow-hidden">
          <div className="max-w-md">
            <h1 className="text-white text-2xl md:text-4xl font-extrabold leading-tight mb-3 md:mb-4">
              Pirk. Parduok. Sutaupyk.
              <br />
              Viskas PC entuziastams.
            </h1>
            <p className="text-white/60 text-sm mb-5 md:mb-6">
              <span className="md:hidden">Lietuvos PC komponentų skelbimų platforma.</span>
              <span className="hidden md:inline">Lietuvos PC komponentų skelbimų platforma – susirask pirkėją ar pardavėją ir susisiek tiesiogiai.</span>
            </p>
            <div className="flex flex-col md:flex-row gap-3">
              <button className="w-full md:w-auto bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg">
                Naršyti skelbimus
              </button>
              <Link href="/ikelti" className="w-full md:w-auto text-center border border-white/25 text-white text-sm font-bold px-5 py-3 rounded-lg hover:bg-white/10 transition-colors">
                + Įkelti skelbimą
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center w-[280px] h-[220px] shrink-0">
            <svg viewBox="0 0 280 220" className="w-full h-full">
              <defs>
                <radialGradient id="fanGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#8B7FFF" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#5B4FE5" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#5B4FE5" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1C2333" />
                  <stop offset="100%" stopColor="#0B1220" />
                </linearGradient>
                <linearGradient id="rgbStrip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" />
                  <stop offset="50%" stopColor="#8B7FFF" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>

              {/* korpuso siluetas */}
              <rect x="30" y="10" width="180" height="200" rx="14" fill="url(#caseGrad)" stroke="#2A3350" strokeWidth="2" />
              {/* stiklinė panelė */}
              <rect x="46" y="24" width="148" height="172" rx="8" fill="#0A0F1C" stroke="#2A3350" strokeWidth="1.5" />

              {/* RGB juostelė */}
              <rect x="38" y="24" width="4" height="172" rx="2" fill="url(#rgbStrip)" />

              {/* ventiliatoriai su švytėjimu */}
              {[62, 110, 158].map((cy, i) => (
                <g key={i}>
                  <circle cx="120" cy={cy} r="30" fill="url(#fanGlow)" />
                  <circle cx="120" cy={cy} r="22" fill="#111827" stroke="#8B7FFF" strokeWidth="1.5" />
                  <circle cx="120" cy={cy} r="5" fill="#8B7FFF" />
                  {[0, 60, 120, 180, 240, 300].map((deg) => {
                    const x2 = (120 + 16 * Math.cos((deg * Math.PI) / 180)).toFixed(2);
                    const y2 = (cy + 16 * Math.sin((deg * Math.PI) / 180)).toFixed(2);
                    return (
                      <line
                        key={deg}
                        x1="120"
                        y1={cy}
                        x2={x2}
                        y2={y2}
                        stroke="#5B4FE5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              ))}

              {/* video plokštė dešinėje - antra dalis korpuso */}
              <rect x="215" y="60" width="55" height="140" rx="10" fill="url(#caseGrad)" stroke="#2A3350" strokeWidth="2" />
              <rect x="222" y="72" width="41" height="14" rx="3" fill="#8B7FFF" opacity="0.7" />
              <circle cx="242" cy="120" r="16" fill="#111827" stroke="#22D3EE" strokeWidth="1.5" />
              <circle cx="242" cy="120" r="4" fill="#22D3EE" />
              <circle cx="242" cy="160" r="16" fill="#111827" stroke="#22D3EE" strokeWidth="1.5" />
              <circle cx="242" cy="160" r="4" fill="#22D3EE" />
            </svg>
          </div>
        </div>
      </section>

      {/* MOBILE KATEGORIJŲ JUOSTELĖ */}
      <section className="md:hidden max-w-[1440px] mx-auto px-4 pb-4">
        <h2 className="text-sm font-extrabold mb-2">Visos kategorijos</h2>
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          {categories.map((c) => {
            const isActive = activeCategory === c.name;
            return (
              <div
                key={c.name}
                onClick={() => setActiveCategory(isActive ? null : c.name)}
                className={`shrink-0 w-[76px] flex flex-col items-center gap-1.5 border rounded-xl p-2.5 cursor-pointer ${
                  isActive ? "bg-[#EEF0FF] border-[#5B4FE5]" : "bg-white border-[#E4E7EE]"
                }`}
              >
                <CategoryIcon c={c} size="w-8 h-8" />
                <span className="text-[10px] font-semibold text-center leading-tight">{c.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* FILTRŲ JUOSTA */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 pb-4">
        <div className="flex md:flex-wrap items-center gap-2.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[#E4E7EE] rounded-lg px-3 py-2.5 md:py-2">
            <span className="text-xs font-semibold text-[#6B7280]">Rikiuoti:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="newest">Naujausi</option>
              <option value="oldest">Seniausi</option>
              <option value="cheapest">Pigiausi</option>
              <option value="expensive">Brangiausi</option>
              <option value="views">Daugiausiai peržiūrų</option>
            </select>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[#E4E7EE] rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-[#6B7280]">Kategorija:</span>
            <select
              value={activeCategory || "Visos"}
              onChange={(e) => setActiveCategory(e.target.value === "Visos" ? null : e.target.value)}
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="Visos">Visos</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
              <option value="Kiti komponentai">Kiti komponentai</option>
            </select>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[#E4E7EE] rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-[#6B7280]">Kaina:</span>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="any">Bet kokia</option>
              <option value="under50">Iki 50 €</option>
              <option value="50-100">50–100 €</option>
              <option value="100-250">100–250 €</option>
              <option value="250-500">250–500 €</option>
              <option value="500-1000">500–1000 €</option>
              <option value="1000+">1000 €+</option>
              <option value="custom">Pasirinkti kainą</option>
            </select>
            {priceFilter === "custom" && (
              <>
                <input
                  type="number"
                  placeholder="Min €"
                  value={customMinPrice}
                  onChange={(e) => setCustomMinPrice(e.target.value)}
                  className="w-16 text-xs border-l border-[#E4E7EE] pl-2 outline-none"
                />
                <input
                  type="number"
                  placeholder="Max €"
                  value={customMaxPrice}
                  onChange={(e) => setCustomMaxPrice(e.target.value)}
                  className="w-16 text-xs border-l border-[#E4E7EE] pl-2 outline-none"
                />
              </>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[#E4E7EE] rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-[#6B7280]">Būklė:</span>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="any">Bet kokia</option>
              <option value="naujas">Nauja</option>
              <option value="naudotas">Naudota</option>
              <option value="atidaryta">Atidaryta / mažai naudota</option>
              <option value="defektas">Su defektu</option>
            </select>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[#E4E7EE] rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-[#6B7280]">Vieta:</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="visi">Visi miestai</option>
              <option value="lietuva">Visa Lietuva</option>
              <option value="Vilnius">Vilnius</option>
              <option value="Kaunas">Kaunas</option>
              <option value="Klaipėda">Klaipėda</option>
              <option value="Šiauliai">Šiauliai</option>
              <option value="Panevėžys">Panevėžys</option>
              <option value="Alytus">Alytus</option>
              <option value="Marijampolė">Marijampolė</option>
              <option value="Mažeikiai">Mažeikiai</option>
              <option value="Jonava">Jonava</option>
              <option value="Utena">Utena</option>
              <option value="Kėdainiai">Kėdainiai</option>
              <option value="Telšiai">Telšiai</option>
              <option value="Tauragė">Tauragė</option>
              <option value="Ukmergė">Ukmergė</option>
              <option value="Palanga">Palanga</option>
              <option value="Kretinga">Kretinga</option>
              <option value="Kita">Kita</option>
            </select>
          </div>
        </div>
      </section>

      {/* LAYOUT */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 pb-14 grid grid-cols-1 md:grid-cols-[220px_1fr_320px] gap-6 items-start">

        <aside className="hidden md:block bg-white border border-[#E4E7EE] rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2 px-1">
            <h2 className="text-sm font-extrabold">Visos kategorijos</h2>
            {activeCategory && (
              <button onClick={() => setActiveCategory(null)} className="text-[11px] font-bold text-[#5B4FE5]">
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-col">
            {categories.map((c) => {
              const isActive = activeCategory === c.name;
              return (
                <div
                  key={c.name}
                  onClick={() => setActiveCategory(isActive ? null : c.name)}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    isActive ? "bg-[#EEF0FF] text-[#5B4FE5] font-bold" : "text-[#374151] hover:bg-[#F6F7FB] font-medium"
                  }`}
                >
                  <CategoryIcon c={c} />
                  <span className="leading-tight">{c.name}</span>
                </div>
              );
            })}
          </div>
        </aside>

        <div>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-center">
              {activeCategory ? `Kategorija: ${activeCategory}` : "Visi skelbimai"}
              {search && ` · paieška "${search}"`}
            </h2>
          </div>
          {loading ? (
            <p className="text-sm text-[#6B7280]">Kraunama...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Pagal pasirinktus filtrus skelbimų nerasta.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-3">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className={`bg-white border border-[#E4E7EE] rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    p.status === "parduota" ? "opacity-60" : ""
                  }`}
                >
                  <div className="h-48 md:h-24 bg-[#F0F1F6] flex items-center justify-center text-2xl relative overflow-hidden">
                    <StatusBadge status={p.status} />
                    {p.photos && p.photos.length > 0 ? (
                      <img src={p.photos[0]} className="w-full h-full object-cover" />
                    ) : (
                      categoryIcons[p.category] || "🖥️"
                    )}
                    <button
                      onClick={(e) => toggleFavorite(p, e)}
                      className="absolute top-1.5 right-1.5 w-8 h-8 md:w-7 md:h-7 rounded-full bg-white flex items-center justify-center text-base shadow-sm"
                    >
                      {favorites.has(p.id) ? <span className="text-red-500">♥</span> : "♡"}
                    </button>
                  </div>
                  <div className="p-3 md:p-2.5">
                    <div className="text-sm md:text-xs font-semibold mb-1 leading-snug line-clamp-2">{p.title}</div>
                    {p.seller?.username && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <UserBadge salesCount={p.seller.sales_count || 0} size="sm" />
                        <span className="text-xs md:text-[10px] text-[#6B7280] truncate">{p.seller.username}</span>
                      </div>
                    )}
                    <div className="text-base md:text-sm font-extrabold text-[#5B4FE5] mb-1.5">{p.price} €</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-[10px] text-[#6B7280]">{p.city}</span>
                      <span className="text-[10px] md:text-[9px] font-bold bg-[#EEF0FF] text-[#5B4FE5] px-1.5 py-0.5 rounded-full capitalize">{p.condition}</span>
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-1">{timeAgo(p.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <LiveFeed />
      </section>

      {/* MODALAS - SKELBIMO DETALĖS */}
      {selected && (
        <div onClick={() => setSelected(null)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 md:p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-[#374151] text-base flex items-center justify-center"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 p-5 md:p-6">
              {/* KAIRĖ - MEDIJA + APRAŠYMAS */}
              <div>
                <div className="h-64 md:h-80 bg-[#F0F1F6] rounded-2xl flex items-center justify-center relative overflow-hidden mb-3">
                  {selectedPhotos.length > 0 ? (
                    <img
                      src={selectedPhotos[selectedPhoto]}
                      onClick={() => setLightboxOpen(true)}
                      className="w-full h-full object-cover cursor-zoom-in"
                    />
                  ) : (
                    <span className="text-6xl">{categoryIcons[selected.category] || "🖥️"}</span>
                  )}

                  {selectedPhotos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </>
                  )}
                </div>

                {selectedPhotos.length > 1 && (
                  <div className="flex gap-2 mb-4">
                    {selectedPhotos.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPhoto(i)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${i === selectedPhoto ? "border-[#5B4FE5]" : "border-transparent"}`}
                      >
                        <img src={src} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {selected.description && (
                  <div className="bg-white border border-[#E4E7EE] rounded-2xl p-4">
                    <h4 className="text-sm font-extrabold mb-2">Aprašymas</h4>
                    <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                  </div>
                )}
              </div>

              {/* DEŠINĖ - ŠONINĖ JUOSTA */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold bg-[#EEF0FF] text-[#5B4FE5] px-2.5 py-1 rounded-full capitalize">{selected.condition}</span>
                  {selected.status !== "aktyvus" && (
                    <span className="text-[11px] font-bold bg-[#F6F7FB] text-[#6B7280] px-2.5 py-1 rounded-full capitalize">{selected.status.replace(/_/g, " ")}</span>
                  )}
                  <span className="text-xs text-[#9CA3AF]">{selected.category} · {selected.city}</span>
                </div>

                <h3 className="text-xl font-extrabold leading-tight">{selected.title}</h3>

                <div className="flex items-center justify-between gap-2 bg-[#F6F7FB] rounded-xl p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-[#5B4FE5] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(selected.seller?.username || "P").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserBadge salesCount={selected.seller?.sales_count || 0} size="sm" />
                        <span className="text-sm font-bold truncate">{selected.seller?.username || "Pardavėjas"}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Aktyvus
                      </span>
                    </div>
                  </div>
                  <button className="text-[11px] font-bold text-[#5B4FE5] bg-white border border-[#5B4FE5]/30 px-2.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap">
                    Rodyti profilį
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white border border-[#E4E7EE] rounded-xl px-3.5 py-2.5">
                  <span className="text-xs text-[#6B7280]">Būklė</span>
                  <span className="text-xs font-bold capitalize">{selected.condition}</span>
                </div>

                <div className="flex items-center justify-between bg-white border border-[#E4E7EE] rounded-xl p-4">
                  <div>
                    {selected.old_price && (
                      <span className="block text-xs text-[#6B7280] line-through">{selected.old_price} €</span>
                    )}
                    <span className="block text-2xl font-extrabold text-[#5B4FE5] leading-none">{selected.price} €</span>
                    <span className="text-[11px] text-[#9CA3AF]">Kaina</span>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(selected, e)}
                    className="w-10 h-10 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] flex items-center justify-center text-lg shrink-0"
                  >
                    {favorites.has(selected.id) ? <span className="text-red-500">♥</span> : "♡"}
                  </button>
                </div>

                {isOwnListing ? (
                  <button
                    onClick={(e) => openEditModal(selected, e)}
                    className="w-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-[#374151] text-sm font-bold px-5 py-3 rounded-lg"
                  >
                    ✎ Redaguoti skelbimą
                  </button>
                ) : (
                  <button
                    onClick={handleMessageSeller}
                    disabled={starting || !selected.seller_id}
                    className="w-full bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
                  >
                    {starting ? "Pradedama..." : "Parašyti pardavėjui"}
                  </button>
                )}

                {!selected.seller_id && (
                  <p className="text-xs text-[#6B7280] text-center">
                    Šis skelbimas neturi susieto pardavėjo (sukurtas prieš įvedant prisijungimą).
                  </p>
                )}

                <div className="bg-white border border-[#E4E7EE] rounded-xl divide-y divide-[#F0F1F6] mt-1">
                  <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <span className="text-[#6B7280]">Įdėtas</span>
                    <span className="font-semibold">
                      {new Date(selected.created_at).toLocaleDateString("lt-LT")}, {new Date(selected.created_at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <span className="text-[#6B7280]">Peržiūros</span>
                    <span className="font-semibold">{selected.views_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <span className="text-[#6B7280]">Vieta</span>
                    <span className="font-semibold flex items-center gap-1">
                      {selected.city}, Lietuva
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" stroke="#9CA3AF" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" stroke="#9CA3AF" strokeWidth="2"/></svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {lightboxOpen && (
            <div
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-8 cursor-zoom-out"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
                className="absolute top-5 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center"
              >
                ✕
              </button>

              {selectedPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </>
              )}

              <img
                src={selectedPhotos[selectedPhoto]}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* MODALAS - MANO SKELBIMAI */}
      {myListingsOpen && (
        <div onClick={() => setMyListingsOpen(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-extrabold">Mano skelbimai</h3>
              <button onClick={() => setMyListingsOpen(false)} className="w-8 h-8 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-sm flex items-center justify-center">
                ✕
              </button>
            </div>

            {myListingsLoading ? (
              <p className="text-sm text-[#6B7280]">Kraunama...</p>
            ) : myListings.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                Kol kas neturi įkeltų skelbimų.{" "}
                <Link href="/ikelti" onClick={() => setMyListingsOpen(false)} className="text-[#5B4FE5] font-bold">
                  Įkelti dabar
                </Link>
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {myListings.map((p) => {
                  const badge =
                    p.status === "laukia_patvirtinimo"
                      ? { text: "Laukia patvirtinimo", className: "bg-amber-400 text-amber-950" }
                      : p.status === "laukia_istrynimo"
                      ? { text: "Laukia admin peržiūros", className: "bg-orange-400 text-orange-950" }
                      : p.status === "parduota"
                      ? { text: "Parduotas", className: "bg-[#6B7280] text-white" }
                      : p.status === "rezervuota"
                      ? { text: "Pauzėje", className: "bg-amber-400 text-amber-950" }
                      : { text: "Aktyvus", className: "bg-[#DCFCE7] text-[#166534]" };

                  return (
                    <div key={p.id} className="border border-[#E4E7EE] rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div
                          style={{ width: "64px", height: "64px", minWidth: "64px", borderRadius: "10px", overflow: "hidden", background: "#F0F1F6" }}
                          className="flex items-center justify-center text-2xl"
                        >
                          {p.photos && p.photos.length > 0 ? (
                            <img src={p.photos[0]} style={{ width: "64px", height: "64px", objectFit: "cover" }} />
                          ) : (
                            "🖥️"
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-bold truncate">{p.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>{badge.text}</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-[#6B7280] mb-2">
                            <span>👁️ Peržiūros: {p.views_count}</span>
                            <span>❤️ Įsiminė: {p.favCount}</span>
                            <span>{timeAgo(p.created_at)}</span>
                          </div>

                          {mlEditingPriceId === p.id ? (
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="number"
                                value={mlEditPriceValue}
                                onChange={(e) => setMlEditPriceValue(e.target.value)}
                                className="border border-[#E4E7EE] rounded-lg px-3 py-1.5 text-sm w-28 outline-none focus:border-[#5B4FE5]"
                              />
                              <span className="text-sm text-[#6B7280]">€</span>
                              <button
                                onClick={() => mlSaveEditPrice(p)}
                                disabled={mlEditPriceSaving}
                                className="bg-[#5B4FE5] hover:bg-[#4338CA] text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                              >
                                {mlEditPriceSaving ? "Saugoma..." : "Išsaugoti"}
                              </button>
                              <button onClick={() => setMlEditingPriceId(null)} className="text-xs font-semibold text-[#6B7280]">
                                Atšaukti
                              </button>
                            </div>
                          ) : (
                            <div className="text-lg font-extrabold text-[#5B4FE5] mb-2">{p.price} €</div>
                          )}

                          {mlEditPriceError && mlEditingPriceId === p.id && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-2 mb-2">
                              {mlEditPriceError}
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <button
                              onClick={() => mlStartEditPrice(p)}
                              className="flex items-center gap-1.5 text-xs font-bold text-[#5B4FE5] bg-white border border-[#5B4FE5]/40 hover:bg-[#EEF0FF] px-3.5 py-2 rounded-lg transition-colors"
                            >
                              ✎ Redaguoti kainą
                            </button>
                            {p.status !== "parduota" && p.status !== "laukia_istrynimo" && (
                              <button
                                onClick={() => mlMarkAsSold(p)}
                                className="flex items-center gap-1.5 text-xs font-bold text-[#166534] bg-white border border-[#166534]/30 hover:bg-[#DCFCE7] px-3.5 py-2 rounded-lg transition-colors"
                              >
                                ✓ Pažymėti kaip parduotą
                              </button>
                            )}
                            {p.status === "laukia_istrynimo" ? (
                              <span className="text-xs text-[#9CA3AF] italic">Laukia administracijos sprendimo</span>
                            ) : mlDeletingId === p.id ? (
                              <span className="flex items-center gap-2">
                                <span className="text-xs text-[#6B7280]">Ar tikrai?</span>
                                <button
                                  onClick={() => mlDeleteListing(p)}
                                  className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3.5 py-2 rounded-lg"
                                >
                                  Taip, ištrinti
                                </button>
                                <button onClick={() => setMlDeletingId(null)} className="text-xs font-semibold text-[#6B7280]">
                                  Ne
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setMlDeletingId(p.id)}
                                className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-white border border-red-200 hover:bg-red-50 px-3.5 py-2 rounded-lg transition-colors"
                              >
                                🗑 Ištrinti skelbimą
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALAS - LYGIŲ PAAIŠKINIMAS */}
      {levelsModalOpen && (
        <div onClick={() => setLevelsModalOpen(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-extrabold">Pasitikėjimo lygiai</h3>
              <button
                onClick={() => setLevelsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-sm flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#6B7280] mb-5">
              Kiekvienas GearZone.lt vartotojas turi lygį, kuris kyla priklausomai nuo sėkmingai įvykdytų sandorių skaičiaus.
            </p>
            <div className="flex flex-col gap-3">
              {LEVELS.map((lvl) => (
                <div key={lvl.level} className="flex items-center gap-3 border border-[#E4E7EE] rounded-xl p-3">
                  <UserBadge salesCount={lvl.minSales} size="md" />
                  <div>
                    <div className="text-sm font-bold">
                      Lygis {lvl.level} · {lvl.name}
                    </div>
                    <div className="text-xs text-[#6B7280]">{lvl.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALAS - REDAGAVIMAS */}
      {editModalOpen && selected && (
        <div onClick={() => setEditModalOpen(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-extrabold">Redaguoti skelbimą</h3>
              <button onClick={() => setEditModalOpen(false)} className="w-8 h-8 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-sm flex items-center justify-center">
                ✕
              </button>
            </div>

            {selected.photos && selected.photos.length > 0 && (
              <div className="flex gap-2 mb-4">
                {selected.photos.map((src, i) => (
                  <img key={i} src={src} className="w-14 h-14 rounded-lg object-cover border border-[#E4E7EE]" />
                ))}
              </div>
            )}
            <p className="text-[11px] text-[#9CA3AF] mb-4">Nuotraukų keisti redaguojant negalima.</p>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">
                {editError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold block mb-1.5">Pavadinimas</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5">Aprašymas</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5">Kaina, €</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5">Sena kaina, € (nebūtina)</label>
                  <input
                    type="number"
                    value={editOldPrice}
                    onChange={(e) => setEditOldPrice(e.target.value)}
                    className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5">Būsena</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
                >
                  <option value="aktyvus">Aktyvus</option>
                  <option value="rezervuota">Rezervuota</option>
                  <option value="parduota">Parduota (bus siunčiama admin peržiūrai)</option>
                </select>
              </div>

              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="w-full bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50 mt-1"
              >
                {editSaving ? "Saugoma..." : "Išsaugoti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKYDELIS - MĖGSTAMI */}
      <div
        onClick={() => setFavoritesPanelOpen(false)}
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity ${favoritesPanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[380px] bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 ${
          favoritesPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E4E7EE]">
          <span className="text-sm font-extrabold">Mėgstami skelbimai</span>
          <button onClick={() => setFavoritesPanelOpen(false)} className="ml-auto w-8 h-8 rounded-full hover:bg-[#F6F7FB] flex items-center justify-center text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {products.filter((p) => favorites.has(p.id)).length === 0 ? (
            <p className="text-sm text-[#6B7280] p-2">Kol kas neturi mėgstamų skelbimų.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {products.filter((p) => favorites.has(p.id)).map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px" }} className="border border-[#E4E7EE] rounded-xl p-3">
                  <div
                    onClick={() => { setFavoritesPanelOpen(false); openProduct(p); }}
                    style={{ width: "48px", height: "48px", minWidth: "48px", borderRadius: "10px", overflow: "hidden", background: "#F0F1F6", cursor: "pointer" }}
                    className="flex items-center justify-center text-lg"
                  >
                    {p.photos && p.photos.length > 0 ? (
                      <img src={p.photos[0]} style={{ width: "48px", height: "48px", objectFit: "cover" }} />
                    ) : (
                      categoryIcons[p.category] || "🖥️"
                    )}
                  </div>
                  <div
                    onClick={() => { setFavoritesPanelOpen(false); openProduct(p); }}
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  >
                    <div className="text-sm font-bold truncate">{p.title}</div>
                    <div className="text-xs text-[#5B4FE5] font-extrabold">{p.price} €</div>
                  </div>
                  <button onClick={(e) => toggleFavorite(p, e)} className="text-red-500 text-lg shrink-0">
                    ♥
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SKYDELIS - PRANEŠIMAI */}
      <div
        onClick={() => setNotificationsPanelOpen(false)}
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity ${notificationsPanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[380px] bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 ${
          notificationsPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E4E7EE]">
          <span className="text-sm font-extrabold">Pranešimai</span>
          <button onClick={() => setNotificationsPanelOpen(false)} className="ml-auto w-8 h-8 rounded-full hover:bg-[#F6F7FB] flex items-center justify-center text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-[#6B7280] p-2">Pranešimų dar nėra.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <div key={n.id} className="border border-[#E4E7EE] rounded-xl p-3">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">{timeAgo(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POKALBIŲ SKYDELIS (slide-over) */}
      <div
        onClick={closeChat}
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity ${chatOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* SKYDELIO HEADER */}
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E4E7EE]">
          {chatView === "thread" ? (
            <button onClick={() => { setChatView("list"); setActiveConv(null); }} className="text-sm font-bold text-[#5B4FE5]">
              ← Atgal
            </button>
          ) : (
            <span className="text-sm font-extrabold">Žinutės</span>
          )}
          <button onClick={closeChat} className="ml-auto w-8 h-8 rounded-full hover:bg-[#F6F7FB] flex items-center justify-center text-sm">
            ✕
          </button>
        </div>

        {/* SĄRAŠAS */}
        {chatView === "list" && (
          <div className="flex-1 overflow-y-auto p-3">
            {conversationsLoading ? (
              <p className="text-sm text-[#6B7280] p-2">Kraunama...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-[#6B7280] p-2">Pokalbių dar nėra. Parašyk pardavėjui iš skelbimo.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openThread(c)}
                    style={{ display: "flex", alignItems: "center", gap: "10px" }}
                    className={`text-left border rounded-xl p-3 hover:shadow-md transition-all ${
                      c.unreadCount > 0 ? "bg-[#F5F3FF] border-[#5B4FE5]/30" : "bg-white border-[#E4E7EE]"
                    }`}
                  >
                    <div style={{ width: "48px", height: "48px", minWidth: "48px", borderRadius: "10px", overflow: "hidden", background: "#F0F1F6", position: "relative" }} className="flex items-center justify-center text-lg">
                      {c.product?.photos && c.product.photos.length > 0 ? (
                        <img src={c.product.photos[0]} style={{ width: "48px", height: "48px", objectFit: "cover" }} />
                      ) : (
                        "🖥️"
                      )}
                      {c.unreadCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            background: "#EF4444",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 800,
                            borderRadius: "999px",
                            minWidth: "18px",
                            height: "18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 0 0 2px white",
                          }}
                        >
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-1.5">
                        <UserBadge salesCount={c.otherSales} size="sm" />
                        <span className={`text-sm truncate ${c.unreadCount > 0 ? "font-extrabold" : "font-bold"}`}>{c.otherUsername}</span>
                      </div>
                      <div className="text-xs text-[#6B7280] truncate">{c.product?.title || "Skelbimas pašalintas"}</div>
                    </div>
                    {c.product?.price && <div className="text-sm font-extrabold text-[#5B4FE5] shrink-0">{c.product.price} €</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* POKALBIS */}
        {chatView === "thread" && activeConv && (
          <div className="flex-1 flex flex-col min-h-0">
            {activeConv.product && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="p-3 border-b border-[#F0F1F6]">
                <div style={{ width: "36px", height: "36px", minWidth: "36px", borderRadius: "8px", overflow: "hidden", background: "#F0F1F6" }} className="flex items-center justify-center text-sm">
                  {activeConv.product.photos && activeConv.product.photos.length > 0 ? (
                    <img src={activeConv.product.photos[0]} style={{ width: "36px", height: "36px", objectFit: "cover" }} />
                  ) : (
                    "🖥️"
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-[10px] text-[#6B7280]">Skelbimas</div>
                  <div className="text-xs font-bold truncate">{activeConv.product.title}</div>
                </div>
                <div className="text-xs font-extrabold text-[#5B4FE5] shrink-0">{activeConv.product.price} €</div>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#F0F1F6]">
              <UserBadge salesCount={activeConv.otherSales} size="sm" />
              <span className="text-sm font-bold">{activeConv.otherUsername}</span>
              <span className="flex items-center gap-1 text-[11px] text-[#6B7280] ml-1">
                <span style={{ width: 7, height: 7, borderRadius: "999px", background: otherOnline ? "#22C55E" : "#9CA3AF", display: "inline-block" }} />
                {otherOnline ? "prisijungęs" : "atsijungęs"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
              {threadLoading ? (
                <p className="text-sm text-[#6B7280] text-center my-auto">Kraunama...</p>
              ) : threadMessages.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center my-auto">Parašyk pirmą žinutę.</p>
              ) : (
                threadMessages.map((m, i) => {
                  const isMine = m.sender_id === currentUserId;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] font-semibold text-[#9CA3AF] mb-0.5 px-1">
                        {isMine ? myUsername : activeConv.otherUsername}
                      </span>
                      <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${isMine ? "bg-[#5B4FE5] text-white rounded-br-sm" : "bg-[#F6F7FB] text-[#12172B] rounded-bl-sm"}`}>
                        {m.content}
                      </div>
                      {isMine && i === lastMineIndex && m.read && (
                        <span className="text-[10px] text-[#9CA3AF] mt-0.5 px-1">Matyta {m.read_at ? formatTime(m.read_at) : ""}</span>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSendThread} className="flex gap-2 p-3 border-t border-[#F0F1F6]">
              <input
                value={threadText}
                onChange={(e) => setThreadText(e.target.value)}
                placeholder="Rašyk žinutę..."
                className="flex-1 border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
              />
              <button
                type="submit"
                disabled={threadSending || !threadText.trim()}
                className="bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"
              >
                Siųsti
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MOBILE APAČIOS NAVIGACIJA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[85] bg-white border-t border-[#E4E7EE] flex items-center justify-around py-2">
        <button className="flex flex-col items-center gap-0.5 text-[#5B4FE5] px-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-8 9 8M5 10v10h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[10px] font-semibold">Pagrindinis</span>
        </button>
        <button
          onClick={() => document.querySelector<HTMLInputElement>('header input')?.focus()}
          className="flex flex-col items-center gap-0.5 text-[#6B7280] px-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <span className="text-[10px] font-semibold">Paieška</span>
        </button>
        <Link href="/ikelti" className="flex flex-col items-center gap-0.5 -mt-4">
          <span className="w-11 h-11 rounded-full bg-[#5B4FE5] flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </span>
        </Link>
        <button
          onClick={() => (username ? setFavoritesPanelOpen(true) : router.push("/prisijungti"))}
          className="flex flex-col items-center gap-0.5 text-[#6B7280] px-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3 2-1.5 3.5-3 5.5-3 3.5 0 6 3.5 4 7.5C19 16.65 12 21 12 21z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          <span className="text-[10px] font-semibold">Mėgstami</span>
        </button>
        <button
          onClick={() => (username ? setUserMenuOpen((v) => !v) : router.push("/prisijungti"))}
          className="flex flex-col items-center gap-0.5 text-[#6B7280] px-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <span className="text-[10px] font-semibold">Profilis</span>
        </button>
      </div>
    </div>
  );
}
