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

# ログ設定
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


@click.group()
@click.option("--config", default=None, help="config.yamlのパス（省略時はデフォルト）")
@click.pass_context
def cli(ctx, config):
    """SNSマーケティング支援 営業リスト自動生成ツール"""
    ctx.ensure_object(dict)
    ctx.obj["config"] = config


@cli.command()
@click.option(
    "--category", "-c",
    required=True,
    type=click.Choice(VALID_CATEGORIES),
    help="対象カテゴリ (overseas_send / overseas_receive / women_products)",
)
@click.option("--limit", "-l", default=100, show_default=True, help="収集する最大URL数")
@click.option("--save/--no-save", default=True, show_default=True, help="pending_urls.jsonに保存するか")
@click.pass_context
def collect(ctx, category, limit, save):
    """キーワード検索で候補URLを収集する"""
    from src.pipeline.collector import collect_urls
    from src.pipeline.enricher import save_pending

    logger.info(f"=== collect 開始: category={category}, limit={limit} ===")
    items = collect_urls(category=category, limit=limit, config_path=ctx.obj["config"])
    click.echo(f"収集件数: {len(items)}")

    if save and items:
        save_pending(items)
        click.echo(f"logs/pending_urls.json に保存しました ({len(items)}件)")

    return items


@cli.command()
@click.pass_context
def enrich(ctx):
    """pending_urls.json のURLをサイト解析してGoogle Sheetsに保存する"""
    from src.pipeline.enricher import enrich as run_enrich

    logger.info("=== enrich 開始 ===")
    stats = run_enrich(config_path=ctx.obj["config"])
    click.echo(f"結果: 追加={stats['added']}, 対象外={stats['excluded']}, エラー={stats['errors']}")


@cli.command("generate_copy")
@click.pass_context
def generate_copy(ctx):
    """Google Sheetsの収集済み行に営業文面を生成する"""
    from src.pipeline.copy_generator import generate_copy as run_gen

    logger.info("=== generate_copy 開始 ===")
    stats = run_gen(config_path=ctx.obj["config"])
    click.echo(f"結果: 処理={stats['processed']}, エラー={stats['errors']}")


@cli.command("create_gmail_drafts")
@click.pass_context
def create_gmail_drafts(ctx):
    """文面生成済みのメール宛先にGmail下書きを作成する"""
    from src.pipeline.gmail_drafter import create_gmail_drafts as run_drafts

    logger.info("=== create_gmail_drafts 開始 ===")
    stats = run_drafts(config_path=ctx.obj["config"])
    click.echo(
        f"結果: 作成={stats['created']}, スキップ={stats['skipped']}, エラー={stats['errors']}"
    )


@cli.command("run_all")
@click.option(
    "--category", "-c",
    required=True,
    type=click.Choice(VALID_CATEGORIES),
    help="対象カテゴリ",
)
@click.option("--limit", "-l", default=100, show_default=True, help="収集する最大URL数")
@click.option(
    "--skip-gmail/--no-skip-gmail",
    default=False,
    show_default=True,
    help="Gmail下書き作成をスキップする",
)
@click.pass_context
def run_all(ctx, category, limit, skip_gmail):
    """collect → enrich → generate_copy → create_gmail_drafts をまとめて実行する"""
    from src.pipeline.collector import collect_urls
    from src.pipeline.enricher import enrich as run_enrich, save_pending
    from src.pipeline.copy_generator import generate_copy as run_gen
    from src.pipeline.gmail_drafter import create_gmail_drafts as run_drafts

    config_path = ctx.obj["config"]

    click.echo("=== STEP 1/4: URL収集 ===")
    items = collect_urls(category=category, limit=limit, config_path=config_path)
    click.echo(f"収集件数: {len(items)}")
    if not items:
        click.echo("URLが収集できませんでした。終了します。")
        return
    save_pending(items)

    click.echo("\n=== STEP 2/4: サイト解析 & Sheets保存 ===")
    e_stats = run_enrich(url_items=items, config_path=config_path)
    click.echo(f"結果: 追加={e_stats['added']}, 対象外={e_stats['excluded']}, エラー={e_stats['errors']}")

    click.echo("\n=== STEP 3/4: 文面生成 ===")
    g_stats = run_gen(config_path=config_path)
    click.echo(f"結果: 処理={g_stats['processed']}, エラー={g_stats['errors']}")

    if not skip_gmail:
        click.echo("\n=== STEP 4/4: Gmail下書き作成 ===")
        d_stats = run_drafts(config_path=config_path)
        click.echo(
            f"結果: 作成={d_stats['created']}, スキップ={d_stats['skipped']}, エラー={d_stats['errors']}"
        )
    else:
        click.echo("\n=== STEP 4/4: Gmail下書き作成 (スキップ) ===")

    click.echo("\n=== 全処理完了 ===")


if __name__ == "__main__":
    cli(obj={})
