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
        className="planner-control flex w-full items-center justify-between px-3 py-2 text-[14px]"
        aria-expanded={open}
      >
        <span>Bookmarks</span>
        <span className="planner-muted text-[12px]">{bookmarks.length}</span>
      </button>
      {open ? (
        <div className="planner-panel mt-2 p-2 text-[14px]">
          {bookmarks.length === 0 ? (
            <p className="planner-muted text-[12px]">
              No bookmarks yet. Save the current view to start.
            </p>
          ) : (
            <ul className="mb-2 space-y-1">
              {bookmarks.map((bookmark) => (
                <li key={bookmark.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => flyTo(bookmark)}
                    className="planner-row flex-1 truncate px-2 py-1.5 text-left"
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
                      className="planner-iconbtn flex h-6 w-6 items-center justify-center text-[12px]"
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
            <div className="planner-divider mt-2 flex items-center gap-1.5 pt-2">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Bookmark name"
                aria-label="Bookmark name"
                className="planner-input min-h-[28px] flex-1 px-2 py-1 text-[12px]"
              />
              <button
                type="button"
                onClick={saveCurrent}
                disabled={!draftName.trim()}
                className="planner-button min-h-[28px] px-2 py-1 text-[12px] disabled:cursor-not-allowed"
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
