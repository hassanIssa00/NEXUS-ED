ALTER TABLE "Assignment"
ADD COLUMN "deliveryMode" TEXT NOT NULL DEFAULT 'AI_QUESTIONS';

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_deliveryMode_check"
CHECK ("deliveryMode" IN ('AI_QUESTIONS', 'BOOK_PAGES'));
