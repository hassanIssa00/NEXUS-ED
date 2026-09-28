import os
import base64
from playwright.sync_api import sync_playwright
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP_DIR = r'C:\Users\hassa\Desktop\nexus-landing-page-images'
PUBLIC_IMG_DIR = os.path.join(BASE_DIR, 'public', 'images')
PNG_DIR = os.path.join(DESKTOP_DIR, 'png_versions')

os.makedirs(DESKTOP_DIR, exist_ok=True)
os.makedirs(PNG_DIR, exist_ok=True)
os.makedirs(PUBLIC_IMG_DIR, exist_ok=True)

def get_b64(path):
    with open(path, 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode('utf-8')

LOGO_NEXUS = get_b64(os.path.join(DESKTOP_DIR, 'logo_new.webp'))
LOGO_IKHLAS = get_b64(os.path.join(DESKTOP_DIR, 'second_logo.webp'))

# Clean inline SVGs so there are ZERO emoji rendering artifacts
ICONS = {
    'trophy': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    'star': '<svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'check': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    'brain': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v14"/></svg>',
    'book': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 2v20"/></svg>',
    'chart': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    'shield': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    'saudi_palm': '''<svg width="48" height="48" viewBox="0 0 64 64" fill="none">
      <path d="M32 10C32 10 24 18 20 28C16 38 28 42 28 42C28 42 40 38 36 28C32 18 32 10 32 10Z" fill="#047857"/>
      <path d="M32 24V50" stroke="#047857" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M18 54L46 44M46 54L18 44" stroke="#047857" stroke-width="3" stroke-linecap="round"/>
    </svg>'''
}

def get_base_styles():
    return '''
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    direction: rtl;
    background: #FFFFFF;
    color: #0F172A;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
  .bg-canvas {
    background: radial-gradient(circle at 10% 12%, rgba(239, 246, 255, 0.9) 0%, rgba(255, 255, 255, 1) 60%),
                radial-gradient(circle at 90% 88%, rgba(245, 243, 255, 0.8) 0%, rgba(255, 255, 255, 1) 60%);
    width: 100%;
    height: 100%;
    padding: 44px 50px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
  }
  .header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-bottom: 22px;
    border-bottom: 2px solid #E2E8F0;
  }
  .card-glass {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 22px;
    box-shadow: 0 14px 34px -10px rgba(15, 23, 42, 0.07), 0 4px 6px -2px rgba(15, 23, 42, 0.03);
  }
  .pill-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 18px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 800;
  }
  .text-blue-grad {
    background: linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .text-gold-grad {
    background: linear-gradient(135deg, #B45309 0%, #D97706 60%, #F59E0B 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .text-emerald-grad {
    background: linear-gradient(135deg, #047857 0%, #059669 60%, #10B981 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
</style>
'''

def get_header(title_sub="المنظومة المدرسية الذكية المعتمدة • ريادة التعليم الرقمي"):
    return f'''
<div class="header-bar">
  <div style="display: flex; align-items: center; gap: 18px;">
    <img src="{LOGO_NEXUS}" style="width: 78px; height: 78px; object-fit: contain; border-radius: 18px; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.06));" />
    <div>
      <div style="display: flex; align-items: baseline; gap: 10px;">
        <span style="font-size: 29px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px;">نِكْسُس التعليمية</span>
        <span style="font-size: 18px; font-weight: 800; color: #2563EB;">NEXUS EDU</span>
      </div>
      <p style="font-size: 13.5px; font-weight: 700; color: #64748B; margin-top: 2px;">{title_sub}</p>
    </div>
  </div>

  <div style="display: flex; align-items: center; gap: 16px; background: #FFFFFF; border: 2px solid #E2E8F0; padding: 10px 22px; border-radius: 22px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
    <div style="text-align: left;">
      <p style="font-size: 16px; font-weight: 900; color: #0F172A;">مدارس الإخلاص الأهلية للبنين بجدة</p>
      <p style="font-size: 12.5px; font-weight: 700; color: #64748B;">ابتدائي • متوسط • ثانوي | تأسست عام 1417هـ</p>
    </div>
    <img src="{LOGO_IKHLAS}" style="width: 64px; height: 64px; object-fit: contain; border-radius: 50%; border: 2.5px solid #2563EB; box-shadow: 0 4px 14px rgba(37,99,235,0.18);" />
  </div>
</div>
'''

# ─────────────────────────────────────────────────────────────────────────────
# 1. HERO 1 (1254x1254)
# ─────────────────────────────────────────────────────────────────────────────
def get_hero_1_html():
    return f'''<!DOCTYPE html>
<html>
<head>{get_base_styles()}</head>
<body>
<div class="bg-canvas">
  {get_header("المنظومة المدرسية الذكية المعتمدة • العام الدراسي 1448هـ")}

  <div style="text-align: center; margin: 10px 0;">
    <div class="pill-badge" style="background: #EFF6FF; border: 1.5px solid #BFDBFE; color: #1D4ED8; margin-bottom: 12px;">
      {ICONS['star']} <span>المنصة التعليمية الأسرع نمواً في المملكة العربية السعودية</span>
    </div>
    <h1 style="font-size: 54px; font-weight: 900; line-height: 1.25; color: #0F172A;">
      مستقبل التعليم <span class="text-blue-grad">يبدأ من هنا</span>
    </h1>
    <p style="font-size: 20px; font-weight: 700; color: #475569; max-width: 860px; margin: 10px auto 0; line-height: 1.6;">
      تجربة تعليمية ذكية متكاملة تجمع بين التعلم المخصص والذكاء الاصطناعي والتفاعل الحقيقي في بيئة مدرسية محفزة تدعم تفوق كل طالب.
    </p>
  </div>

  <!-- Central Device UI Mockup -->
  <div style="display: grid; grid-template-columns: 290px 1fr 290px; gap: 24px; align-items: center;">
    <div style="display: flex; flex-direction: column; gap: 18px;">
      <div class="card-glass" style="padding: 22px;">
        <div style="margin-bottom: 8px;">{ICONS['brain']}</div>
        <h4 style="font-size: 17px; font-weight: 900; color: #0F172A;">ذكاء اصطناعي مخصص</h4>
        <p style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 4px; line-height: 1.5;">مسارات تعلم ذكية وتوصيات دقيقة تتكيف مع قدرات الطالب ومستواه.</p>
      </div>

      <div class="card-glass" style="padding: 22px;">
        <div style="margin-bottom: 8px;">{ICONS['trophy']}</div>
        <h4 style="font-size: 17px; font-weight: 900; color: #0F172A;">تعلم تفاعلي ممتع</h4>
        <p style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 4px; line-height: 1.5;">أنشطة وألعاب تعليمية تحفز الإبداع وترسخ المفاهيم بأسلوب شيق.</p>
      </div>
    </div>

    <!-- Center Tablet Mockup -->
    <div class="card-glass" style="padding: 26px; border: 3px solid #CBD5E1; box-shadow: 0 25px 50px -12px rgba(37,99,235,0.15); background: #FFFFFF;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 14px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 14px; background: #EEF2FF; display: flex; align-items: center; justify-content: center; font-size: 24px;">🏫</div>
          <div>
            <h5 style="font-size: 15px; font-weight: 900; color: #0F172A;">الصف الأول الابتدائي — فصل د. إسماعيل عيسى</h5>
            <p style="font-size: 12px; font-weight: 700; color: #059669; display: flex; align-items: center; gap: 4px;">
              {ICONS['check']} بصمة الوجه (Face ID) معتمدة • الحصة: لغتي الجميلة
            </p>
          </div>
        </div>
        <span class="pill-badge" style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; font-size: 12px;">نشط الآن 🔴</span>
      </div>

      <div style="background: linear-gradient(135deg, #4338CA 0%, #6366F1 100%); border-radius: 20px; padding: 22px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 25px rgba(67,56,202,0.25);">
        <div>
          <span style="background: rgba(255,255,255,0.22); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">مرحباً بعودتك 👋</span>
          <h3 style="font-size: 25px; font-weight: 900; margin-top: 6px;">أحمد فيصل الغامدي</h3>
          <p style="font-size: 12.5px; color: #E0E7FF; font-weight: 600; margin-top: 2px;">يوم تعليمي رائع بانتظارك في فصل د. إسماعيل!</p>
        </div>
        <div style="display: flex; gap: 14px;">
          <div style="background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25); padding: 10px 16px; border-radius: 16px; text-align: center;">
            <p style="font-size: 11px; color: #E0E7FF; font-weight: 700;">المعدل العام</p>
            <p style="font-size: 20px; font-weight: 900;">95%</p>
          </div>
          <div style="background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25); padding: 10px 16px; border-radius: 16px; text-align: center;">
            <p style="font-size: 11px; color: #E0E7FF; font-weight: 700;">نسبة الحضور</p>
            <p style="font-size: 20px; font-weight: 900;">97%</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: #EFF6FF; display: flex; align-items: center; justify-content: center;">
            {ICONS['book']}
          </div>
          <div>
            <p style="font-size: 14px; font-weight: 900; color: #0F172A;">لغتي الجميلة — الحصة الأولى</p>
            <p style="font-size: 11.5px; font-weight: 600; color: #64748B;">07:00 — 07:45 • رائد الفصل: د. إسماعيل عيسى</p>
          </div>
        </div>
        <span style="font-size: 12px; font-weight: 900; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 5px 12px; border-radius: 8px;">جارية الآن ⏱️</span>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 18px;">
      <div class="card-glass" style="padding: 22px;">
        <div style="margin-bottom: 8px;">{ICONS['book']}</div>
        <h4 style="font-size: 17px; font-weight: 900; color: #0F172A;">مناهج تفاعلية شاملة</h4>
        <p style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 4px; line-height: 1.5;">جميع كتب وزارة التعليم مدمجة بقلم رقمي وحل مباشر للتدريبات.</p>
      </div>

      <div class="card-glass" style="padding: 22px;">
        <div style="margin-bottom: 8px;">{ICONS['chart']}</div>
        <h4 style="font-size: 17px; font-weight: 900; color: #0F172A;">متابعة وتحليل ذكي</h4>
        <p style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 4px; line-height: 1.5;">تقارير لحظية وإشعارات فورية لولي الأمر والمعلم على مدار الساعة.</p>
      </div>
    </div>
  </div>

  <!-- Bottom KPI Strip -->
  <div style="display: flex; align-items: center; justify-content: space-around; background: #FFFFFF; border: 2px solid #E2E8F0; border-radius: 22px; padding: 18px 24px; box-shadow: 0 4px 14px rgba(0,0,0,0.02);">
    <div style="text-align: center;">
      <p style="font-size: 28px; font-weight: 900; color: #2563EB;">+10,000</p>
      <p style="font-size: 13.5px; font-weight: 700; color: #64748B;">طالب مسجل بالمنصة</p>
    </div>
    <div style="width: 2px; height: 38px; background: #E2E8F0;"></div>
    <div style="text-align: center;">
      <p style="font-size: 28px; font-weight: 900; color: #059669;">100%</p>
      <p style="font-size: 13.5px; font-weight: 700; color: #64748B;">مناهج رسمية معتمدة</p>
    </div>
    <div style="width: 2px; height: 38px; background: #E2E8F0;"></div>
    <div style="text-align: center;">
      <p style="font-size: 28px; font-weight: 900; color: #D97706;">1,000,000 ر.س</p>
      <p style="font-size: 13.5px; font-weight: 700; color: #64748B;">جائزة سنوية كبرى للمتفوقين</p>
    </div>
    <div style="width: 2px; height: 38px; background: #E2E8F0;"></div>
    <div style="text-align: center;">
      <p style="font-size: 28px; font-weight: 900; color: #7C3AED;">4.9 / 5 ⭐</p>
      <p style="font-size: 13.5px; font-weight: 700; color: #64748B;">تقييم أولياء الأمور</p>
    </div>
  </div>
</div>
</body>
</html>'''

# ─────────────────────────────────────────────────────────────────────────────
# 9. VISION 2030 NEW (1774x887) - ثيم فاتح فاخر وشعار وطني رسمي
# ─────────────────────────────────────────────────────────────────────────────
def get_vision_2030_html():
    return f'''<!DOCTYPE html>
<html>
<head>{get_base_styles()}</head>
<body>
<div class="bg-canvas" style="padding: 44px 70px;">
  {get_header("رؤية المملكة 2030 • برنامج تنمية القدرات البشرية")}

  <div style="display: grid; grid-template-columns: 1.25fr 1fr; gap: 46px; align-items: center; margin: 18px 0;">
    <div>
      <div class="pill-badge" style="background: #ECFDF5; border: 1.5px solid #A7F3D0; color: #065F46; margin-bottom: 14px;">
        {ICONS['saudi_palm']}
        <span style="font-size: 15px;">رؤية السعودية 2030 • تعليم يبني أجيال المستقبل</span>
      </div>
      <h1 style="font-size: 50px; font-weight: 900; line-height: 1.25; color: #0F172A;">
        نحو جيل رقمي واعد.. <span class="text-emerald-grad">لوطن طموح ومزدهر</span>
      </h1>
      <p style="font-size: 19px; font-weight: 700; color: #475569; margin: 12px 0 22px; line-height: 1.6;">
        تسعى منصة نكسس التعليمية بشراكتها المتميزة مع مدارس الإخلاص الأهلية إلى تحقيق مستهدفات رؤية 2030 في تطوير المناهج الرقمية وتعزيز الإبداع والريادة.
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; padding: 16px 20px; border-radius: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <p style="font-size: 15px; font-weight: 900; color: #047857;">هوية وطنية راسخة</p>
          <p style="font-size: 12.5px; color: #64748B; margin-top: 3px;">تعزيز الاعتزاز باللغة العربية والقرآن والقيم</p>
        </div>
        <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; padding: 16px 20px; border-radius: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <p style="font-size: 15px; font-weight: 900; color: #1D4ED8;">مهارات القرن الحادي والعشرين</p>
          <p style="font-size: 12.5px; color: #64748B; margin-top: 3px;">التفكير الناقد والذكاء الاصطناعي والإبداع</p>
        </div>
        <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; padding: 16px 20px; border-radius: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <p style="font-size: 15px; font-weight: 900; color: #B45309;">تنافسية تعليمية عالمية</p>
          <p style="font-size: 12.5px; color: #64748B; margin-top: 3px;">إعداد الطالب للمنافسة والتميز الدولي</p>
        </div>
        <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; padding: 16px 20px; border-radius: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <p style="font-size: 15px; font-weight: 900; color: #7C3AED;">بيئة مدرسية ذكية ومستدامة</p>
          <p style="font-size: 12.5px; color: #64748B; margin-top: 3px;">فصول رقمية متكاملة تواكب التحول الوطني</p>
        </div>
      </div>
    </div>

    <!-- Left visual badge & Saudi 2030 seal -->
    <div class="card-glass" style="padding: 38px; background: #FFFFFF; text-align: center; border: 2.5px solid #E2E8F0; box-shadow: 0 20px 45px rgba(5,150,105,0.08);">
      <div style="display: flex; justify-content: center; margin-bottom: 12px;">
        {ICONS['saudi_palm']}
      </div>
      <h3 style="font-size: 38px; font-weight: 900; color: #047857; letter-spacing: -0.5px;">رؤية 2030</h3>
      <p style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 4px;">المملكة العربية السعودية</p>
      <p style="font-size: 14px; font-weight: 600; color: #64748B; margin-top: 8px;">برنامج تنمية القدرات البشرية • مسار التعليم الذكي</p>

      <div style="margin-top: 26px; padding-top: 22px; border-top: 1.5px solid #F1F5F9; display: flex; justify-content: space-around;">
        <div>
          <p style="font-size: 26px; font-weight: 900; color: #047857;">100%</p>
          <p style="font-size: 13px; font-weight: 700; color: #64748B;">تحول رقمي</p>
        </div>
        <div>
          <p style="font-size: 26px; font-weight: 900; color: #2563EB;">+10,000</p>
          <p style="font-size: 13px; font-weight: 700; color: #64748B;">طالب مستفيد</p>
        </div>
        <div>
          <p style="font-size: 26px; font-weight: 900; color: #D97706;">1448هـ</p>
          <p style="font-size: 13px; font-weight: 700; color: #64748B;">مناهج معتمدة</p>
        </div>
      </div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #E2E8F0; padding-top: 16px; font-size: 14px; font-weight: 800; color: #64748B;">
    <span>نِكْسُس التعليمية (NEXUS EDU) • بالشراكة مع مدارس الإخلاص الأهلية للبنين بجدة</span>
    <span style="color: #047857; font-weight: 900;">نعمل اليوم.. لنحقق غداً أفضل للوطن</span>
  </div>
</div>
</body>
</html>'''

TASKS = [
    ('hero-1', get_hero_1_html(), 1254, 1254),
    ('vision-2030-new', get_vision_2030_html(), 1774, 887),
]

def main():
    print(f"Refining hero-1 and vision-2030...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, html, width, height in TASKS:
            page = browser.new_page(
                viewport={'width': width, 'height': height},
                device_scale_factor=2
            )
            page.set_content(html, wait_until='networkidle')

            temp_png = os.path.join(DESKTOP_DIR, f"{name}_temp.png")
            page.screenshot(path=temp_png, full_page=True)
            page.close()

            with Image.open(temp_png) as img:
                resized = img.resize((width, height), Image.Resampling.LANCZOS)
                resized.save(os.path.join(DESKTOP_DIR, f"{name}.webp"), 'WEBP', quality=95)
                resized.save(os.path.join(PNG_DIR, f"{name}.png"), 'PNG')
                resized.save(os.path.join(PUBLIC_IMG_DIR, f"{name}.webp"), 'WEBP', quality=95)

            if os.path.exists(temp_png):
                os.remove(temp_png)

            print(f"[OK] Refined {name}")
        browser.close()

if __name__ == '__main__':
    main()
