CREATE TABLE "PlacementAssessmentAttempt" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "assessmentKey" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "questionSnapshot" JSONB NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementAssessmentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlacementAssessmentAttempt_studentId_assessmentKey_key"
    ON "PlacementAssessmentAttempt"("studentId", "assessmentKey");
CREATE INDEX "PlacementAssessmentAttempt_schoolId_completedAt_idx"
    ON "PlacementAssessmentAttempt"("schoolId", "completedAt");
CREATE INDEX "PlacementAssessmentAttempt_studentId_completedAt_idx"
    ON "PlacementAssessmentAttempt"("studentId", "completedAt");

ALTER TABLE "PlacementAssessmentAttempt" ADD CONSTRAINT "PlacementAssessmentAttempt_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementAssessmentAttempt" ADD CONSTRAINT "PlacementAssessmentAttempt_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
