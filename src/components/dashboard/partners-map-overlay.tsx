"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

import styles from "./partners-map-overlay.module.css";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

type PartnersMapOverlayProps = {
  open: boolean;
  onClose: () => void;
  clinics: Clinic[];
};

type UserCoords = { lat: number; lng: number };

type RankedClinic = Clinic & { tier: number; distanceKm?: number };

const tierLabel = ["Aqui perto", "Na região", "Mais longe"];

async function geocodeCity(city: string, state: string | null): Promise<UserCoords | null> {
  const q = [city, state, "Brasil"].filter(Boolean).join(", ");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "Accept-Language": "pt-BR" } },
    );
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function haversineKm(a: UserCoords, b: UserCoords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function PartnersMapOverlay({ open, onClose, clinics }: PartnersMapOverlayProps) {
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!navigator.geolocation) {
      setGeoError("Localização indisponível neste dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      () => setGeoError("Permita localização para ver parceiros próximos."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [open]);

  const { data: ranked = [] } = useQuery({
    queryKey: ["clinics-ranked", userCoords?.lat, userCoords?.lng, clinics.map((c) => c.id).join(",")],
    queryFn: async (): Promise<RankedClinic[]> => {
      if (!userCoords) {
        return clinics.slice(0, 12).map((c) => ({ ...c, tier: 1 }));
      }
      const withDist: RankedClinic[] = [];
      for (const clinic of clinics.slice(0, 15)) {
        if (!clinic.city) {
          withDist.push({ ...clinic, tier: 2 });
          continue;
        }
        const coords = await geocodeCity(clinic.city, clinic.state);
        if (!coords) {
          withDist.push({ ...clinic, tier: 2 });
          continue;
        }
        const distanceKm = haversineKm(userCoords, coords);
        const tier = distanceKm < 15 ? 0 : distanceKm < 80 ? 1 : 2;
        withDist.push({ ...clinic, tier, distanceKm });
      }
      return withDist.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    },
    enabled: open && clinics.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const pins = useMemo(() => {
    const tiers: Record<number, RankedClinic[]> = { 0: [], 1: [], 2: [] };
    for (const c of ranked) tiers[c.tier].push(c);
    return tiers;
  }, [ranked]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-label="Parceiros próximos" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
          ✕
        </button>
        <h2 className={styles.title}>🏥 Parceiros</h2>
        {geoError && <p className={styles.hint}>{geoError}</p>}
        {!geoError && userCoords && <p className={styles.hint}>Ordenados pela sua localização</p>}

        <div className={styles.mapCanvas}>
          <div className={styles.mapBlob} aria-hidden />
          <div className={styles.youPin}>📍 Você</div>
          {[0, 1, 2].map((tier) =>
            pins[tier].slice(0, 4).map((clinic, i) => {
              const angle = tier * 1.2 + i * 0.9;
              const radius = 28 + tier * 22 + (i % 2) * 8;
              const x = 50 + Math.cos(angle) * radius;
              const y = 48 + Math.sin(angle) * radius * 0.65;
              return (
                <div
                  key={clinic.id}
                  className={styles.clinicPin}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={clinic.name}
                >
                  <span className={styles.pinIcon}>🩺</span>
                  <span className={styles.pinName}>{clinic.name}</span>
                  {clinic.distanceKm != null && (
                    <span className={styles.pinDist}>{Math.round(clinic.distanceKm)} km</span>
                  )}
                </div>
              );
            }),
          )}
        </div>

        <ul className={styles.list}>
          {ranked.slice(0, 6).map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong>
              <span>
                {tierLabel[c.tier]}
                {c.city ? ` · ${c.city}` : ""}
                {c.distanceKm != null ? ` · ${Math.round(c.distanceKm)} km` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
