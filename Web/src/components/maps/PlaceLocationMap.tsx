"use client";

/**
 * 관광지 상세 페이지용 — 좌표 하나를 정적으로 보여주는 지도.
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY가 없으면 지도 대신 안내 문구를 보여준다(에러로 죽지 않음).
 */
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui";
import { MapErrorBoundary } from "@/components/maps/MapErrorBoundary";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function PlaceLocationMap({
  latitude,
  longitude,
  title,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  title: string;
}) {
  const t = useTranslations("maps");

  // TourAPI 원본 데이터에 좌표가 없거나 값이 이상한 장소가 있을 수 있어, 그런 경우는 지도 자체를 숨긴다.
  if (!isValidCoordinate(latitude, longitude)) return null;

  if (!API_KEY) {
    return (
      <div className="overflow-hidden rounded-[12px] border border-dashed border-line py-6">
        <EmptyState title={t("noApiKey")} />
      </div>
    );
  }

  const position = { lat: latitude, lng: longitude as number };

  return (
    <div className="overflow-hidden rounded-[12px] border border-line" style={{ height: 220 }}>
      <MapErrorBoundary
        resetKey={`${position.lat},${position.lng}`}
        fallback={<EmptyState title={t("mapError")} />}
      >
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={position}
            defaultZoom={15}
            gestureHandling="cooperative"
            disableDefaultUI={false}
          >
            <Marker position={position} title={title} />
          </Map>
        </APIProvider>
      </MapErrorBoundary>
    </div>
  );
}
