'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, FileText, BookOpen, FlaskConical, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api/client';

interface AssignmentTemplate {
  id: string;
  titleAr: string;
  descriptionAr: string;
  type: string;
  category: string;
  estimatedDuration: number;
  defaultPoints: number;
  instructionsAr: string;
  tags: string[];
}

const typeIcons = {
  MCQ: <FileText className="w-5 h-5" />,
  ESSAY: <BookOpen className="w-5 h-5" />,
  PROJECT: <Sparkles className="w-5 h-5" />,
  HOMEWORK: <FileText className="w-5 h-5" />,
  QUIZ: <FileText className="w-5 h-5" />,
  LAB: <FlaskConical className="w-5 h-5" />,
};

const categoryColors = {
  MATH: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30',
  SCIENCE: 'bg-green-100 text-green-800 dark:bg-green-900/30',
  ARABIC: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30',
  ENGLISH: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30',
  SOCIAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30',
  GENERAL: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30',
};

interface TemplatePickerProps {
  onSelectTemplate: (template: AssignmentTemplate) => void;
}

export function AssignmentTemplatePicker({ onSelectTemplate }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<AssignmentTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedCategory, templates]);

  const fetchTemplates = async () => {
    try {
      const { data } = await apiClient.get('/templates/assignments');
      const rows = Array.isArray(data) ? data : [];
      setTemplates(rows);
      setFilteredTemplates(rows);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory) {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.titleAr.includes(searchQuery) ||
          t.descriptionAr.includes(searchQuery) ||
          t.tags.some((tag) => tag.includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handlePreview = (template: AssignmentTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleUse = (template: AssignmentTemplate) => {
    onSelectTemplate(template);
    setShowPreview(false);
  };

  const categories = ['MATH', 'SCIENCE', 'ARABIC', 'ENGLISH', 'SOCIAL', 'GENERAL'];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">جاري التحميل...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            مكتبة قوالب الواجبات
          </CardTitle>
          <CardDescription>اختر قالباً جاهزاً لتوفير الوقت</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ابحث في القوالب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              الكل
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'MATH' ? 'رياضيات' :
                 cat === 'SCIENCE' ? 'علوم' :
                 cat === 'ARABIC' ? 'عربي' :
                 cat === 'ENGLISH' ? 'إنجليزي' :
                 cat === 'SOCIAL' ? 'اجتماعيات' : 'عام'}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:border-blue-500 transition-colors cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {typeIcons[template.type as keyof typeof typeIcons]}
                        <Badge className={categoryColors[template.category as keyof typeof categoryColors]}>
                          {template.category === 'MATH' ? 'رياضيات' :
                           template.category === 'SCIENCE' ? 'علوم' :
                           template.category === 'ARABIC' ? 'عربي' :
                           template.category === 'ENGLISH' ? 'إنجليزي' :
                           template.category === 'SOCIAL' ? 'اجتماعيات' : 'عام'}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-bold mb-2">{template.titleAr}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {template.descriptionAr}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.estimatedDuration} دقيقة
                      </div>
                      <div>
                        {template.defaultPoints} نقطة
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handlePreview(template)}
                      >
                        معاينة
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUse(template)}
                      >
                        استخدام
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد قوالب مطابقة للبحث
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.titleAr}</DialogTitle>
            <DialogDescription>{selectedTemplate?.descriptionAr}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">التعليمات:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedTemplate.instructionsAr}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">النوع:</span>
                  <Badge className="mr-2">{selectedTemplate.type}</Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-500">المدة المتوقعة:</span>
                  <span className="mr-2">{selectedTemplate.estimatedDuration} دقيقة</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">النقاط الافتراضية:</span>
                  <span className="mr-2">{selectedTemplate.defaultPoints}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => handleUse(selectedTemplate)}
                  className="flex-1"
                >
                  استخدام هذا القالب
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
