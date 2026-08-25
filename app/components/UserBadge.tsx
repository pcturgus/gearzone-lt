"use client";

import { useState } from "react";

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
    ringColor: "#334155",
    glow: "0 0 8px 1px rgba(34,211,238,0.55)",
  },
  {
    level: 5,
    name: "Elitas",
    description: "Aukščiausio pasitikėjimo pardavėjas platformoje. 50+ sėkmingų sandorių.",
    minSales: 50,
    ringColor: "#CBD5E1",
    glow: "0 0 10px 2px rgba(203,213,225,0.7)",
  },
];

export function getUserLevel(salesCount: number): UserLevel {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (salesCount >= l.minSales) result = l;
  }
  return result;
}

function LevelIcon({ level }: { level: number }) {
  const common = { width: 11, height: 11, viewBox: "0 0 24 24", fill: "none" };
  if (level === 1) {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2.4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (level === 2) {
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (level === 3) {
    return (
      <svg {...common}>
        <path
          d="M12 2l7 3v6c0 5-3.2 8.5-7 11-3.8-2.5-7-6-7-11V5l7-3z"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (level === 4) {
    return (
      <svg {...common}>
        <path
          d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="rgba(34,211,238,0.25)"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        d="M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6L12 2z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="rgba(251,191,36,0.35)"
      />
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
  const [hover, setHover] = useState(false);
  const lvl = getUserLevel(salesCount);
  const dim = size === "sm" ? 20 : 26;

  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", display: "inline-flex" }}
    >
      <span
        style={{
          width: dim,
          height: dim,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1220",
          border: `2px solid ${lvl.ringColor}`,
          boxShadow: lvl.glow || "none",
          cursor: "default",
        }}
      >
        <LevelIcon level={lvl.level} />
      </span>

      {hover && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
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
      )}
    </span>
  );
}
