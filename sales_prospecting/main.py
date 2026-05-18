#!/usr/bin/env python3
"""
Sales Prospecting Automation CLI
SNSマーケティング支援サービスの営業先リスト作成自動化ツール
"""
import json
import logging
import sys
from pathlib import Path

import click
from dotenv import load_dotenv

load_dotenv()

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "prospecting.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

VALID_CATEGORIES = ["overseas_send", "overseas_receive", "women_products"]
CATEGORY_LABELS = {
    "overseas_send":    "海外に日本人を送っている法人",
    "overseas_receive": "海外で日本人を受け入れている法人",
    "women_products":   "女性向け商材を扱う法人",
}


@click.group()
@click.option("--config", default=None, help="config.yamlのパス（省略時はデフォルト）")
@click.pass_context
def cli(ctx, config):
    """SNSマーケティング支援 営業リスト自動生成ツール (RAHA KENYA / 合同会社Asante Sana)"""
    ctx.ensure_object(dict)
    ctx.obj["config"] = config


@cli.command()
@click.option(
    "--category", "-c",
    required=True,
    type=click.Choice(VALID_CATEGORIES),
    help="対象カテゴリ",
)
@click.option("--limit", "-l", default=100, show_default=True, help="収集する最大URL数")
@click.option("--save/--no-save", default=True, show_default=True,
              help="logs/pending_urls.json に保存するか")
@click.pass_context
def collect(ctx, category, limit, save):
    """STEP1: キーワード検索で候補URLを収集する"""
    from src.pipeline.collector import collect_urls
    from src.pipeline.enricher import save_pending

    logger.info(f"=== collect 開始: category={category}, limit={limit} ===")
    items = collect_urls(category=category, limit=limit, config_path=ctx.obj["config"])
    click.echo(f"収集件数: {len(items)}")

    if save and items:
        save_pending(items)
        click.echo(f"logs/pending_urls.json に保存しました ({len(items)}件)")


@cli.command()
@click.pass_context
def enrich(ctx):
    """STEP2: pending_urls.json のURLをサイト解析してGoogle Sheetsに保存する"""
    from src.pipeline.enricher import enrich as run_enrich

    logger.info("=== enrich 開始 ===")
    stats = run_enrich(config_path=ctx.obj["config"])
    click.echo(
        f"結果: 追加={stats['added']}, 対象外={stats['excluded']}, エラー={stats['errors']}"
    )


@cli.command("generate_copy")
@click.pass_context
def generate_copy(ctx):
    """STEP3: Google Sheetsの収集済み行にAI営業文面を生成する"""
    from src.pipeline.copy_generator import generate_copy as run_gen

    logger.info("=== generate_copy 開始 ===")
    stats = run_gen(config_path=ctx.obj["config"])
    click.echo(f"結果: 処理={stats['processed']}, エラー={stats['errors']}")


@cli.command("create_gmail_drafts")
@click.pass_context
def create_gmail_drafts(ctx):
    """STEP4: 文面生成済み・Email宛先の行にGmail下書きを作成する（自動送信なし）"""
    from src.pipeline.gmail_drafter import create_gmail_drafts as run_drafts

    logger.info("=== create_gmail_drafts 開始 ===")
    stats = run_drafts(config_path=ctx.obj["config"])
    click.echo(
        f"結果: 作成={stats['created']}, スキップ={stats['skipped']}, エラー={stats['errors']}"
    )


@cli.command("export")
@click.option(
    "--format", "fmt",
    type=click.Choice(["xlsx", "csv"]),
    default="xlsx",
    show_default=True,
    help="出力形式",
)
@click.option(
    "--category", "-c",
    type=click.Choice(VALID_CATEGORIES + ["all"]),
    default="all",
    show_default=True,
    help="絞り込むカテゴリ（all=全件）",
)
@click.pass_context
def export_cmd(ctx, fmt, category):
    """Google Sheetsの営業リストを Excel/CSV でエクスポートする（送信可=可 のみ）"""
    from src.pipeline.exporter import export

    logger.info(f"=== export 開始: format={fmt}, category={category} ===")
    cat_filter = None if category == "all" else CATEGORY_LABELS.get(category, category)
    out_path = export(fmt=fmt, category_filter=cat_filter, config_path=ctx.obj["config"])
    click.echo(f"出力完了: {out_path}")


@cli.command("run_all")
@click.option(
    "--category", "-c",
    required=True,
    type=click.Choice(VALID_CATEGORIES),
    help="対象カテゴリ",
)
@click.option("--limit", "-l", default=100, show_default=True, help="収集する最大URL数")
@click.option("--skip-gmail", is_flag=True, default=False, help="Gmail下書き作成をスキップする")
@click.option(
    "--export-format", "export_fmt",
    type=click.Choice(["xlsx", "csv", "none"]),
    default="xlsx",
    show_default=True,
    help="最後にエクスポートする形式（none=スキップ）",
)
@click.pass_context
def run_all(ctx, category, limit, skip_gmail, export_fmt):
    """collect → enrich → generate_copy → create_gmail_drafts → export を一括実行する"""
    from src.pipeline.collector import collect_urls
    from src.pipeline.enricher import enrich as run_enrich, save_pending
    from src.pipeline.copy_generator import generate_copy as run_gen
    from src.pipeline.gmail_drafter import create_gmail_drafts as run_drafts
    from src.pipeline.exporter import export

    config_path = ctx.obj["config"]

    click.echo("=" * 60)
    click.echo(f"  カテゴリ: {CATEGORY_LABELS.get(category, category)}")
    click.echo(f"  収集上限: {limit}件")
    click.echo("=" * 60)

    click.echo("\n[1/5] URL収集")
    items = collect_urls(category=category, limit=limit, config_path=config_path)
    click.echo(f"  収集件数: {len(items)}")
    if not items:
        click.echo("  URLが収集できませんでした。終了します。")
        return
    save_pending(items)

    click.echo("\n[2/5] サイト解析 & Sheets保存")
    e = run_enrich(url_items=items, config_path=config_path)
    click.echo(f"  追加={e['added']}, 対象外={e['excluded']}, エラー={e['errors']}")

    click.echo("\n[3/5] 文面生成")
    g = run_gen(config_path=config_path)
    click.echo(f"  処理={g['processed']}, エラー={g['errors']}")

    if not skip_gmail:
        click.echo("\n[4/5] Gmail下書き作成")
        d = run_drafts(config_path=config_path)
        click.echo(f"  作成={d['created']}, スキップ={d['skipped']}, エラー={d['errors']}")
    else:
        click.echo("\n[4/5] Gmail下書き作成 (スキップ)")

    if export_fmt != "none":
        click.echo(f"\n[5/5] エクスポート ({export_fmt})")
        cat_label = CATEGORY_LABELS.get(category)
        out_path = export(fmt=export_fmt, category_filter=cat_label, config_path=config_path)
        click.echo(f"  出力先: {out_path}")
    else:
        click.echo("\n[5/5] エクスポート (スキップ)")

    click.echo("\n=== 全処理完了 ===")


if __name__ == "__main__":
    cli(obj={})
