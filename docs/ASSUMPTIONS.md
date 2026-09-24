# HRIS Assumptions

## Employee hire date and status

The current requirements do not define an employee-status field or an inactive-to-active lifecycle.

For now, the application does not support scheduling a future employee start through a future hire date. A hire date represents an employee who has already started work.

The following behaviour is deliberately deferred until employee status is added to the requirements:

- allowing a hire date in the future;
- marking an employee as inactive before that date; and
- automatically activating the employee on the hire date.

When this is introduced, the API contract, database schema, dashboard definitions, and both backend implementations must be updated together.

## Employee competency grades

A competency grade (`A`, `B`, `C`, or `D`) belongs to an individual employee's assignment for a competency. It expresses that employee's proficiency in that competency.

It is not a company-wide grade or importance level for the competency. Competency importance and expected proficiency may vary by job title, team, or project. Those context-specific expectations are outside the current requirements and must be modeled separately if introduced later.
