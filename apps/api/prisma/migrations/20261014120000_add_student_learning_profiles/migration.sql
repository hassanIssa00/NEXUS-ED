CREATE TABLE IF NOT EXISTS "SmartStudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningStyle" TEXT,
    "strengthSubjects" TEXT[] NOT NULL,
    "weakSubjects" TEXT[] NOT NULL,
    "performanceTrend" TEXT,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartStudentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmartStudentProfile_userId_key" ON "SmartStudentProfile"("userId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'SmartStudentProfile_userId_fkey'
          AND conrelid = '"SmartStudentProfile"'::regclass
    ) THEN
        ALTER TABLE "SmartStudentProfile"
        ADD CONSTRAINT "SmartStudentProfile_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SkillNode" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SkillNode_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'SkillNode_subjectId_fkey'
          AND conrelid = '"SkillNode"'::regclass
    ) THEN
        ALTER TABLE "SkillNode"
        ADD CONSTRAINT "SkillNode_subjectId_fkey"
        FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "StudentSkillMastery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillNodeId" TEXT NOT NULL,
    "masteryLevel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSkillMastery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentSkillMastery_studentId_skillNodeId_key"
ON "StudentSkillMastery"("studentId", "skillNodeId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'StudentSkillMastery_studentId_fkey'
          AND conrelid = '"StudentSkillMastery"'::regclass
    ) THEN
        ALTER TABLE "StudentSkillMastery"
        ADD CONSTRAINT "StudentSkillMastery_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'StudentSkillMastery_skillNodeId_fkey'
          AND conrelid = '"StudentSkillMastery"'::regclass
    ) THEN
        ALTER TABLE "StudentSkillMastery"
        ADD CONSTRAINT "StudentSkillMastery_skillNodeId_fkey"
        FOREIGN KEY ("skillNodeId") REFERENCES "SkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
