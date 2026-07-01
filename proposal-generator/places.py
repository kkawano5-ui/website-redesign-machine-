# -*- coding: utf-8 -*-
"""Googleマップのリンク → Place ID → 店舗データ取得。
Places API (New) を使用。APIキーは .env の PLACES_API_KEY から。
キーが無い/取得失敗時のために mock_store() も用意。"""

import os
import re
import json
import urllib.request
import urllib.parse

PLACES_ENDPOINT = "https://places.googleapis.com/v1/places/{pid}"
FIELD_MASK = ",".join([
    "id", "displayName", "formattedAddress", "addressComponents",
    "primaryType", "types", "rating", "userRatingCount",
    "photos", "regularOpeningHours", "nationalPhoneNumber", "websiteUri",
    "businessStatus",
])


def extract_place_id(url_or_id):
    """マップのリンクや place_id 文字列から Place ID を取り出す。
    対応: place_id:ChIJ...／?q=place_id:...／生のChIJ...。
    短縮URL(maps.app.goo.gl)やplace名だけのURLはリダイレクト解決を試みる。"""
    s = url_or_id.strip()
    m = re.search(r"place_id:([A-Za-z0-9_\-]+)", s)
    if m:
        return m.group(1)
    if re.fullmatch(r"ChI[A-Za-z0-9_\-]+", s):
        return s
    m = re.search(r"[?&]place_id=([A-Za-z0-9_\-]+)", s)
    if m:
        return m.group(1)
    # 短縮URL等はリダイレクト先を見て再抽出（ベストエフォート）
    if s.startswith("http"):
        try:
            req = urllib.request.Request(s, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                final = r.geturl()
                body = r.read(200000).decode("utf-8", "ignore")
            m = re.search(r"place_id:([A-Za-z0-9_\-]+)", final + body)
            if m:
                return m.group(1)
            m = re.search(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)", body)  # ftid fallback
            if m:
                return m.group(1)
        except Exception as e:
            raise SystemExit(f"[place_id抽出失敗] {e}\n→ リンクに place_id が含まれていません。"
                             f" 例: https://www.google.com/maps/place/?q=place_id:ChIJ... を使ってください。")
    raise SystemExit("Place IDを特定できませんでした。place_id付きのリンクを渡してください。")


def _area_parts(components, formatted):
    """住所コンポーネントから代表エリア2つ（例: 鶴見・横浜）を推定。"""
    locality = ward = pref = None
    for c in components or []:
        t = c.get("types", [])
        if "sublocality_level_1" in t or "ward" in t:
            ward = c.get("longText") or c.get("shortText")
        elif "locality" in t:
            locality = c.get("longText")
        elif "administrative_area_level_1" in t:
            pref = c.get("longText")
    a1 = ward or locality or (pref or "")
    a1 = re.sub(r"(区|市|町|村)$", "", a1) if a1 else ""
    a2 = locality or pref or a1
    a2 = re.sub(r"(市|都|府|県)$", "", a2) if a2 else a1
    return a1 or "地域", a2 or (a1 or "地域")


def fetch_place(url_or_id, api_key=None):
    api_key = api_key or os.environ.get("PLACES_API_KEY")
    if not api_key:
        raise SystemExit("PLACES_API_KEY が未設定です（.env に入れてください）。"
                         " テスト目的なら --mock を使ってください。")
    pid = extract_place_id(url_or_id)
    url = PLACES_ENDPOINT.format(pid=urllib.parse.quote(pid))
    req = urllib.request.Request(url, headers={
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        raise SystemExit(f"[Places API 失敗] {e}\n→ キーの有効化(Places API New)・課金・"
                         f"リファラ制限を確認してください。")
    return _parse(data)


def _parse(data):
    comps = data.get("addressComponents", [])
    a1, a2 = _area_parts(comps, data.get("formattedAddress", ""))
    return {
        "place_id": data.get("id"),
        "name": (data.get("displayName") or {}).get("text", "店舗"),
        "address": data.get("formattedAddress", ""),
        "area1": a1,
        "area2": a2,
        "types": ([data.get("primaryType")] if data.get("primaryType") else []) + data.get("types", []),
        "rating": data.get("rating"),
        "review_count": data.get("userRatingCount", 0),
        "photo_count": len(data.get("photos", []) or []),
        "has_website": bool(data.get("websiteUri")),
        "has_hours": bool(data.get("regularOpeningHours")),
        "has_phone": bool(data.get("nationalPhoneNumber")),
    }


def mock_store():
    """APIキーが無い環境での動作確認用サンプル（美容室）。"""
    return {
        "place_id": "MOCK",
        "name": "サンプル美容室 大宮店",
        "address": "埼玉県さいたま市大宮区…",
        "area1": "大宮",
        "area2": "さいたま",
        "types": ["hair_salon", "beauty_salon"],
        "rating": 4.3,
        "review_count": 8,
        "photo_count": 6,
        "has_website": False,
        "has_hours": True,
        "has_phone": True,
    }
