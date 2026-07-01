# -*- coding: utf-8 -*-
"""MEO提案書ジェネレーター（CLI）
使い方:
  python generate.py --url "https://www.google.com/maps/place/?q=place_id:ChIJ..."
  python generate.py --mock                      # APIキー無しで動作確認
  python generate.py --url "<link>" --out out/xxx.pptx --date 2026年7月

Googleマップのリンク → 店舗データ取得 → 現状診断 → テンプレ差し込み → 提案書PPTX。
"""

import os
import sys
import argparse

# .env を読む（python-dotenvが無ければ簡易パーサ）
def _load_env():
    path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_env()

from industries import resolve_industry, get_profile
from diagnose import diagnose
from fill import fill
import places as places_mod

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "template", "proposal_template.pptx")


def _safe_name(s):
    return "".join(c for c in s if c.isalnum() or c in "　 -_（）()").strip().replace(" ", "_")[:40]


def build_proposal_data(store, date_str):
    ind = resolve_industry(store.get("types"))
    prof = get_profile(ind)
    a1, a2 = store.get("area1", "地域"), store.get("area2", "地域")
    chips = prof["chips"](a1, a2)
    data = {
        "company": store["name"],
        "date": date_str,
        "area1": a1,
        "area2": a2,
        "area_label": "・".join(dict.fromkeys([a1, a2])),  # 重複除去
        "industry": ind,
        "themes": prof["themes"],
        "chips": chips,
        "line2": prof["line2"](a1, a2),
        "diag_rows": diagnose(store, ind),
        "yakkihou": prof["yakkihou"],
    }
    return data


def main():
    ap = argparse.ArgumentParser(description="MEO提案書ジェネレーター")
    ap.add_argument("--url", help="Googleマップのリンク or place_id")
    ap.add_argument("--mock", action="store_true", help="APIキー無しでサンプル生成")
    ap.add_argument("--out", help="出力PPTXパス")
    ap.add_argument("--date", default="2026年7月", help="提案書の日付表記")
    args = ap.parse_args()

    if args.mock:
        store = places_mod.mock_store()
    elif args.url:
        store = places_mod.fetch_place(args.url)
    else:
        ap.error("--url か --mock を指定してください")

    data = build_proposal_data(store, args.date)
    out = args.out or os.path.join(HERE, "out", f"提案書_{_safe_name(store['name'])}.pptx")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    ok = fill(TEMPLATE, out, data)

    print(f"■ 店舗: {store['name']}（{store.get('area1')}｜業種={data['industry']}）")
    print(f"■ 口コミ: {store.get('review_count')}件 / 写真: {store.get('photo_count')}枚 / サイト: {store.get('has_website')}")
    print(f"■ テーマ: {'・'.join(data['themes'])}")
    if data["yakkihou"]:
        print("⚠️  この業種は薬機法・医療広告の注意対象。投稿・口コミ文は保守的な表現で。")
    print(f"■ 診断テーブル反映: {'OK' if ok else '⚠️ 表が見つからない'}")
    print(f"✅ 出力: {out}")


if __name__ == "__main__":
    main()
