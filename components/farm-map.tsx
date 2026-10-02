"use client";

import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { Farm, GeoFeatureCollection } from "@/types";

export function FarmMap({ data, farm }: { data: GeoFeatureCollection; farm?: Farm }) {
  const bounds = L.geoJSON(data as unknown as GeoJSON.GeoJsonObject).getBounds();
  if (!data.features.some((feature) => feature.geometry)) {
    return <div className="map-empty">No field boundaries are available for this farm.</div>;
  }

  return (
    <div className="map-frame">
      <MapContainer
        bounds={bounds.isValid() ? bounds : undefined}
        center={[Number(farm?.latitude ?? 0), Number(farm?.longitude ?? 0)]}
        zoom={13}
        scrollWheelZoom
        className="farm-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          data={data as unknown as GeoJSON.GeoJsonObject}
          style={(feature) => {
            const ndvi = Number(feature?.properties?.ndvi);
            const color = !Number.isFinite(ndvi) ? "#718078" : ndvi >= 0.65 ? "#34845a" : ndvi >= 0.35 ? "#d1a23c" : "#c54b42";
            return { color, weight: 2, fillColor: color, fillOpacity: 0.24 };
          }}
          onEachFeature={(feature, layer) => {
            const name = String(feature.properties?.name ?? "Field");
            const ndvi = feature.properties?.ndvi;
            layer.bindTooltip(`${name}${ndvi == null ? "" : ` · NDVI ${Number(ndvi).toFixed(2)}`}`);
          }}
        />
      </MapContainer>
    </div>
  );
}