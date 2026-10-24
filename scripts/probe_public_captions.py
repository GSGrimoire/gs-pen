#!/usr/bin/env python3
"""Single-attempt, read-only feasibility probe. Never persists caption text.

The probe only checks whether a known public caption track can be accessed
without credentials, evasion, paid services, media downloads or proxies.
It is not a production platform adapter.
"""
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

LIMIT_HTML = 2_000_000
LIMIT_CAPTION = 256_000
TIKTOK_EXAMPLE = "https://www.tiktok.com/@scrubdaddy/video/7538539956029902111"
TIKTOK_SECOND_EXAMPLE = "https://www.tiktok.com/@hankgreen1/video/7047596209028074758"
YOUTUBE_EXAMPLE_ID = "jNQXAC9IVRw"
# Require a known social platform's caption asset host before fetching URLs
# embedded in page content. Additional hosts require separate code review.
TRACK_SUFFIXES = ("tiktokcdn.com", "tiktokcdn-us.com", "tiktok.com", "tiktokv.com", "byteoversea.com", "ibytedtos.com")


def is_approved_track_url(url):
    try:
        u = urllib.parse.urlsplit(url)
        host = (u.hostname or "").lower()
        return (u.scheme == "https" and u.username is None and u.password is None
                and u.port is None
                and any(host == suffix or host.endswith("." + suffix) for suffix in TRACK_SUFFIXES))
    except ValueError:
        return False


def parse_vtt(data):
    text = data.decode("utf-8-sig", errors="replace")
    if not text.lstrip().startswith("WEBVTT"):
        return 0
    # A numeric count is enough to confirm a nonempty file.
    return len(re.findall(r"(?m)^\d\d:\d\d(?:\:\d\d)?\.\d{3}\s+-->\s+\d\d:\d\d", text))


def caption_track_urls(page):
    """Find TikTok caption_infos urls in embedded public-page hydration JSON."""
    match = re.search(r'<script[^>]+id=["\x27]__UNIVERSAL_DATA_FOR_REHYDRATION__["\x27][^>]*>(.*?)</script>', page, re.S | re.I)
    if not match:
        return []
    try:
        tree = json.loads(html.unescape(match.group(1)))
    except (ValueError, TypeError):
        return []
    urls = []
    def walk(v):
        if isinstance(v, dict):
            for key, val in v.items():
                if key in ("caption_infos", "captionInfos", "subtitleInfos") and isinstance(val, list):
                    for track in val:
                        if isinstance(track, dict) and isinstance(track.get("url"), str):
                            urls.append(track["url"])
                walk(val)
        elif isinstance(v, list):
            for item in v:
                walk(item)
    walk(tree)
    return list(dict.fromkeys(urls))


class RejectRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def get_small_public_resource(url, limit, accept):
    # No account cookies, browser impersonation, proxy, retries or redirect chaining.
    request = urllib.request.Request(url, headers={
        "User-Agent": "GS-Pen-Feasibility/0.1",
        "Accept": accept
    })
    opener = urllib.request.build_opener(RejectRedirects)
    with opener.open(request, timeout=12) as response:
        if response.status != 200:
            return None, "unexpected_http_status"
        data = response.read(limit + 1)
        if len(data) > limit:
            return None, "too_large"
        return data, None


def probe_tiktok(video_url=TIKTOK_EXAMPLE):
    try:
        page, error = get_small_public_resource(video_url, LIMIT_HTML, "text/html")
        if error:
            return {"status": "blocked_or_error", "reason": error}
        if b"__UNIVERSAL_DATA_FOR_REHYDRATION__" not in page:
            return {"status": "page_without_hydration", "track_verified": False}
        tracks = caption_track_urls(page.decode("utf-8", errors="replace"))
        if not tracks:
            return {"status": "no_track_url_in_public_page", "track_verified": False}
        valid = [url for url in tracks if is_approved_track_url(url)]
        if not valid:
            # Only output the hostname to diagnose provider CDN changes; signed paths and query parameters are sensitive.
            host = urllib.parse.urlsplit(tracks[0]).hostname
            return {"status": "caption_urls_unsupported_host", "track_verified": False, "track_count": len(tracks),
                    "caption_host": host or "unknown"}
        # First approved track only. No recording of the track's words or URL.
        data, error = get_small_public_resource(valid[0], LIMIT_CAPTION, "text/vtt, text/plain")
        if error:
            return {"status": "track_not_retrievable", "reason": error, "track_verified": False}
        cues = parse_vtt(data)
        return {"status": "caption_retrieved" if cues else "unrecognized_caption_data",
                "track_verified": cues > 0, "cues": cues}
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        # Never log request bodies or URLs that could contain signed tokens.
        return {"status": "network_unavailable", "exception": type(exc).__name__, "track_verified": False}


def probe_youtube():
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        tracks = YouTubeTranscriptApi().list(YOUTUBE_EXAMPLE_ID)
        english = tracks.find_transcript(["en"])
        entries = english.fetch()
        segments = len(entries)
        return {"status": "caption_retrieved" if segments else "empty_caption",
                "track_verified": segments > 0, "segments": segments,
                "language": "en", "generated": english.is_generated}
    except Exception as exc:
        # Include only exception type, not a body or third-party API message.
        return {"status": "not_retrieved", "exception": type(exc).__name__, "track_verified": False}


def run():
    return {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "probe": "public-caption-track-samples-without-storage",
        "youtube": probe_youtube(),
        "tiktok": probe_tiktok(),
        "tiktok_second_public_video": probe_tiktok(TIKTOK_SECOND_EXAMPLE),
        "instagram": {"status": "no_verified_caption_endpoint", "track_verified": False},
        "facebook": {"status": "no_verified_caption_endpoint", "track_verified": False}
    }


if __name__ == "__main__":
    results = run()
    print(json.dumps(results, sort_keys=True))
    # Workflow green should establish a live TikTok caption track, not merely
    # a probe that completed and printed "blocked" statuses.
    if "--require-tiktok" in sys.argv and not all(results[k]["track_verified"] for k in ("tiktok", "tiktok_second_public_video")):
        sys.exit(1)


