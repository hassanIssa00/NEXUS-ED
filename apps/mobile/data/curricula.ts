export type MobileCurriculum = {
  slug: string;
  title: string;
  subtitle: string;
  pageCount: number;
  color: string;
  badge: string;
  units: Array<{ title: string; fromPage: number; toPage: number }>;
  quran?: boolean;
};

// Kept in sync with apps/web/lib/curriculaData.ts; page images are served by
// the web app's public/resources/curricula/<slug>/ directory.
export const mobileCurricula: MobileCurriculum[] = [
  {
    slug: 'lughati', title: 'لغتي', subtitle: 'كتاب الطالب والأنشطة التفاعلية', pageCount: 266,
    color: '#047857', badge: 'اللغة العربية والتأسيس', units: [
      { title: 'دليل الأسرة والتهيئة والاستعداد', fromPage: 1, toPage: 38 },
      { title: 'الوحدة الأولى: أسرتي', fromPage: 39, toPage: 110 },
      { title: 'الوحدة الثانية: مدرستي', fromPage: 111, toPage: 180 },
      { title: 'الوحدة الثالثة: مدينتي', fromPage: 181, toPage: 266 },
    ],
  },
  {
    slug: 'math', title: 'الرياضيات', subtitle: 'كتاب الطالب وحل التمارين التفاعلية', pageCount: 155,
    color: '#234A65', badge: 'الأعداد والعمليات', units: [
      { title: 'الفصل 1: المقارنة والتصنيف', fromPage: 1, toPage: 32 },
      { title: 'الفصل 2: الأعداد حتى 5', fromPage: 33, toPage: 56 },
      { title: 'الفصل 3: الموقع والنمط', fromPage: 57, toPage: 80 },
      { title: 'الفصل 4: الأعداد حتى 10', fromPage: 81, toPage: 114 },
      { title: 'الفصل 5: الأعداد حتى 20 والجمع', fromPage: 115, toPage: 155 },
    ],
  },
  {
    slug: 'islamic', title: 'الدراسات الإسلامية', subtitle: 'القرآن الكريم، التوحيد، الفقه والسلوك', pageCount: 84,
    color: '#065f46', badge: 'القرآن والعقيدة والآداب', units: [
      { title: 'القرآن الكريم وتلاوته', fromPage: 1, toPage: 30 },
      { title: 'التوحيد والعقيدة الإسلامية', fromPage: 31, toPage: 54 },
      { title: 'الفقه والسلوك والآداب', fromPage: 55, toPage: 84 },
    ],
  },
  {
    slug: 'science', title: 'العلوم', subtitle: 'كتاب الطالب والتجارب والاستكشاف', pageCount: 119,
    color: '#b45309', badge: 'الاستكشاف والتفكير العلمي', units: [
      { title: 'النباتات ومخلوقات حية', fromPage: 1, toPage: 46 },
      { title: 'الحيوانات ومواطنها', fromPage: 47, toPage: 82 },
      { title: 'أرضنا والبيئة ومواردها', fromPage: 83, toPage: 119 },
    ],
  },
  {
    slug: 'english', title: 'اللغة الإنجليزية (We Can 1)', subtitle: "Student's Book & Interactive Phonics", pageCount: 108,
    color: '#234A65', badge: 'English & Phonics', units: [
      { title: 'Unit 1: Feelings & Greetings', fromPage: 1, toPage: 20 },
      { title: 'Unit 2: Things We Wear', fromPage: 21, toPage: 38 },
      { title: 'Unit 3: Classroom', fromPage: 39, toPage: 58 },
      { title: 'Phonics & Alphabet Practice', fromPage: 59, toPage: 80 },
      { title: 'Picture Dictionary & Workbook', fromPage: 81, toPage: 108 },
    ],
  },
  {
    slug: 'life-skills', title: 'المهارات الحياتية والأسرية', subtitle: 'كتاب الطالب والتطبيقات الحياتية', pageCount: 82,
    color: '#98793E', badge: 'المهارات والسلوك والاستقلالية', units: [
      { title: 'صحتي وسلامتي', fromPage: 1, toPage: 34 },
      { title: 'شخصيتي ومسؤوليتي في المنزل', fromPage: 35, toPage: 58 },
      { title: 'وقتي وألعابي وتنظيم يومي', fromPage: 59, toPage: 82 },
    ],
  },
  {
    slug: 'art', title: 'التربية الفنية', subtitle: 'كتاب الطالب والتعبير الفني والتشكيل', pageCount: 85,
    color: '#e11d48', badge: 'الرسم والتعبير الإبداعي', units: [
      { title: 'الرسم والتلوين', fromPage: 1, toPage: 32 },
      { title: 'الزخرفة البسيطة', fromPage: 33, toPage: 50 },
      { title: 'الطباعة بالألوان', fromPage: 51, toPage: 66 },
      { title: 'التشكيل والتجسيم', fromPage: 67, toPage: 85 },
    ],
  },
  {
    slug: 'quran', title: 'جزء عمّ — القرآن الكريم', subtitle: 'عرض للقراءة والحفظ والتلاوة', pageCount: 72,
    color: '#065f46', badge: 'القرآن الكريم · الجزء الثلاثون', quran: true, units: [
      { title: 'النبأ، النازعات، وعبس', fromPage: 1, toPage: 18 },
      { title: 'التكوير إلى الطارق', fromPage: 19, toPage: 36 },
      { title: 'الأعلى إلى الشرح', fromPage: 37, toPage: 54 },
      { title: 'التين إلى الناس', fromPage: 55, toPage: 72 },
    ],
  },
];
