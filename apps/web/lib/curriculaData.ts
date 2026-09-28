// ─────────────────────────────────────────────────────────────────────────────
// Nexus EDU — Curricula & Quran Data
// Exact replica of Dr. Ismail's classroom (issa-genesis-web) structure
// All 8 subjects for Grade 1 Primary, Academic Year 1448H
// ─────────────────────────────────────────────────────────────────────────────

export type CurriculumSubject = {
  slug: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  grade: string;
  term: string;
  year: string;
  pageCount: number;
  color: string;
  accent: string;
  badge: string;
  promise: string;
  isQuran?: boolean;
  units: Array<{
    title: string;
    fromPage: number;
    toPage: number;
  }>;
};

export const curriculaList: CurriculumSubject[] = [
  {
    slug: 'lughati',
    title: 'لغتي',
    shortTitle: 'لغتي',
    subtitle: 'كتاب الطالب والأنشطة التفاعلية',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 266,
    color: '#047857',
    accent: '#10b981',
    badge: 'اللغة العربية والتأسيس',
    promise:
      'كتاب لغتي التفاعلي المعتمد للصف الأول الابتدائي مع إمكانية الكتابة والتلوين بالقلم التفاعلي على كافة صفحات الدروس وحل التدريبات.',
    units: [
      { title: 'دليل الأسرة والتهيئة والاستعداد', fromPage: 1, toPage: 38 },
      { title: 'الوحدة الأولى: أسرتي (م، ب، ل، د، ن، ر)', fromPage: 39, toPage: 110 },
      { title: 'الوحدة الثانية: مدرستي (ص، ف، س، ق، ت، ح)', fromPage: 111, toPage: 180 },
      { title: 'الوحدة الثالثة: مدينتي (أ، ط، ز، و، ج، ش)', fromPage: 181, toPage: 266 },
    ],
  },
  {
    slug: 'math',
    title: 'الرياضيات',
    shortTitle: 'الرياضيات',
    subtitle: 'كتاب الطالب وحل التمارين التفاعلية',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 155,
    color: '#1d4ed8',
    accent: '#3b82f6',
    badge: 'الأعداد والعمليات',
    promise:
      'كتاب الرياضيات التفاعلي للصف الأول الابتدائي يشمل تدريبات المقارنة والتصنيف، الأعداد حتى 20، والجمع والطرح التفاعلي.',
    units: [
      { title: 'الفصل 1: المقارنة والتصنيف', fromPage: 1, toPage: 32 },
      { title: 'الفصل 2: الأعداد حتى 5', fromPage: 33, toPage: 56 },
      { title: 'الفصل 3: الموقع والنمط', fromPage: 57, toPage: 80 },
      { title: 'الفصل 4: الأعداد حتى 10', fromPage: 81, toPage: 114 },
      { title: 'الفصل 5: الأعداد حتى 20 ومقدمة الجمع', fromPage: 115, toPage: 155 },
    ],
  },
  {
    slug: 'islamic',
    title: 'الدراسات الإسلامية',
    shortTitle: 'الدراسات الإسلامية',
    subtitle: 'القرآن الكريم، التوحيد، الفقه والسلوك',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 84,
    color: '#065f46',
    accent: '#14b8a6',
    badge: 'القرآن والعقيدة والآداب',
    promise:
      'كتاب الدراسات الإسلامية التفاعلي يشمل سور القرآن الكريم المقررة، أركان الإسلام، والآداب والسلوكيات اليومية مع التدريبات التفاعلية.',
    units: [
      { title: 'القسم الأول: القرآن الكريم وتلاوته', fromPage: 1, toPage: 30 },
      { title: 'القسم الثاني: التوحيد والعقيدة الإسلامية', fromPage: 31, toPage: 54 },
      { title: 'القسم الثالث: الفقه والسلوك والآداب', fromPage: 55, toPage: 84 },
    ],
  },
  {
    slug: 'science',
    title: 'العلوم',
    shortTitle: 'العلوم',
    subtitle: 'كتاب الطالب والتجارب والاستكشاف',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 119,
    color: '#b45309',
    accent: '#f59e0b',
    badge: 'الاستكشاف والتفكير العلمي',
    promise:
      'كتاب العلوم التفاعلي للصف الأول الابتدائي يغطي دراسة الكائنات الحية، النباتات، الحيوانات، ومواطن العيش مع إمكانية الرسم والتوصيل التفاعلي.',
    units: [
      { title: 'الوحدة الأولى: النباتات ومخلوقات حية', fromPage: 1, toPage: 46 },
      { title: 'الوحدة الثانية: الحيوانات ومواطنها', fromPage: 47, toPage: 82 },
      { title: 'الوحدة الثالثة: أرضنا والبيئة ومواردها', fromPage: 83, toPage: 119 },
    ],
  },
  {
    slug: 'english',
    title: 'اللغة الإنجليزية (We Can 1)',
    shortTitle: 'الإنجليزية We Can',
    subtitle: "Student's Book & Interactive Phonics",
    grade: 'الصف الأول الابتدائي',
    term: 'First Semester',
    year: '1448H',
    pageCount: 108,
    color: '#4338ca',
    accent: '#6366f1',
    badge: 'English & Phonics',
    promise:
      'كتاب اللغة الإنجليزية We Can 1 التفاعلي يتيح للطالب التدرب على الحروف الإنجليزية، الكلمات الأولى، المحادثات البسيطة، والأنشطة بالقلم التفاعلي.',
    units: [
      { title: 'Unit 1: Feelings & Greetings', fromPage: 1, toPage: 20 },
      { title: 'Unit 2: Things We Wear', fromPage: 21, toPage: 38 },
      { title: 'Unit 3: Things on the Desk & Classroom', fromPage: 39, toPage: 58 },
      { title: 'Phonics & Alphabet Practice', fromPage: 59, toPage: 80 },
      { title: 'Picture Dictionary & Workbook', fromPage: 81, toPage: 108 },
    ],
  },
  {
    slug: 'life-skills',
    title: 'المهارات الحياتية والأسرية',
    shortTitle: 'المهارات الحياتية',
    subtitle: 'كتاب الطالب والتطبيقات الحياتية',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 82,
    color: '#c026d3',
    accent: '#d946ef',
    badge: 'المهارات والسلوك والاستقلالية',
    promise:
      'كتاب المهارات الحياتية والأسرية التفاعلي يركز على تنمية مهارات الطفل الاستقلالية، النظافة الشخصية، السلامة، وآداب التعامل الأسري.',
    units: [
      { title: 'الوحدة الأولى: صحتي وسلامتي', fromPage: 1, toPage: 34 },
      { title: 'الوحدة الثانية: شخصيتي ومسؤوليتي في المنزل', fromPage: 35, toPage: 58 },
      { title: 'الوحدة الثالثة: وقتي وألعابي وتنظيم يومي', fromPage: 59, toPage: 82 },
    ],
  },
  {
    slug: 'art',
    title: 'التربية الفنية',
    shortTitle: 'التربية الفنية',
    subtitle: 'كتاب الطالب والتعبير الفني والتشكيل',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 85,
    color: '#e11d48',
    accent: '#f43f5e',
    badge: 'الرسم والتعبير الإبداعي',
    promise:
      'كتاب التربية الفنية التفاعلي يتيح للطفل التلوين، التشكيل، الرسم الحر، ومحاكاة النماذج الفنية مباشرة على صفحات الكتاب الرقمية.',
    units: [
      { title: 'الوحدة الأولى: مجال الرسم والتلوين', fromPage: 1, toPage: 32 },
      { title: 'الوحدة الثانية: مجال الزخرفة البسيطة', fromPage: 33, toPage: 50 },
      { title: 'الوحدة الثالثة: مجال الطباعة بالألوان', fromPage: 51, toPage: 66 },
      { title: 'الوحدة الرابعة: مجال التشكيل والتجسيم', fromPage: 67, toPage: 85 },
    ],
  },
  {
    slug: 'quran',
    title: 'جزء عمّ — القرآن الكريم',
    shortTitle: 'جزء عمّ',
    subtitle: 'عرض تفاعلي للقراءة والحفظ والتلاوة',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 72,
    color: '#065f46',
    accent: '#d97706',
    badge: 'القرآن الكريم — الجزء الثلاثون',
    isQuran: true,
    promise:
      'عرض تفاعلي لجزء عمّ كامل بخط واضح وتصفح فوري فائق السرعة. مخصص للقراءة والحفظ والمتابعة — دون إمكانية الكتابة على الصفحات حفاظاً على حرمة المصحف الشريف.',
    units: [
      { title: 'سورة النبأ، النازعات، وعبس', fromPage: 1, toPage: 18 },
      { title: 'سورة التكوير إلى سورة الطارق', fromPage: 19, toPage: 36 },
      { title: 'سورة الأعلى إلى سورة الشرح', fromPage: 37, toPage: 54 },
      { title: 'سورة التين إلى سورة الناس', fromPage: 55, toPage: 72 },
    ],
  },
];

export function getCurriculumBySlug(slug: string): CurriculumSubject | undefined {
  return curriculaList.find((c) => c.slug === slug);
}
