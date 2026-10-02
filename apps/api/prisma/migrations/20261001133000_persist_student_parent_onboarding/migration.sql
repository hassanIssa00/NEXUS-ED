CREATE TABLE "StudentProfile" (
    "userId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "StudentLinkCode" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentLinkCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParentSurvey" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "consentVersion" TEXT NOT NULL DEFAULT 'parent-survey-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentSurvey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentLinkCode_tokenHash_key" ON "StudentLinkCode"("tokenHash");
CREATE INDEX "StudentLinkCode_studentId_redeemedAt_expiresAt_idx" ON "StudentLinkCode"("studentId", "redeemedAt", "expiresAt");
CREATE UNIQUE INDEX "ParentSurvey_parentId_studentId_key" ON "ParentSurvey"("parentId", "studentId");
CREATE INDEX "ParentSurvey_schoolId_updatedAt_idx" ON "ParentSurvey"("schoolId", "updatedAt");
CREATE INDEX "ParentSurvey_studentId_idx" ON "ParentSurvey"("studentId");

ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentLinkCode" ADD CONSTRAINT "StudentLinkCode_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentSurvey" ADD CONSTRAINT "ParentSurvey_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentSurvey" ADD CONSTRAINT "ParentSurvey_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentSurvey" ADD CONSTRAINT "ParentSurvey_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
