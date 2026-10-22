CREATE TABLE "AutomationRule" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "condition" JSONB NOT NULL,
  "actionType" TEXT NOT NULL,
  "actionData" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationRule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AutomationLog" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL,
  "eventKey" TEXT,
  "details" JSONB,
  CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AutomationLog_eventKey_key" ON "AutomationLog"("eventKey");

CREATE TABLE "TeacherQuiz" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "questions" JSONB NOT NULL,
  "dueAt" TIMESTAMP(3),
  "published" BOOLEAN NOT NULL DEFAULT false,
  "showResults" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherQuiz_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherQuiz_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeacherQuiz_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeacherQuiz_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeacherQuiz_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TeacherQuiz_schoolId_classId_published_idx" ON "TeacherQuiz"("schoolId", "classId", "published");
CREATE INDEX "TeacherQuiz_teacherId_createdAt_idx" ON "TeacherQuiz"("teacherId", "createdAt");

CREATE TABLE "QuizAttempt" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "score" DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION NOT NULL,
  "feedback" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "TeacherQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuizAttempt_quizId_studentId_key" ON "QuizAttempt"("quizId", "studentId");
CREATE INDEX "QuizAttempt_studentId_submittedAt_idx" ON "QuizAttempt"("studentId", "submittedAt");

CREATE TABLE "ClassEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventType" TEXT NOT NULL DEFAULT 'CLASS_EVENT',
  "startsAt" TIMESTAMP(3),
  "photoReferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClassEvent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClassEvent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ClassEvent_schoolId_classId_startsAt_idx" ON "ClassEvent"("schoolId", "classId", "startsAt");

CREATE TABLE "ParentMeeting" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'IN_PERSON',
  "location" TEXT,
  "meetingUrl" TEXT,
  "maxBookings" INTEGER NOT NULL DEFAULT 1,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentMeeting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ParentMeeting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentMeeting_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentMeeting_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ParentMeeting_schoolId_classId_startsAt_idx" ON "ParentMeeting"("schoolId", "classId", "startsAt");
CREATE INDEX "ParentMeeting_teacherId_startsAt_idx" ON "ParentMeeting"("teacherId", "startsAt");

CREATE TABLE "ParentMeetingBooking" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentMeetingBooking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ParentMeetingBooking_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "ParentMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentMeetingBooking_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentMeetingBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ParentMeetingBooking_meetingId_parentId_studentId_key" ON "ParentMeetingBooking"("meetingId", "parentId", "studentId");
CREATE INDEX "ParentMeetingBooking_parentId_createdAt_idx" ON "ParentMeetingBooking"("parentId", "createdAt");

CREATE TABLE "CommunityPost" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "attachmentReferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityPost_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunityPost_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunityPost_schoolId_classId_createdAt_idx" ON "CommunityPost"("schoolId", "classId", "createdAt");

CREATE TABLE "CommunityComment" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");

CREATE TABLE "Certificate" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "issuerId" TEXT NOT NULL,
  "serial" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Certificate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Certificate_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Certificate_serial_key" ON "Certificate"("serial");
CREATE INDEX "Certificate_schoolId_studentId_createdAt_idx" ON "Certificate"("schoolId", "studentId", "createdAt");
