-- Joining email (provided at hire) vs official company email (assigned later).
-- Active sign-in uses official_email when set, otherwise joining_email.
-- employees.email mirrors the active sign-in address for backward compatibility.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS official_email TEXT;

UPDATE employees
SET joining_email = email
WHERE joining_email IS NULL;
