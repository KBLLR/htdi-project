
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:5175/")
        await page.wait_for_timeout(10000)  # Increased wait time

        # Locate and click the "Rendering" folder
        rendering_folder = page.locator('div.tp-dfwv :text("Rendering")')
        await rendering_folder.wait_for(state='visible')
        await rendering_folder.click()

        # Locate and click the "Post-processing" folder
        post_processing_folder = page.locator('div.tp-dfwv :text("Post-processing")')
        await post_processing_folder.wait_for(state='visible')
        await post_processing_folder.click()

        # Wait for the controls to be visible
        await page.wait_for_selector('div.tp-dfwv :text("Bloom")')
        await page.wait_for_selector('div.tp-dfwv :text("Depth of Field")')
        await page.wait_for_selector('div.tp-dfwv :text("FXAA")')

        await page.screenshot(path="jules-scratch/verification/verification.png")
        await browser.close()

asyncio.run(main())
