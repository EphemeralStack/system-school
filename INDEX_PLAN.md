# Index Plan

The migration adds baseline indexes for:

- identity lookups (`Email`, `userId`, `ApplicationNo`)
- school/tenant filtering (`schoolId`)
- foreign-key-like lookups (`studentId`, `teacherId`, `classId`, `subjectId`, etc.)
- status and date filtering
- common composite lookups such as student/exam, class/date and school/term/year
- unique one-to-one and associative-table combinations

It intentionally does not add full-text indexes. Those should be based on the
exact `Query.search()` calls found during the frontend query audit.
