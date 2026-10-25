CREATE TABLE "ManualPlacementAssessment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdById" TEXT,
    "candidateName" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "assessmentKey" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "questionSnapshot" JSONB NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualPlacementAssessment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualPlacementAssessment_schoolId_completedAt_idx"
    ON "ManualPlacementAssessment"("schoolId", "completedAt");
CREATE INDEX "ManualPlacementAssessment_createdById_completedAt_idx"
    ON "ManualPlacementAssessment"("createdById", "completedAt");

ALTER TABLE "ManualPlacementAssessment"
    ADD CONSTRAINT "ManualPlacementAssessment_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualPlacementAssessment"
    ADD CONSTRAINT "ManualPlacementAssessment_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
