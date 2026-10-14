CREATE TABLE "SmartStudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningStyle" TEXT,
    "strengthSubjects" TEXT[] NOT NULL,
    "weakSubjects" TEXT[] NOT NULL,
    "performanceTrend" TEXT,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartStudentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmartStudentProfile_userId_key" ON "SmartStudentProfile"("userId");

ALTER TABLE "SmartStudentProfile"
ADD CONSTRAINT "SmartStudentProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SkillNode" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SkillNode_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SkillNode"
ADD CONSTRAINT "SkillNode_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudentSkillMastery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillNodeId" TEXT NOT NULL,
    "masteryLevel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSkillMastery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentSkillMastery_studentId_skillNodeId_key"
ON "StudentSkillMastery"("studentId", "skillNodeId");

ALTER TABLE "StudentSkillMastery"
ADD CONSTRAINT "StudentSkillMastery_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentSkillMastery"
ADD CONSTRAINT "StudentSkillMastery_skillNodeId_fkey"
FOREIGN KEY ("skillNodeId") REFERENCES "SkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
