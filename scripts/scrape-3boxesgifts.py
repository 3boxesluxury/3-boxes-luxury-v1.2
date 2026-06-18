"""
Scrape all products from 3boxesgifts.com using Playwright (real browser).
Handles JavaScript-based auth that requests cannot.
"""

import json
import os
import time
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_URL = "https://3boxesgifts.com"
PASSWORD = "mangao"

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_PATH = PROJECT_ROOT / "scraped-products.json"
COLLECTIONS_PATH = PROJECT_ROOT / "scraped-collections.json"


def authenticate_and_scrape():
    with sync_playwright() as p:
        print("Launching Chromium browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()

        print(f"Navigating to {BASE_URL}/password...")
        page.goto(f"{BASE_URL}/password", wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)

        current_url = page.url
        print(f"Current URL after load: {current_url}")

        if "/password" in current_url or "password" in current_url.lower():
            print(f"Password page detected. Entering password '{PASSWORD}'...")

            password_input_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                'input#password',
                'input[form_type="customer_password"]',
            ]

            password_input = None
            for sel in password_input_selectors:
                try:
                    el = page.query_selector(sel)
                    if el and el.is_visible():
                        password_input = el
                        print(f"   Found password input via selector: {sel}")
                        break
                except Exception:
                    continue

            if not password_input:
                print("   Could not find password input. Page HTML preview:")
                print(page.content()[:2000])
                browser.close()
                return None

            password_input.fill(PASSWORD)
            time.sleep(0.5)

            submit_selectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Enter")',
                'button:has-text("Submit")',
                'button:has-text("Continue")',
                '.password-form button',
                'form button',
            ]

            submitted = False
            for sel in submit_selectors:
                try:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        print(f"   Clicking submit button: {sel}")
                        btn.click()
                        submitted = True
                        break
                except Exception:
                    continue

            if not submitted:
                print("   No submit button found, pressing Enter in password field...")
                password_input.press("Enter")

            print("   Waiting for navigation after submit...")
            try:
                page.wait_for_load_state("domcontentloaded", timeout=30000)
            except Exception:
                pass
            time.sleep(3)

            print(f"   URL after submit: {page.url}")

        print("Verifying access by fetching /products.json...")
        test_result = page.evaluate("""async () => {
            try {
                const r = await fetch('/products.json?page=1');
                if (r.ok) {
                    const data = await r.json();
                    return { ok: true, count: data.products ? data.products.length : 0 };
                }
                return { ok: false, status: r.status };
            } catch(e) {
                return { ok: false, error: e.message };
            }
        }""")
        print(f"   Test result: {test_result}")

        if not test_result.get("ok"):
            print("Authentication appears to have failed.")
            print("Page content preview:")
            print(page.content()[:1500])
            browser.close()
            return None

        print(f"\nAuthentication successful! Now scraping all products...")

        all_data = page.evaluate("""async () => {
            const allResults = { products: [], collections: [], errors: [] };

            let page_num = 1;
            while (page_num <= 50) {
                try {
                    const res = await fetch('/products.json?page=' + page_num);
                    if (!res.ok) {
                        allResults.errors.push('products.json page ' + page_num + ' HTTP ' + res.status);
                        break;
                    }
                    const data = await res.json();
                    if (!data.products || data.products.length === 0) break;
                    allResults.products.push(...data.products);
                    if (data.products.length < 30) break;
                    page_num++;
                    await new Promise(r => setTimeout(r, 300));
                } catch(e) {
                    allResults.errors.push('products.json page ' + page_num + ' error: ' + e.message);
                    break;
                }
            }

            for (let i = 0; i < allResults.products.length; i++) {
                const p = allResults.products[i];
                try {
                    const res = await fetch('/products/' + p.handle + '.json');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.product) {
                            allResults.products[i] = Object.assign({}, p, data.product, {
                                images: (data.product.images && data.product.images.length > 0)
                                    ? data.product.images
                                    : p.images
                            });
                        }
                    }
                } catch(e) {
                    allResults.errors.push('product ' + p.handle + ' detail fetch error: ' + e.message);
                }
                if (i % 10 === 9) await new Promise(r => setTimeout(r, 400));
            }

            try {
                const colsRes = await fetch('/collections.json');
                if (colsRes.ok) {
                    const colsData = await colsRes.json();
                    const collections = colsData.collections || [];
                    for (const col of collections) {
                        try {
                            const cpRes = await fetch('/collections/' + col.handle + '/products.json');
                            if (cpRes.ok) {
                                const cpData = await cpRes.json();
                                allResults.collections.push({
                                    id: col.id,
                                    handle: col.handle,
                                    title: col.title,
                                    body_html: col.body_html || null,
                                    products_type: col.products_type || null,
                                    published_at: col.published_at || null,
                                    sort_order: col.sort_order || null,
                                    product_handles: (cpData.products || []).map(p => p.handle)
                                });
                            } else {
                                allResults.collections.push({
                                    id: col.id,
                                    handle: col.handle,
                                    title: col.title,
                                    error: 'HTTP ' + cpRes.status,
                                    product_handles: []
                                });
                            }
                        } catch(e) {
                            allResults.collections.push({
                                id: col.id,
                                handle: col.handle,
                                title: col.title,
                                error: e.message,
                                product_handles: []
                            });
                        }
                        await new Promise(r => setTimeout(r, 250));
                    }
                } else {
                    allResults.errors.push('collections.json HTTP ' + colsRes.status);
                }
            } catch(e) {
                allResults.errors.push('collections.json error: ' + e.message);
            }

            return allResults;
        }""")

        browser.close()
        return all_data


def print_product_summary(products):
    print("\n" + "=" * 100)
    print("Product summary (first 10):")
    print("-" * 100)
    print(f"{'#':<4} {'Title':<60} {'Price':>10} {'Vendor':<20}")
    print("-" * 100)
    for i, p in enumerate(products[:10], 1):
        title = (p.get("title") or "")[:58]
        variants = p.get("variants") or []
        price = variants[0].get("price", "") if variants else ""
        vendor = (p.get("vendor") or "")[:18]
        print(f"{i:<4} {title:<60} {price:>10} {vendor:<20}")
    if len(products) > 10:
        print(f"... and {len(products) - 10} more products")


def print_collections_summary(collections):
    print("\n" + "=" * 80)
    print("Collections summary:")
    print("-" * 80)
    print(f"{'#':<4} {'Title':<40} {'Products':>10} {'Handle':<30}")
    print("-" * 80)
    for i, c in enumerate(collections, 1):
        title = (c.get("title") or "")[:38]
        n = len(c.get("product_handles") or [])
        handle = (c.get("handle") or "")[:28]
        print(f"{i:<4} {title:<40} {n:>10} {handle:<30}")


def main():
    print("=" * 60)
    print("Scraping 3boxesgifts.com with Playwright")
    print("=" * 60)
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Output files: {OUTPUT_PATH.name}, {COLLECTIONS_PATH.name}")
    print()

    data = authenticate_and_scrape()
    if data is None:
        print("\nFAILED: Could not authenticate or scrape.")
        sys.exit(1)

    products = data.get("products", [])
    collections = data.get("collections", [])
    errors = data.get("errors", [])

    output_data = {
        "products": products,
        "collections": collections,
        "errors": errors,
    }

    print(f"\nSaving to: {OUTPUT_PATH}")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    print(f"   File size: {os.path.getsize(OUTPUT_PATH):,} bytes")

    print(f"Saving collections to: {COLLECTIONS_PATH}")
    with open(COLLECTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(collections, f, indent=2, ensure_ascii=False)
    print(f"   File size: {os.path.getsize(COLLECTIONS_PATH):,} bytes")

    print(f"\n[OK] Scraped {len(products)} products")
    print(f"[OK] Scraped {len(collections)} collections")
    if errors:
        print(f"[WARN] {len(errors)} non-fatal errors:")
        for e in errors[:5]:
            print(f"     - {e}")

    if products:
        print_product_summary(products)
    if collections:
        print_collections_summary(collections)

    print("\n[DONE] Scraping complete!")


if __name__ == "__main__":
    main()