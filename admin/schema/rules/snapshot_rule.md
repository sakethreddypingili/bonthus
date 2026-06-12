# Database Schema Changes Rule

To ensure clean migration tracking and rollback options, we follow a strict schema change capture process.

## The Rule

Whenever changes are made to SQL files in the `schema/` directory, you must create a consolidated SQL snapshot file containing all the SQL code of these changes.

### Key Guidelines:
1. **Consolidated File**: If changes are made to multiple schema files (for example, modifying two separate files like `tables.sql` and `functions.sql`), you must group all of the SQL changes into **one single consolidated SQL file**, rather than creating multiple separate files.
2. **Actual Executable SQL Code**: The snapshot file must store the actual SQL commands executed or to be executed (e.g., `ALTER TABLE...`, `CREATE OR REPLACE FUNCTION...`, `CREATE TABLE...`). The code must be clean and fully runnable/executable directly against the database to accurately apply all changes. Do not write textual summaries.
3. **Storage Location**: Save the consolidated file in the `backup/` directory of the workspace.
4. **Naming Convention**: 
   The file must be named using the format:
   `backup_date_time(hh-mm-ss){in 24hour formate}.sql`
   
   *Example*: `backup_2026-06-12_10-08-40.sql` (where `10-08-40` is hours, minutes, and seconds in 24-hour format).
