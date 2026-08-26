"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import UserBadge from "../../components/UserBadge";

const categoryImages: Record<string, string> = {
  "Vaizdo plokštės": "vaizdo-plokstes.png",
  "Procesoriai": "procesoriai.png",
  "Pagrindinės plokštės": "pagrindines-plokstes.png",
  "Operatyvioji atmintis": "ram.png",
  "SSD / HDD": "ssd-hdd.png",
  "Maitinimo blokai": "maitinimo-blokai.png",
  "Korpusai": "korpusai.png",
  "Aušintuvai": "ausintuvai.png",
  "Pelės": "peles.png",
  "Klaviatūros": "klaviaturos.png",
  "Pelių kilimėliai": "peliu-kilimeliai.png",
  "Ausinės / mikrofonai": "ausines-mikrofonai.png",
  "Monitoriai": "monitoriai.png",
  "Kėdės ir stalai": "kedes-stalai.png",
  "Tinklo įranga": "tinklo-iranga.png",
  "Mikrofonai ir transliavimo įranga": "mikrofonai-transliavimas.jpg",
  "Stacionarūs kompiuteriai (PC)": "stacionarus-kompiuteriai.jpg",
  "Nešiojamas kompiuteris": "nesiojami-kompiuteriai.jpg",
  "Kolonėlės": "koloneles.jpg",
  "Žaidimų pulteliai": "zaidimu-pulteliai.jpg",
  "Žaidimų konsolės ir žaidimai": "zaidimu-konsoles.jpg",
  "Virtuali realybė (VR)": "vr.jpg",
  "Kita": "kita.jpg",
};

type Profile = {
  id: string;
  username: string | null;
  sales_count: number | null;
  created_at: string;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  city: string;
  condition: string;
  category: string;
  photos: string[] | null;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewerUsername: string;
};

type EligibleSale = {
  id: string;
  product_title: string;
  created_at: string;
};

export default function PardavejoProfilis() {
  const params = useParams();
  const sellerId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Įtartinas elgesys");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibleSales, setEligibleSales] = useState<EligibleSale[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingSale, setReviewingSale] = useState<EligibleSale | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  async function submitUserReport() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/prisijungti";
      return;
    }
    setReportSubmitting(true);
    setReportError("");

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: sellerId,
      reason: reportReason,
      details: reportDetails || null,
    });

    setReportSubmitting(false);

    if (error) {
      setReportError("Nepavyko pateikti pranešimo: " + error.message);
      return;
    }
    setReportSuccess(true);
  }

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, sales_count, created_at")
        .eq("id", sellerId)
        .single();
      setProfile(profileData);

      const { data: listingsData } = await supabase
        .from("products")
        .select("id, title, price, city, condition, category, photos")
        .eq("seller_id", sellerId)
        .eq("status", "aktyvus")
        .order("created_at", { ascending: false });
      setListings(listingsData || []);

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("reviewed_user_id", sellerId)
        .order("created_at", { ascending: false });

      const reviewsWithNames = await Promise.all(
        (reviewsData || []).map(async (r) => {
          const { data: rp } = await supabase.from("profiles").select("username").eq("id", r.reviewer_id).single();
          return { id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at, reviewerUsername: rp?.username || "Vartotojas" };
        })
      );
      setReviews(reviewsWithNames);

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== sellerId) {
        const { data: sales } = await supabase
          .from("completed_sales")
          .select("id, product_title, created_at")
          .eq("buyer_id", user.id)
          .eq("seller_id", sellerId);

        const { data: myReviews } = await supabase
          .from("reviews")
          .select("completed_sale_id")
          .eq("reviewer_id", user.id);

        const reviewedIds = new Set((myReviews || []).map((r) => r.completed_sale_id));
        setEligibleSales((sales || []).filter((s) => !reviewedIds.has(s.id)));
      }

      setLoading(false);
    }
    load();
  }, [sellerId]);

  async function submitReview() {
    if (!reviewingSale) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/prisijungti";
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");

    const { error } = await supabase.from("reviews").insert({
      completed_sale_id: reviewingSale.id,
      reviewer_id: user.id,
      reviewed_user_id: sellerId,
      rating: reviewRating,
      comment: reviewComment || null,
    });

    setReviewSubmitting(false);

    if (error) {
      setReviewError("Nepavyko išsaugoti atsiliepimo: " + error.message);
      return;
    }

    setReviewSuccess(true);
    setEligibleSales((prev) => prev.filter((s) => s.id !== reviewingSale.id));
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  if (loading) {
    return <div className="max-w-4xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Kraunama...</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-8 py-16 text-center">
        <p className="text-sm text-[#6B7280] mb-4">Vartotojas nerastas.</p>
        <Link href="/" className="text-[#5B4FE5] font-bold text-sm">← Grįžti į pagrindinį</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <div className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex items-center gap-4 mb-8">
        <span className="w-16 h-16 rounded-full bg-[#5B4FE5] text-white flex items-center justify-center text-2xl font-bold shrink-0">
          {(profile.username || "P").charAt(0).toUpperCase()}
        </span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-extrabold">{profile.username || "Vartotojas"}</h1>
            <UserBadge salesCount={profile.sales_count || 0} size="md" />
          </div>
          <p className="text-xs text-[#6B7280]">
            Platformoje nuo {new Date(profile.created_at).toLocaleDateString("lt-LT", { year: "numeric", month: "long" })}
          </p>
          <p className="text-xs text-[#6B7280]">{listings.length} aktyvūs skelbimai</p>
          {avgRating !== null && (
            <p className="text-xs font-semibold text-amber-500 mt-0.5">
              ⭐ {avgRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "atsiliepimas" : "atsiliepimai"})
            </p>
          )}
        </div>
        {currentUserId && currentUserId !== sellerId && (
          <div className="ml-auto flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={() => { setReportOpen(true); setReportSuccess(false); setReportError(""); setReportDetails(""); }}
              className="text-xs font-semibold text-[#9CA3AF] hover:text-red-500"
            >
              🚩 Pranešti
            </button>
            {eligibleSales.length > 0 && (
              <button
                onClick={() => {
                  setReviewingSale(eligibleSales[0]);
                  setReviewRating(5);
                  setReviewComment("");
                  setReviewError("");
                  setReviewSuccess(false);
                  setReviewModalOpen(true);
                }}
                className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg"
              >
                ⭐ Palikti atsiliepimą
              </button>
            )}
          </div>
        )}
      </div>

      {reviewModalOpen && reviewingSale && (
        <div onClick={() => setReviewModalOpen(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold">Atsiliepimas apie „{reviewingSale.product_title}“</h3>
              <button onClick={() => setReviewModalOpen(false)} className="w-8 h-8 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-sm flex items-center justify-center">
                ✕
              </button>
            </div>
            {reviewSuccess ? (
              <div className="bg-[#EEF0FF] border border-[#5B4FE5]/30 text-[#5B4FE5] text-sm font-semibold rounded-xl p-4">
                ✓ Ačiū už atsiliepimą!
              </div>
            ) : (
              <>
                {reviewError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-3">{reviewError}</div>
                )}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1.5">Įvertinimas</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewRating(n)}
                          className={`text-2xl ${n <= reviewRating ? "text-amber-500" : "text-[#E4E7EE]"}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1.5">Komentaras (nebūtina)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                      className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5] resize-none"
                    />
                  </div>
                  <button
                    onClick={submitReview}
                    disabled={reviewSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
                  >
                    {reviewSubmitting ? "Saugoma..." : "Pateikti atsiliepimą"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {reportOpen && (
        <div onClick={() => setReportOpen(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold">Pranešti apie vartotoją</h3>
              <button onClick={() => setReportOpen(false)} className="w-8 h-8 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-sm flex items-center justify-center">
                ✕
              </button>
            </div>
            {reportSuccess ? (
              <div className="bg-[#EEF0FF] border border-[#5B4FE5]/30 text-[#5B4FE5] text-sm font-semibold rounded-xl p-4">
                ✓ Ačiū! Pranešimą gavome.
              </div>
            ) : (
              <>
                {reportError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-3">{reportError}</div>
                )}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1.5">Priežastis</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
                    >
                      <option>Įtartinas elgesys</option>
                      <option>Apgaulė / sukčiavimas</option>
                      <option>Priekabiavimas žinutėse</option>
                      <option>Kita</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1.5">Papildoma informacija (nebūtina)</label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={3}
                      className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5] resize-none"
                    />
                  </div>
                  <button
                    onClick={submitUserReport}
                    disabled={reportSubmitting}
                    className="w-full bg-red-500 hover:bg-red-600 transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
                  >
                    {reportSubmitting ? "Siunčiama..." : "Pateikti pranešimą"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <h2 className="text-lg font-extrabold mb-4">Skelbimai</h2>

      {listings.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Šis vartotojas šiuo metu neturi aktyvių skelbimų.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {listings.map((l) => (
            <div key={l.id} className="bg-white border border-[#E4E7EE] rounded-xl overflow-hidden">
              <div className="h-32 bg-[#F0F1F6] flex items-center justify-center overflow-hidden">
                {l.photos && l.photos.length > 0 ? (
                  <img src={l.photos[0]} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={`/categories/${categoryImages[l.category] || ""}`}
                    className="w-10 h-10 object-contain opacity-50"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold mb-1 leading-snug line-clamp-2">{l.title}</div>
                <div className="text-sm font-extrabold text-[#5B4FE5] mb-1">{l.price} €</div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#6B7280]">{l.city}</span>
                  <span className="text-[9px] font-bold bg-[#EEF0FF] text-[#5B4FE5] px-1.5 py-0.5 rounded-full capitalize">{l.condition}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-extrabold mb-4 mt-10">Atsiliepimai</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Šis vartotojas dar neturi atsiliepimų.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-[#E4E7EE] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold">{r.reviewerUsername}</span>
                <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <p className="text-sm text-[#374151]">{r.comment}</p>}
              <p className="text-[11px] text-[#9CA3AF] mt-1">{new Date(r.created_at).toLocaleDateString("lt-LT")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
