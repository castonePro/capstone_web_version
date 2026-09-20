"use client";

/**
 * 일정 지도용 실시간 위치 기능 — 내 위치 표시, 따라가기(팔로우 카메라), 다음 장소까지 남은 거리/ETA.
 *
 * - 위치: 브라우저 navigator.geolocation.watchPosition (HTTPS 또는 localhost에서만 동작)
 * - 거리/ETA: 추가 API 호출 없이 하버사인 직선거리 × 우회 계수로 추정한다 (비용 0).
 * - 기존 TripRouteMap의 경로 계산/표시 로직은 건드리지 않고, 켰을 때만 동작하는 부가 레이어다.
 */
import { useEffect, useRef, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export interface GeoPosition {
  lat: number;
  lng: number;
  /** 정확도 반경(미터) */
  accuracy: number;
}

export type GeoError = "denied" | "unavailable" | "insecure" | "unsupported";

/** 도착으로 간주하는 반경(미터) — GPS 오차를 감안해 넉넉히 */
export const ARRIVE_RADIUS_M = 50;

/** 직선거리 → 실제 이동거리 보정 계수 (도심 평균 우회율 근사) */
const DETOUR_FACTOR = 1.3;

/** 이동 수단별 평균 속도(m/s): 도보 4km/h, 자동차 도심 평균 25km/h */
const SPEED_M_PER_SEC = { WALK: 4000 / 3600, DRIVE: 25000 / 3600 } as const;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 직선거리(m)와 이동 수단으로 예상 소요시간(초)을 추정한다 */
export function estimateEtaSec(straightMeters: number, mode: "WALK" | "DRIVE"): number {
  return (straightMeters * DETOUR_FACTOR) / SPEED_M_PER_SEC[mode];
}

/** enabled일 때만 위치를 추적한다. 끄면 watch를 해제하고 상태를 초기화한다. */
export function useGeolocation(enabled: boolean) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<GeoError | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPosition(null);
      setError(null);
      return;
    }
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("unsupported");
      return;
    }
    if (!window.isSecureContext) {
      // 브라우저 정책상 HTTP(비보안) 페이지에서는 위치 API가 막혀 있다.
      setError("insecure");
      return;
    }

    setError(null);
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      (e) => {
        setError(e.code === e.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return { position, error };
}

/**
 * <Map> 내부에서 쓰는 레이어: 내 위치 마커(파란 점) + 정확도 원을 그리고,
 * follow가 켜져 있으면 위치가 바뀔 때마다 지도 중심을 옮긴다.
 * 사용자가 지도를 직접 드래그하면 onUserDrag를 호출해 따라가기를 끌 수 있게 한다.
 */
export function LiveLocationLayer({
  position,
  follow,
  onUserDrag,
}: {
  position: GeoPosition | null;
  follow: boolean;
  onUserDrag: () => void;
}) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const zoomedRef = useRef(false);
  const onUserDragRef = useRef(onUserDrag);
  onUserDragRef.current = onUserDrag;

  // 드래그 감지 → 따라가기 해제
  useEffect(() => {
    if (!map) return;
    const l = map.addListener("dragstart", () => onUserDragRef.current());
    return () => l.remove();
  }, [map]);

  // 마커/원 생성·갱신
  useEffect(() => {
    if (!map || !position || typeof google === "undefined" || !google.maps) return;
    try {
      const center = { lat: position.lat, lng: position.lng };
      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          map,
          position: center,
          zIndex: 999,
          clickable: false,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#1a73e8",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });
        circleRef.current = new google.maps.Circle({
          map,
          center,
          radius: position.accuracy,
          clickable: false,
          strokeOpacity: 0,
          fillColor: "#1a73e8",
          fillOpacity: 0.12,
        });
      } else {
        markerRef.current.setPosition(center);
        circleRef.current?.setCenter(center);
        circleRef.current?.setRadius(position.accuracy);
      }
    } catch (e) {
      console.error("[LiveLocationLayer] 내 위치 표시 실패:", e);
    }
  }, [map, position]);

  // 따라가기
  useEffect(() => {
    if (!map || !position || !follow) return;
    try {
      map.panTo({ lat: position.lat, lng: position.lng });
      if (!zoomedRef.current) {
        // 처음 따라가기를 시작할 때만 한 번 확대한다 (사용자가 바꾼 줌은 유지).
        if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
        zoomedRef.current = true;
      }
    } catch (e) {
      console.error("[LiveLocationLayer] 따라가기 이동 실패:", e);
    }
  }, [map, position, follow]);

  // 레이어가 사라질 때(내 위치 끔) 지도에서 제거
  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
      circleRef.current?.setMap(null);
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  return null;
}
