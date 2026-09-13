"use client";

/**
 * 일정 상세 페이지용 — 하루 코스의 장소들을 지도에 순서대로 찍고 이동 정보를 보여준다.
 *
 * 지도 표시(마커)는 Google Maps JavaScript API를 쓴다 — 이건 한국에서도 정상 작동한다.
 * 경로 계산(선·거리·소요시간)은 원래 구글 Routes API를 썼는데, 한국 내 경로는
 * 한국 정부의 정밀지도 데이터 반출 규제 때문에 구글이 아직 응답을 못 내려줘서
 * (HTTP 200이지만 routes가 빈 배열, 2026-09 확인) 자동차 모드는 백엔드가 대신
 * 호출하는 네이버클라우드 Directions 5 API로 교체했다 (GET /api/v1/routes/drive).
 *
 * 네이버 Directions API는 도보 모드를 지원하지 않아서, 도보는 직선거리
 * (하버사인 공식) 기반 추정치만 보여준다 — 실제 도로를 따라가는 선이 아니라
 * 점선으로 표시해서 "추정치"라는 걸 시각적으로도 구분한다.
 *
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY가 없으면 지도 대신 안내 문구를 보여준다(에러로 죽지 않음).
 */
import { useEffect, useState } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/i18n/useFormat";
import { Chip, EmptyState } from "@/components/ui";
import { routeApi } from "@/lib/api/endpoints";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface TripRoutePoint {
  id: number | string;
  lat: number;
  lng: number;
  label: string;
}

type TravelMode = "WALK" | "DRIVE";

interface RouteSummary {
  distanceMeters: number;
  durationSec: number;
  /** 실제 도로 경로가 아니라 직선거리 추정치인지 (도보 모드) */
  estimated: boolean;
}

// Directions 5 API 제한: 경유지 최대 5개
const MAX_WAYPOINTS = 5;

// 도보 예상 속도: 시속 4km (평균 성인 도보 속도) — 소요시간 추정용
const WALK_SPEED_M_PER_SEC = 4000 / 3600;

/** 하버사인 공식 — 위경도 두 점 사이의 직선거리(미터) */
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// APIProvider/Map 내부에서만 쓸 수 있는 google.maps 인스턴스(useMap)로
// 마커 범위 맞추기 + 경로 계산 + 경로선(Polyline) 렌더링을 담당한다.
function RouteController({
  points,
  mode,
  onSummary,
  onError,
}: {
  points: TripRoutePoint[];
  mode: TravelMode;
  onSummary: (s: RouteSummary | null) => void;
  onError: (e: string | null) => void;
}) {
  const map = useMap();

  // 마커 전체가 보이도록 지도 범위 맞추기
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 56);
  }, [map, points]);

  // 경로 계산 + 경로선 그리기
  useEffect(() => {
    if (!map || points.length < 2) {
      onSummary(null);
      return;
    }

    let cancelled = false;
    let polyline: google.maps.Polyline | null = null;
    onError(null);

    async function run() {
      try {
        if (mode === "WALK") {
          // 네이버 Directions API는 도보를 지원하지 않아서 직선거리로만 추정한다.
          let total = 0;
          for (let i = 0; i < points.length - 1; i++) {
            total += haversineMeters(points[i], points[i + 1]);
          }
          if (cancelled) return;
          onSummary({
            distanceMeters: total,
            durationSec: total / WALK_SPEED_M_PER_SEC,
            estimated: true,
          });
          polyline = new google.maps.Polyline({
            path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
            strokeColor: "#ff6b4a",
            strokeOpacity: 0,
            strokeWeight: 3,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 0.8, scale: 3 },
                offset: "0",
                repeat: "12px",
              },
            ],
            map,
          });
          return;
        }

        // DRIVE: 백엔드가 대신 네이버클라우드 Directions API를 호출해서 실제 도로 경로를 받아온다.
        const origin = points[0];
        const dest = points[points.length - 1];
        const middle = points.slice(1, -1).slice(0, MAX_WAYPOINTS);
        const waypoints = middle.length > 0 ? middle.map((p) => `${p.lat},${p.lng}`).join("|") : undefined;

        const result = await routeApi.drive({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: dest.lat,
          destLng: dest.lng,
          waypoints,
        });

        if (cancelled) return;
        onSummary({
          distanceMeters: result.distanceMeters,
          durationSec: result.durationSec,
          estimated: false,
        });

        if (result.path && result.path.length > 0) {
          polyline = new google.maps.Polyline({
            path: result.path.map((p) => ({ lat: p.lat, lng: p.lng })),
            strokeColor: "#ff6b4a",
            strokeOpacity: 0.9,
            strokeWeight: 4,
            map,
          });
        }
      } catch (e) {
        if (!cancelled) {
          onSummary(null);
          onError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      polyline?.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points, mode]);

  return null;
}

export function TripRouteMap({ points }: { points: TripRoutePoint[] }) {
  const t = useTranslations("maps");
  const f = useFormat();
  const [mode, setMode] = useState<TravelMode>("WALK");
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (points.length === 0) return null;

  if (!API_KEY) {
    return (
      <div className="mb-4 overflow-hidden rounded-[12px] border border-dashed border-line py-6">
        <EmptyState title={t("noApiKey")} />
      </div>
    );
  }

  const distanceLabel =
    summary == null
      ? null
      : summary.distanceMeters >= 1000
        ? `${(summary.distanceMeters / 1000).toFixed(1)}km`
        : `${Math.round(summary.distanceMeters)}m`;
  const durationLabel = summary == null ? null : f.minutes(Math.round(summary.durationSec / 60));

  return (
    <div className="mb-4">
      {points.length > 1 && (
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            <Chip active={mode === "WALK"} onClick={() => setMode("WALK")}>
              {t("walk")}
            </Chip>
            <Chip active={mode === "DRIVE"} onClick={() => setMode("DRIVE")}>
              {t("drive")}
            </Chip>
          </div>
          <p className="text-[13px] font-medium text-ink2">
            {error
              ? t("routeError")
              : distanceLabel && durationLabel
                ? `${distanceLabel} · ${durationLabel}${summary?.estimated ? ` (${t("estimated")})` : ""}`
                : t("calculating")}
          </p>
        </div>
      )}
      <div className="overflow-hidden rounded-[12px] border border-line" style={{ height: 280 }}>
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={{ lat: points[0].lat, lng: points[0].lng }}
            defaultZoom={13}
            gestureHandling="cooperative"
            disableDefaultUI={false}
          >
            {points.map((p, i) => (
              <Marker key={p.id} position={{ lat: p.lat, lng: p.lng }} label={String(i + 1)} title={p.label} />
            ))}
            <RouteController points={points} mode={mode} onSummary={setSummary} onError={setError} />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
