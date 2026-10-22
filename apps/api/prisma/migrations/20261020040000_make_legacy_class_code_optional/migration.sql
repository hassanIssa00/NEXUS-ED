-- The class-code workflow was removed from the application, but production
-- still has a NOT NULL legacy column that prevents creating classes without it.
DO $$
BEGIN
  IF to_regclass('"Class"') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'Class'
         AND column_name = 'classCode'
         AND is_nullable = 'NO'
     ) THEN
    ALTER TABLE "Class" ALTER COLUMN "classCode" DROP NOT NULL;
  END IF;
END
$$;
