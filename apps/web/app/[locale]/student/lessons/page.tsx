"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { lessonService, Lesson } from "@/lib/services/lesson.service";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  FileText,
  Paperclip,
  X,
  Brain,
  BookOpen,
  LoaderCircle,
} from "lucide-react";

type LessonSummary = {
  title: string;
  keyPoints: string[];
  concepts: string[];
};

export default function StudentLessonsPage() {
  const t = useTranslations("student");
  const isEnglish = useLocale() === "en";
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    setLessonsError(false);
    try {
      const data = await lessonService.getAll();
      setLessons(data);
    } catch (error) {
      console.error("Failed to fetch lessons", error);
      setLessonsError(true);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSummary(null);
    setSummaryError(false);
    if (!lesson.content?.trim()) {
      setSummaryError(true);
      return;
    }

    setSummaryLoading(true);
    try {
      const response = await apiClient.post(
        `/ai/lesson-summary/${encodeURIComponent(lesson.id)}`,
      );
      const data = response.data?.data;
      if (!data || typeof data.title !== "string")
        throw new Error("Invalid lesson summary response");
      setSummary({
        title: data.title,
        keyPoints: Array.isArray(data.keyPoints)
          ? data.keyPoints.filter(
              (item: unknown): item is string => typeof item === "string",
            )
          : [],
        concepts: Array.isArray(data.concepts)
          ? data.concepts.filter(
              (item: unknown): item is string => typeof item === "string",
            )
          : [],
      });
    } catch (error) {
      console.error("Failed to generate lesson summary", error);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t("lessons")}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            {t("loading")}
          </div>
        </div>
      ) : lessonsError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-text-secondary"
        >
          <p>{t("lessonsLoadError")}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={fetchLessons}
          >
            {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <BookOpen className="w-12 h-12 text-text-muted mb-4" />
              <p className="text-text-secondary">{t("noLessons")}</p>
            </div>
          ) : (
            lessons.map((lesson, index) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card
                  className="cursor-pointer group hover:border-primary-500/30 hover:-translate-y-1 transition-all duration-300"
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg group-hover:text-primary-500 transition-colors">
                        {lesson.title}
                      </CardTitle>
                      <span className="badge-nexus text-[10px] whitespace-nowrap">
                        {lesson.subject?.name}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {lesson.content && (
                      <p className="text-sm text-text-secondary mb-4 line-clamp-3 leading-relaxed">
                        {lesson.content}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-text-muted mb-4">
                      {lesson.videoUrl && (
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3 text-primary-500" />
                          <span>{t("video")}</span>
                        </div>
                      )}
                      {lesson.attachments && lesson.attachments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-secondary-400" />
                          <span>
                            {lesson.attachments.length} {t("files")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-nexus-border">
                      <Button
                        size="sm"
                        className="flex-1 h-9 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLesson(lesson);
                        }}
                      >
                        <Play className="w-3 h-3 ml-1" />
                        {t("watchLesson")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          void generateSummary(lesson);
                        }}
                        disabled={!lesson.content?.trim()}
                      >
                        <Brain className="w-3 h-3 ml-1" />
                        {t("aiSummary")}
                      </Button>
                    </div>

                    <div className="mt-3 text-xs text-text-muted">
                      {lesson.author?.name || lesson.author?.email}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ═══ Lesson Detail Modal ═══ */}
      {selectedLesson && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedLesson(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-nexus-card border border-nexus-border rounded-[16px] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedLesson.title}
                </h2>
                <span className="badge-nexus">
                  {selectedLesson.subject?.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedLesson(null)}
                className="w-8 h-8 rounded-[8px] bg-nexus-bg border border-nexus-border flex items-center justify-center text-text-muted hover:text-white hover:border-primary-500/50 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Area */}
            {selectedLesson.videoUrl && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary-500" />
                  {isEnglish ? "Lesson video" : "الفيديو التعليمي"}
                </h3>
                <div className="relative rounded-[12px] overflow-hidden bg-nexus-bg border border-nexus-border aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full nexus-gradient flex items-center justify-center mb-3">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                    <a
                      href={selectedLesson.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
                    >
                      {t("openVideo")}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Content / Notes */}
            {selectedLesson.content && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-secondary-400" />
                  {t("lessonContent")}
                </h3>
                <div className="p-4 bg-nexus-bg rounded-[12px] border border-nexus-border">
                  <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
                    {selectedLesson.content}
                  </p>
                </div>
              </div>
            )}

            {/* AI Summary Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary-500" />
                {t("aiSummary")}
              </h3>
              <div className="relative p-4 rounded-[12px] overflow-hidden">
                <div className="absolute inset-0 nexus-gradient opacity-10"></div>
                <div className="relative z-10 border border-primary-500/20 rounded-[12px] p-4">
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {t("aiSummaryHelp")}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => void generateSummary(selectedLesson)}
                    disabled={summaryLoading || !selectedLesson.content?.trim()}
                  >
                    {summaryLoading ? (
                      <LoaderCircle className="w-3 h-3 ml-1 animate-spin" />
                    ) : (
                      <Brain className="w-3 h-3 ml-1" />
                    )}
                    {summaryLoading
                      ? t("summaryLoading")
                      : t("generateSummary")}
                  </Button>
                  {summaryError && (
                    <p role="alert" className="mt-3 text-sm text-red-400">
                      {selectedLesson.content?.trim()
                        ? t("summaryError")
                        : t("summaryUnavailable")}
                    </p>
                  )}
                  {summary && (
                    <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/90">
                      <h4 className="font-semibold text-primary-300">
                        {summary.title}
                      </h4>
                      {summary.keyPoints.map((point, index) => (
                        <p key={`point-${index}`}>{point}</p>
                      ))}
                      {summary.concepts.length > 0 && (
                        <div>
                          <h5 className="mb-1 font-semibold text-primary-300">
                            {t("keyConcepts")}
                          </h5>
                          <ul className="list-inside list-disc space-y-1">
                            {summary.concepts.map((concept, index) => (
                              <li key={`concept-${index}`}>{concept}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Attachments */}
            {selectedLesson.attachments &&
              selectedLesson.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-yellow-400" />
                    {t("attachments")}
                  </h3>
                  <div className="space-y-2">
                    {selectedLesson.attachments.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-nexus-bg rounded-[12px] border border-nexus-border hover:border-primary-500/30 transition-all group"
                      >
                        <FileText className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors" />
                        <span className="text-sm text-text-secondary group-hover:text-primary-500 transition-colors">
                          {url.split("/").pop()}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {/* Teacher info */}
            <div className="pt-4 border-t border-nexus-border text-sm text-text-muted">
              {t("teacher")}:{" "}
              {selectedLesson.author?.name || selectedLesson.author?.email}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
