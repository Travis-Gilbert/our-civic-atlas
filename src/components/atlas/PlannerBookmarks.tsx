"use client";

/**
 * Camera bookmarks menu for the planner chrome.
 *
 * Each row is a saved camera state (lng/lat/zoom/pitch/bearing).
 * Click to fly. The "Save current view" button captures the live
 * MapRef state and posts a new bookmark.
 *
 * High-leverage for the day-of: in 3D mode the camera has six
 * degrees of freedom, and rebuilding "the angle Derek liked" by
 * hand is annoying. A bookmark is a one-click teleport.
 */

import { useState } from "react";
import { useMutation, useQuery } from "urql";
import type { MapRef } from "react-map-gl/maplibre";

import {
  CameraBookmarksDocument,
  CreateBookmarkDocument,
  DeleteBookmarkDocument,
  type CameraBookmarksQuery,
} from "@/lib/api/graphql/generated/graphql";

type Bookmark = CameraBookmarksQuery["cameraBookmarks"][number];

export interface PlannerBookmarksProps {
  readonly eventSlug: string;
  readonly mapRef: MapRef | null;
  readonly canEdit: boolean;
  readonly onError: (message: string) => void;
}

export function PlannerBookmarks({
  eventSlug,
  mapRef,
  canEdit,
  onError,
}: PlannerBookmarksProps) {
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [bookmarksResult] = useQuery({
    query: CameraBookmarksDocument,
    variables: { tenantSlug: "flint", eventSlug },
    requestPolicy: "cache-and-network",
  });
  const [, createBookmark] = useMutation(CreateBookmarkDocument);
  const [, deleteBookmark] = useMutation(DeleteBookmarkDocument);

  const bookmarks = bookmarksResult.data?.cameraBookmarks ?? [];

  const flyTo = (bookmark: Bookmark) => {
    if (!mapRef) return;
    mapRef.easeTo({
      center: [bookmark.centerLng, bookmark.centerLat],
      zoom: bookmark.zoom,
      pitch: bookmark.pitch,
      bearing: bookmark.bearing,
      duration: 900,
    });
    setOpen(false);
  };

  const saveCurrent = () => {
    if (!mapRef) {
      onError("Map not ready yet");
      return;
    }
    const name = draftName.trim();
    if (!name) {
      onError("Bookmark needs a name");
      return;
    }
    const center = mapRef.getCenter();
    void createBookmark({
      input: {
        eventSlug,
        name,
        centerLng: center.lng,
        centerLat: center.lat,
        zoom: mapRef.getZoom(),
        pitch: mapRef.getPitch(),
        bearing: mapRef.getBearing(),
      },
    }).then((result) => {
      if (result.error) {
        onError(result.error.message);
        return;
      }
      setDraftName("");
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-stone-300 bg-white/70 px-3 py-2 text-sm text-stone-700 hover:border-stone-500"
        aria-expanded={open}
      >
        <span>Bookmarks</span>
        <span className="text-xs text-stone-500">{bookmarks.length}</span>
      </button>
      {open ? (
        <div className="mt-2 rounded-md border border-stone-300 bg-white/95 p-2 text-sm shadow">
          {bookmarks.length === 0 ? (
            <p className="text-xs text-stone-500">
              No bookmarks yet. Save the current view to start.
            </p>
          ) : (
            <ul className="mb-2 space-y-1">
              {bookmarks.map((bookmark) => (
                <li key={bookmark.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => flyTo(bookmark)}
                    className="flex-1 truncate rounded px-2 py-1 text-left hover:bg-stone-100"
                  >
                    {bookmark.name}
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Delete "${bookmark.name}"?`)) return;
                        void deleteBookmark({
                          input: {
                            bookmarkId: bookmark.id,
                            expectedVersion: bookmark.version,
                          },
                        }).then((result) => {
                          if (result.error) onError(result.error.message);
                        });
                      }}
                      className="rounded px-1 text-xs text-stone-500 hover:text-red-700"
                      aria-label={`Delete bookmark ${bookmark.name}`}
                    >
                      ✕
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {canEdit ? (
            <div className="flex items-center gap-1.5 border-t border-stone-200 pt-2">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Bookmark name…"
                className="flex-1 rounded border border-stone-300 bg-white px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={saveCurrent}
                disabled={!draftName.trim()}
                className="rounded bg-stone-900 px-2 py-1 text-xs text-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
