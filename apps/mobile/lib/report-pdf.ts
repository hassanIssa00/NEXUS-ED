import { WEB_URL } from '@/constants/Config'

export function escapePdfHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export function buildBrandedReportHtml({
  title,
  subtitle,
  content,
  issuedAt = new Date().toLocaleString('ar-SA'),
}: {
  title: string
  subtitle?: string
  content: string
  issuedAt?: string
}) {
  const schoolLogo = `${WEB_URL}/second_logo.webp`
  const nexusLogo = `${WEB_URL}/logo_new.webp`
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    @page{size:A4 portrait;margin:13mm 13mm 20mm}
    *{box-sizing:border-box}
    body{margin:0;color:#172b3b;background:#fff;font-family:"Noto Sans Arabic",Tahoma,Arial,sans-serif;font-size:11pt;direction:rtl;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report{width:100%}
    .brand{display:grid;grid-template-columns:1fr 1.4fr 1fr;align-items:center;gap:12px;padding:13px 15px;border:1px solid #d8e3e9;border-top:5px solid #08786c;border-bottom:4px solid #b28b49;border-radius:12px;background:#f6f9fa}
    .school,.nexus{display:flex;align-items:center;gap:9px;min-width:0}
    .nexus{justify-content:flex-end}
    .seal{display:flex;flex:0 0 58px;flex-direction:column;align-items:center;gap:3px}
    .seal img{width:54px;height:54px;object-fit:contain;border:2px double #b28b49;border-radius:50%;background:#fff;padding:3px}
    .seal small{color:#567084;font-size:6pt;font-weight:800;white-space:nowrap}
    .school-copy strong,.school-copy span{display:block;line-height:1.5}
    .school-copy strong{color:#18364c;font-size:9pt}
    .school-copy span{color:#627789;font-size:7pt}
    .heading{text-align:center}
    .heading p{margin:0;color:#08786c;font-size:8pt;font-weight:800}
    .heading h1{margin:5px 0;color:#18364c;font-size:17pt;line-height:1.4}
    .heading span{color:#627789;font-size:8pt}
    .nexus img{width:102px;height:58px;object-fit:contain;border-radius:7px;background:#fff;padding:4px}
    .intro{margin:15px 0 18px;color:#627789;font-size:9pt;line-height:1.7}
    .report-section{margin:0 0 16px;break-inside:auto}
    h2{margin:0 0 9px;padding:0 9px;border-right:4px solid #08786c;color:#08786c;font-size:13pt;line-height:1.5}
    table{width:100%;border-collapse:collapse;font-size:9pt}
    th,td{padding:8px;border:1px solid #d9e2e9;text-align:right;vertical-align:top;line-height:1.6}
    th{width:38%;background:#f1f6f6;color:#35556b}
    .rows{display:grid;gap:7px}
    article{break-inside:avoid;border:1px solid #d9e2e9;border-radius:8px;padding:9px 11px;background:#fbfcfd}
    article strong{color:#18364c;font-size:9pt}
    article p{margin:4px 0 0;color:#526176;font-size:9pt;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}
    .muted{color:#64758b}
    .footer{position:fixed;right:0;bottom:-12mm;left:0;display:flex;justify-content:space-between;gap:8px;border-top:1px solid #cbd5e1;padding-top:6px;color:#526a7a;font-size:7pt}
    .page:after{content:counter(page) " / " counter(pages)}
    @media print{thead{display:table-header-group}}
  </style></head><body><main class="report"><header class="brand"><div class="school"><div class="seal"><img src="${escapePdfHtml(schoolLogo)}" alt="شعار مدارس الإخلاص الأهلية"><small>الختم المدرسي</small></div><div class="school-copy"><strong>مدارس الإخلاص الأهلية</strong><span>جدة · المملكة العربية السعودية</span></div></div><div class="heading"><p>تقرير مدرسي إلكتروني</p><h1>${escapePdfHtml(title)}</h1>${subtitle ? `<span>${escapePdfHtml(subtitle)}</span>` : ''}</div><div class="nexus"><img src="${escapePdfHtml(nexusLogo)}" alt="شعار منصة نكسس التعليمية"></div></header><p class="intro">نكسس التعليمية · بيانات مستخرجة من سجلات المدرسة المحفوظة.</p>${content}</main><footer class="footer"><span>مدارس الإخلاص الأهلية · جدة</span><span>Nexus EDU · نكسس التعليمية</span><span>تاريخ الإصدار: ${escapePdfHtml(issuedAt)} · صفحة <b class="page"></b></span></footer></body></html>`
}
