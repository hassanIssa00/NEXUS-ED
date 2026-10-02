ALTER TABLE "Grade" ADD COLUMN "assignmentId" TEXT;

CREATE UNIQUE INDEX "Grade_assignmentId_studentId_key" ON "Grade"("assignmentId", "studentId");

ALTER TABLE "Grade"
ADD CONSTRAINT "Grade_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
