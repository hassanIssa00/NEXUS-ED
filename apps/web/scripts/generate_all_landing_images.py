import asyncio
import base64
import os
import shutil
from playwright.async_api import async_playwright
from PIL import Image, ImageEnhance

def get_b64(path):
    with open(path, 'rb') as f:
        ext = path.split('.')[-1].lower()
        mime = 'image/webp' if ext == 'webp' else 'image/jpeg' if ext in ['jpg', 'jpeg'] else 'image/png'
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"

# Brighten image if needed
def prepare_bright_image(src_path, dst_path, brightness=1.1, contrast=1.05):
    im = Image.open(src_path)
    if im.mode != 'RGB':
        im = im.convert('RGB')
    if brightness != 1.0:
        enhancer = ImageEnhance.Brightness(im)
        im = enhancer.enhance(brightness)
    if contrast != 1.0:
        enhancer = ImageEnhance.Contrast(im)
        im = enhancer.enhance(contrast)
    im.save(dst_path, 'JPEG', quality=95)
    return dst_path

IMAGE_SPECS = [
    {
        "name": "hero-1",
        "src": r"C:\Users\hassa\.gemini\antigravity\brain\78042011-14ad-4613-bf7a-dd004fbfca64\hero_vision_one_1790526096474.jpg",
        "brightness": 1.0,
        "contrast": 1.0
    },
    {
        "name": "hero-2",
        "src": r"C:\Users\hassa\.gemini\antigravity\brain\78042011-14ad-4613-bf7a-dd004fbfca64\hero_smart_education_1790526116231.jpg",
        "brightness": 1.0,
        "contrast": 1.0
    },
    {
        "name": "hero-3",
        "src": r"C:\Users\hassa\.gemini\antigravity\brain\78042011-14ad-4613-bf7a-dd004fbfca64\hero_analytics_dash_1790526130339.jpg",
        "brightness": 1.0,
        "contrast": 1.0
    },
    {
        "name": "hero-4",
        "src": r"C:\Users\hassa\.gemini\antigravity\brain\78042011-14ad-4613-bf7a-dd004fbfca64\hero_teacher_mentor_1790526146451.jpg",
        "brightness": 1.0,
        "contrast": 1.0
    },
    {
        "name": "ai-learning-new",
        "src": r"C:\Users\hassa\.gemini\antigravity\brain\78042011-14ad-4613-bf7a-dd004fbfca64\ai_learning_tutor_1790526163243.jpg",
        "brightness": 1.0,
        "contrast": 1.0
    },
    {
        "name": "stats-comparison-new",
        "src": r"C:\Users\hassa\.gemini\antigravity\brain\78042011-14ad-4613-bf7a-dd004fbfca64\stats_comparison_viz_1790526180070.jpg",
        "brightness": 1.0,
        "contrast": 1.0
    },
    {
        "name": "leaderboard-new",
        "src": r"C:\Users\hassa\Desktop\nexus-landing-page-images\png_versions\leaderboard.png",
        "brightness": 1.08,
        "contrast": 1.04
    },
    {
        "name": "parent-monitoring-new",
        "src": r"C:\Users\hassa\Desktop\nexus-landing-page-images\png_versions\parent-monitoring.png",
        "brightness": 1.06,
        "contrast": 1.04
    },
    {
        "name": "vision-2030-new",
        "src": r"C:\Users\hassa\Desktop\nexus-landing-page-images\png_versions\vision-2030.png",
        "brightness": 1.15,
        "contrast": 1.06
    },
]

async def render_image(browser, spec, school_logo_b64, nexus_logo_b64):
    name = spec["name"]
    src_file = spec["src"]
    
    # Process brightness/contrast
    tmp_bg = f"temp_{name}.jpg"
    prepare_bright_image(src_file, tmp_bg, spec["brightness"], spec["contrast"])
    bg_b64 = get_b64(tmp_bg)

    html = f"""
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      body {{
        width: 1024px;
        height: 1024px;
        position: relative;
        overflow: hidden;
        font-family: 'Cairo', sans-serif;
        background: #f8fafc;
      }}
      .bg-img {{
        width: 100%;
        height: 100%;
        object-fit: cover;
        position: absolute;
        inset: 0;
      }}
      .branding-bar {{
        position: absolute;
        top: 24px;
        left: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 50;
      }}
      .brand-pill {{
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 9px 18px 9px 14px;
        border-radius: 9999px;
        border: 1.5px solid rgba(255, 255, 255, 0.95);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06);
      }}
      .brand-pill.nexus {{
        padding: 9px 16px 9px 18px;
        direction: rtl;
      }}
      .school-logo-img {{
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }}
      .nexus-logo-img {{
        width: 44px;
        height: 44px;
        object-fit: contain;
      }}
      .brand-text {{
        display: flex;
        flex-direction: column;
      }}
      .brand-title {{
        font-size: 13.5px;
        font-weight: 900;
        color: #0f172a;
        line-height: 1.25;
      }}
      .brand-subtitle {{
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
        letter-spacing: 0.2px;
      }}
      .bottom-tag {{
        position: absolute;
        bottom: 24px;
        right: 24px;
        background: rgba(15, 23, 42, 0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        color: #ffffff;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.3px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 6px;
      }}
      .bottom-tag-dot {{
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
      }}
    </style>
    </head>
    <body>
      <img src="{bg_b64}" class="bg-img" />
      <div class="branding-bar">
        <!-- School Pill (Right) -->
        <div class="brand-pill school">
          <img src="{school_logo_b64}" class="school-logo-img" alt="مدارس الإخلاص الأهلية" />
          <div class="brand-text">
            <span class="brand-title">مدارس الإخلاص الأهلية</span>
            <span class="brand-subtitle">Al-Ikhlas Schools • Jeddah</span>
          </div>
        </div>

        <!-- Nexus Pill (Left) -->
        <div class="brand-pill nexus">
          <img src="{nexus_logo_b64}" class="nexus-logo-img" alt="Nexus EDU" />
          <div class="brand-text">
            <span class="brand-title">منصة نكسس التعليمية</span>
            <span class="brand-subtitle">NEXUS EDU Platform</span>
          </div>
        </div>
      </div>

      <!-- Bottom Partnership Tag -->
      <div class="bottom-tag">
        <span class="bottom-tag-dot"></span>
        <span>منظومة التعليم الذكي 2026 • الفصل الذكي</span>
      </div>
    </body>
    </html>
    """

    html_file = f"temp_{name}.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html)

    page = await browser.new_page(viewport={"width": 1024, "height": 1024}, device_scale_factor=1)
    await page.goto(f"file://{os.path.abspath(html_file)}")
    await page.wait_for_timeout(800)

    png_out = f"public/images/{name}.png"
    webp_out = f"public/images/{name}.webp"
    
    await page.screenshot(path=png_out)
    await page.close()

    # Convert to high-quality WEBP
    im_final = Image.open(png_out)
    im_final.save(webp_out, "WEBP", quality=92)

    # Also save to Desktop folder
    desktop_folder = r"C:\Users\hassa\Desktop\nexus-landing-page-images"
    desktop_png = os.path.join(desktop_folder, "png_versions", f"{name}.png")
    desktop_webp = os.path.join(desktop_folder, f"{name}.webp")
    
    shutil.copy(png_out, desktop_png)
    shutil.copy(webp_out, desktop_webp)

    # Cleanup temp
    if os.path.exists(tmp_bg):
        os.remove(tmp_bg)
    if os.path.exists(html_file):
        os.remove(html_file)

    print(f"DONE: {name}.webp and .png generated successfully")

async def main():
    school_logo_b64 = get_b64("public/second_logo.webp")
    nexus_logo_b64 = get_b64("public/nexus_emblem_transparent.png")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for spec in IMAGE_SPECS:
            await render_image(browser, spec, school_logo_b64, nexus_logo_b64)
        await browser.close()

    print("ALL 9 IMAGES COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
