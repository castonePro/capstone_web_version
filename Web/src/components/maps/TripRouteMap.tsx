"use client";

/**
 * 일정 상세 페이지용 — 하루 코스의 장소들을 지도에 순서대로 찍고 이동 정보를 보여준다.
 *
 * 지도 표시(마커)는 Google Maps JavaScript API를 쓴다. 경로 계산(선·거리·소요시간)은
 * 자동차 모드의 경우 백엔드가 대신 호출하는 네이버클라우드 Directions 5 API 결과를 받아온다
 * (GET /api/v1/routes/drive). 네이버 Directions API는 도보 모드를 지원하지 않으므로,
 * 도보는 직선거리(하버사인 공식) 기반 추정치만 보여준다 — 실제 도로를 따라가는 선이 아니라
 * 점선으로 표시해서 "추정치"라는 걸 시각적으로도 구분한다.
 *
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY가 없으면 지도 대신 안내 문구를 보여준다(에러로 죽지 않음).
 */
import { useEffect, useMemo, useState } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/i18n/useFormat";
import { Chip, EmptyState } from "@/components/ui";
import { routeApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { MapErrorBoundary } from "@/components/maps/MapErrorBoundary";

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

/** 좌표값이 지도에 그릴 수 있는 유효한 값인지 확인한다 (NaN, null, 범위 초과 방지) */
function isValidPoint(p: { lat: number; lng: number } | null | undefined): p is { lat: number; lng: number } {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

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

/**
 * routeApi.drive() 실패 원인을 콘솔에 상세히 남긴다.
 * 화면에는 항상 번역된 일반 안내 문구(routeError)만 보여주고, 원인 분류는 로그로만 남겨서
 * 디버깅은 가능하게 하되 사용자에게 기술적인 에러 문자열이 그대로 노출되지 않게 한다.
 */
function logRouteError(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 0) {
      console.error("[TripRouteMap] 경로 요청 네트워크/타임아웃 오류:", e.code, e.message);
    } else if (e.status >= 500) {
      console.error("[TripRouteMap] 경로 API 서버 오류:", e.status, e.message);
    } else {
      console.error("[TripRouteMap] 경로 API 요청 오류:", e.status, e.message);
    }
  } else if (e instanceof Error) {
    console.error("[TripRouteMap] 경로 계산 중 알 수 없는 오류:", e.message);
  } else {
    console.error("[TripRouteMap] 경로 계산 중 알 수 없는 오류:", e);
  }
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
    if (typeof google === "undefined" || !google.maps) return;

    try {
      if (points.length === 1) {
        map.setCenter({ lat: points[0].lat, lng: points[0].lng });
        map.setZoom(15);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 56);
    } catch (e) {
      // 지도 범위 조정은 부가 기능이므로 실패해도 화면 자체를 깨뜨리지 않는다.
      console.error("[TripRouteMap] 지도 범위 조정 실패:", e);
    }
  }, [map, points]);

  // 경로 계산 + 경로선 그리기
  useEffect(() => {
    if (!map || points.length < 2) {
      onSummary(null);
      return;
    }
    if (typeof google === "undefined" || !google.maps) {
      // Google Maps 스크립트가 아직 로드되지 않은 상태 — 다음 렌더에서 map이 갱신되면 다시 시도된다.
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
        const allMiddle = points.slice(1, -1);
        const middle = allMiddle.slice(0, MAX_WAYPOINTS);
        if (allMiddle.length > MAX_WAYPOINTS) {
          // 백엔드(Directions 5 API)가 경유지 5개를 넘기면 400으로 거부하므로 여기서 먼저 잘라 보낸다.
          // 화면에 찍힌 마커 전부가 경로선에 반영되지는 않는다는 뜻이라 콘솔에는 남겨 둔다.
          console.warn(
            `[TripRouteMap] 경유지가 ${allMiddle.length}개라 최대 ${MAX_WAYPOINTS}개까지만 경로 계산에 사용합니다.`,
          );
        }
        const waypoints = middle.length > 0 ? middle.map((p) => `${p.lat},${p.lng}`).join("|") : undefined;

        const result = await routeApi.drive({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: dest.lat,
          destLng: dest.lng,
          waypoints,
        });

        if (cancelled) return;

        if (!Number.isFinite(result.distanceMeters) || !Number.isFinite(result.durationSec)) {
          throw new Error("경로 API 응답 값이 올바르지 않습니다.");
        }

        onSummary({
          distanceMeters: result.distanceMeters,
          durationSec: result.durationSec,
          estimated: false,
        });

        const validPathPoints = (result.path ?? []).filter(isValidPoint);
        if (validPathPoints.length > 0) {
          polyline = new google.maps.Polyline({
            path: validPathPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
            strokeColor: "#ff6b4a",
            strokeOpacity: 0.9,
            strokeWeight: 4,
            map,
          });
        }
      } catch (e) {
        if (!cancelled) {
          onSummary(null);
          logRouteError(e);
          onError("routeError");
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

export function TripRouteMap({ points: rawPoints }: { points: TripRoutePoint[] }) {
  const t = useTranslations("maps");
  const f = useFormat();
  const [mode, setMode] = useState<TravelMode>("WALK");
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 좌표가 없거나 범위를 벗어난 장소는 지도에 그릴 수 없으므로 미리 걸러낸다.
  const points = useMemo(() => rawPoints.filter((p) => isValidPoint(p)), [rawPoints]);

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
        <MapErrorBoundary
          resetKey={points}
          fallback={<EmptyState title={t("mapError")} />}
        >
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
        </MapErrorBoundary>
      </div>
    </div>
  );
}
