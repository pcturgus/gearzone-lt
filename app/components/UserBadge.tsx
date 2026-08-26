"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";

export type UserLevel = {
  level: number;
  name: string;
  description: string;
  minSales: number;
  ringColor: string;
  glow?: string;
};

export const LEVELS: UserLevel[] = [
  {
    level: 1,
    name: "Naujokas",
    description: "Ką tik prisijungęs prie bendruomenės. 0–4 sėkmingi sandoriai.",
    minSales: 0,
    ringColor: "#9CA3AF",
  },
  {
    level: 2,
    name: "Patikimas",
    description: "Patvirtintas pardavėjas su pirmąja sandorių istorija. 5–14 sėkmingų sandorių.",
    minSales: 5,
    ringColor: "#94A3B8",
  },
  {
    level: 3,
    name: "Patyręs",
    description: "Reguliariai perka ir parduoda platformoje. 15–29 sėkmingi sandoriai.",
    minSales: 15,
    ringColor: "#B08D57",
  },
  {
    level: 4,
    name: "Ekspertas",
    description: "Stabili, gausi sandorių istorija. 30–49 sėkmingi sandoriai.",
    minSales: 30,
    ringColor: "#22D3EE",
    glow: "0 0 8px 1px rgba(34,211,238,0.55)",
  },
  {
    level: 5,
    name: "Elitas",
    description: "Aukščiausio pasitikėjimo pardavėjas platformoje. 50+ sėkmingų sandorių.",
    minSales: 50,
    ringColor: "#A78BFA",
    glow: "0 0 10px 2px rgba(167,139,250,0.65)",
  },
];

export function getUserLevel(salesCount: number): UserLevel {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (salesCount >= l.minSales) result = l;
  }
  return result;
}

function ProgressRing({ level, ringColor, dim }: { level: number; ringColor: string; dim: number }) {
  const size = 40;
  const r = 15;
  const cx = 20;
  const cy = 20;
  const circumference = 2 * Math.PI * r;
  const fraction = level / 5;
  const dashOffset = circumference * (1 - fraction);

  return (
    <svg width={dim} height={dim} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={18} fill="#0B1220" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={3} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={ringColor}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={14} fontWeight={800}>
        {level}
      </text>
    </svg>
  );
}

export default function UserBadge({
  salesCount,
  size = "sm",
}: {
  salesCount: number;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLSpanElement>(null);
  const lvl = getUserLevel(salesCount);
  const dim = size === "sm" ? 20 : 26;

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
    setOpen((v) => !v);
  }

  return (
    <span
      ref={badgeRef}
      onClick={handleToggle}
      style={{ position: "relative", display: "inline-flex", cursor: "pointer" }}
    >
      <span
        style={{
          width: dim,
          height: dim,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: lvl.glow || "none",
        }}
      >
        <ProgressRing level={lvl.level} ringColor={lvl.ringColor} dim={dim} />
      </span>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: "translate(-50%, -100%)",
                zIndex: 9999,
              }}
            >
              <div className="bg-[#0B1220] text-white rounded-xl px-3.5 py-2.5 shadow-lg" style={{ width: "200px" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: lvl.ringColor,
                      boxShadow: lvl.glow || "none",
                    }}
                  />
                  <span className="text-xs font-extrabold">
                    Lygis {lvl.level} · {lvl.name}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-snug">{lvl.description}</p>
                <p className="text-[10px] text-white/40 mt-1">{salesCount} įvykdyti sandoriai</p>
              </div>
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
