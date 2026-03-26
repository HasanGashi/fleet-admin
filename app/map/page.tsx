"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ─── Types ─────────────────────────────────────────────────── */

type DriverLocation = {
  driver_id: string;
  lat: number;
  lon: number;
  heading: number | null;
  updated_at: string;
  drivers: { full_name: string } | null;
  active_order_status: string | null;
};

/* ─── HERE Maps CDN scripts (must load in order) ─────────────── */

const HERE_SCRIPTS = [
  "https://js.api.here.com/v3/3.1/mapsjs-core.js",
  "https://js.api.here.com/v3/3.1/mapsjs-service.js",
  "https://js.api.here.com/v3/3.1/mapsjs-ui.js",
  "https://js.api.here.com/v3/3.1/mapsjs-mapevents.js",
];

/* ─── Fallback demo data (shown when driver_locations is empty) ── */

const DEMO_LOCATIONS: DriverLocation[] = [
  {
    driver_id: "demo-1",
    lat: 45.4654,
    lon: 9.1859,
    heading: 45,
    updated_at: new Date().toISOString(),
    drivers: { full_name: "Demo Driver — John D." },
    active_order_status: "in_transit",
  },
  {
    driver_id: "demo-2",
    lat: 45.0703,
    lon: 7.6869,
    heading: 120,
    updated_at: new Date().toISOString(),
    drivers: { full_name: "Demo Driver — Marc B." },
    active_order_status: "assigned",
  },
  {
    driver_id: "demo-3",
    lat: 44.4056,
    lon: 8.9463,
    heading: 270,
    updated_at: new Date().toISOString(),
    drivers: { full_name: "Demo Driver — Lisa K." },
    active_order_status: null,
  },
];

/* ─── Data fetcher (module-level, no closure over state) ─────── */

async function fetchDriverLocations(): Promise<DriverLocation[]> {
  const { data: locData, error } = await supabase
    .from("driver_locations")
    .select("driver_id, lat, lon, heading, updated_at, drivers(full_name)");

  // Fall back to demo data so the map always renders something useful
  if (error || !locData || locData.length === 0) return DEMO_LOCATIONS;

  const driverIds = locData.map((l: any) => l.driver_id);

  const { data: orderData } = await supabase
    .from("orders")
    .select("driver_id, status")
    .in("driver_id", driverIds)
    .in("status", ["assigned", "in_transit"]);

  // Keep only the first active order per driver
  const orderByDriver = new Map<string, string>();
  (orderData ?? []).forEach((o: any) => {
    if (!orderByDriver.has(o.driver_id)) {
      orderByDriver.set(o.driver_id, o.status);
    }
  });

  return locData.map((l: any) => ({
    driver_id: l.driver_id,
    lat: l.lat,
    lon: l.lon,
    heading: l.heading ?? null,
    updated_at: l.updated_at,
    drivers: l.drivers ?? null,
    active_order_status: orderByDriver.get(l.driver_id) ?? null,
  }));
}

/* ─── Helpers ────────────────────────────────────────────────── */

function statusLabel(status: string | null) {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "in_transit":
      return "In Transit";
    default:
      return "No active order";
  }
}

function markerColor(status: string | null) {
  switch (status) {
    case "in_transit":
      return "#3b82f6"; // blue
    case "assigned":
      return "#f59e0b"; // amber
    default:
      return "#6b7280"; // gray
  }
}

function makeSvgMarker(color: string) {
  return `<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"
      fill="${color}" stroke="white" stroke-width="2"/>
    <text x="18" y="23" text-anchor="middle" fill="white" font-size="14"
      font-family="sans-serif">🚛</text>
  </svg>`;
}

/* ─── Page component ─────────────────────────────────────────── */

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const hMapRef = useRef<any>(null);
  const hUIRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);

  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [sdkReady, setSdkReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  /* ── 1. Load HERE Maps CSS + scripts from CDN ── */
  useEffect(() => {
    // CSS
    if (!document.querySelector("link[data-here-ui]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://js.api.here.com/v3/3.1/mapsjs-ui.css";
      link.setAttribute("data-here-ui", "true");
      document.head.appendChild(link);
    }

    // Already loaded?
    if ((window as any).H?.service?.Platform) {
      setSdkReady(true);
      return;
    }

    const loadScript = (index: number) => {
      if (index >= HERE_SCRIPTS.length) {
        setSdkReady(true);
        return;
      }
      if (document.querySelector(`script[src="${HERE_SCRIPTS[index]}"]`)) {
        loadScript(index + 1);
        return;
      }
      const script = document.createElement("script");
      script.src = HERE_SCRIPTS[index];
      script.onload = () => loadScript(index + 1);
      script.onerror = () =>
        console.error(`HERE script failed to load: ${HERE_SCRIPTS[index]}`);
      document.head.appendChild(script);
    };

    loadScript(0);
  }, []);

  /* ── 2. Initialise HERE map once SDK is ready ── */
  useEffect(() => {
    if (!sdkReady || !mapContainerRef.current || hMapRef.current) return;

    const H = (window as any).H;
    if (!H?.service?.Platform) return;

    const platform = new H.service.Platform({
      apikey: process.env.NEXT_PUBLIC_HERE_API_KEY,
    });
    const defaultLayers = platform.createDefaultLayers();

    const map = new H.Map(
      mapContainerRef.current,
      defaultLayers.vector.normal.map,
      {
        zoom: 7,
        center: { lat: 45.5, lng: 12.0 }, // northern Italy default
        pixelRatio: window.devicePixelRatio || 1,
      },
    );

    // Enable pan / zoom
    new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

    // UI controls (scale bar, zoom buttons, info bubbles)
    const ui = H.ui.UI.createDefault(map, defaultLayers);

    // Marker group
    const group = new H.map.Group();
    map.addObject(group);

    hMapRef.current = map;
    hUIRef.current = ui;
    markerGroupRef.current = group;
    setMapReady(true);

    const handleResize = () => map.getViewPort().resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.dispose();
      hMapRef.current = null;
      hUIRef.current = null;
      markerGroupRef.current = null;
      setMapReady(false);
    };
  }, [sdkReady]);

  /* ── 3. Fetch driver locations + Realtime subscription ── */
  useEffect(() => {
    const refresh = async () => {
      const data = await fetchDriverLocations();
      setLocations(data);
      setIsDemo(data.length > 0 && data[0].driver_id.startsWith("demo-"));
      setLastUpdated(new Date());
    };

    refresh();

    const channel = supabase
      .channel("driver-locations-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ── 4. Sync map markers whenever locations or map change ── */
  useEffect(() => {
    const H = (window as any).H;
    if (!mapReady || !H || !hMapRef.current || !markerGroupRef.current) return;

    const group = markerGroupRef.current;

    // Clear previous markers and close open info bubbles
    group.removeAll();
    hUIRef.current
      ?.getBubbles()
      .forEach((b: any) => hUIRef.current.removeBubble(b));

    locations.forEach((loc) => {
      const name = loc.drivers?.full_name ?? "Unknown Driver";
      const color = markerColor(loc.active_order_status);
      const svg = makeSvgMarker(color);

      const icon = new H.map.Icon(svg, {
        size: { w: 36, h: 44 },
        anchor: { x: 18, y: 44 },
      });

      const marker = new H.map.Marker({ lat: loc.lat, lng: loc.lon }, { icon });

      // Attach data for use inside the event handler
      marker.setData({
        name,
        status: loc.active_order_status,
        lat: loc.lat,
        lng: loc.lon,
      });

      marker.addEventListener("tap", (evt: any) => {
        if (!hUIRef.current) return;
        // Close any previously open bubbles
        hUIRef.current
          .getBubbles()
          .forEach((b: any) => hUIRef.current.removeBubble(b));

        const d = evt.target.getData();
        const bubble = new H.ui.InfoBubble(
          { lat: d.lat, lng: d.lng },
          {
            content: `
              <div style="padding:8px 12px;min-width:140px;font-family:sans-serif">
                <div style="font-weight:600;font-size:14px">${d.name}</div>
                <div style="font-size:12px;color:#555;margin-top:3px">${statusLabel(d.status)}</div>
              </div>`,
          },
        );
        hUIRef.current.addBubble(bubble);
      });

      group.addObject(marker);
    });

    // Fit viewport to show all markers
    if (locations.length > 0) {
      const bounds = group.getBoundingBox();
      if (bounds) {
        hMapRef.current
          .getViewModel()
          .setLookAtData({ bounds }, /* animate */ true);
      }
    }
  }, [locations, mapReady]);

  /* ── 5. "Last updated X seconds ago" ticker ── */
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  /* ─── Render ──────────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Live Fleet Map</h1>
        <p className="text-sm text-muted-foreground">
          Real-time driver positions · updates automatically
        </p>
      </div>

      {/* Map container */}
      <div className="flex-1 rounded-lg border overflow-hidden relative min-h-[400px]">
        {!sdkReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <p className="text-muted-foreground text-sm">Loading map…</p>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Footer: driver count + last-updated */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {locations.length === 0
            ? "No active drivers"
            : `${isDemo ? "3 demo" : locations.length} driver${locations.length !== 1 ? "s" : ""}`}
          {isDemo && (
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5">
              Demo data — no real GPS yet
            </span>
          )}
        </span>
        {lastUpdated && (
          <span>
            Last updated:{" "}
            {secondsAgo < 5
              ? "just now"
              : `${secondsAgo} second${secondsAgo !== 1 ? "s" : ""} ago`}
          </span>
        )}
      </div>
    </div>
  );
}
