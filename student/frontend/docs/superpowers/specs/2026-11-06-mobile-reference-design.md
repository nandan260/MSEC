# Student app: MSEC Mobile reference

Status: implemented. User requested direct implementation ("just build it").

## Intent

Implement the supplied MSEC Mobile design in the existing student React app.
Reference: http://127.0.0.1:8765/MSEC%20Mobile.dc.html.
The reference contains eight phone screens, each 390 × 844 CSS pixels.

## Approach

Recommended: update the existing React screens and shared shell. Keep existing
API integrations, student actions, navigation, and Capacitor compatibility.
This delivers the reference appearance without replacing working features.

Alternative: reproduce the reference as a standalone static demo. This would
match its sample content but would require reconnecting all student behavior.
It is unsuitable for replacing the working app.

Scope: the eight reference screens. Existing secondary features remain accessible
from More; the shared shell uses the same mobile visual rules throughout.

## Visual rules

- Preserve reference colors: background #FAF8FC, purple #4E2478, crimson #F30137,
  ink #1A1523, muted #5C5468, border #E3DEE9, tint #EDE4F5.
- Use locally bundled Poppins headings and Inter body text.
- Match 20px side padding, rounded cards, subtle shadows, and section spacing.
- Retain the floating six-item pill navigation and its active icon/text treatment.
- Honor native safe areas. Phone frames, fake status bars, and the multi-screen
  presentation canvas belong to the reference document, not the production UI.
- Support narrow screens and larger browsers without clipping or hiding actions.

## Screens

### Home

Keep the date/greeting, notification button, and profile avatar. Replace duplicate
welcome/stat sections with the purple summary card: attendance ring, eligibility,
SGPA and CGPA inset tiles. Render horizontal exam cards, compact assignment rows
with Submit, and notice rows with colored icon tiles. Preserve View all navigation
using reference labels (Exams, Due soon, Notices, See all).

### Attendance

Use the reference overall-percentage card with Attended, Held, and Can skip totals.
Show a warning derived from subjects below the eligibility threshold. Compact
subject rows include course title/code, attended/held counts, percentage, and
progress track. Retain faculty/admin attendance controls when those roles apply.
Compute skip allowance per subject from actual attendance rules; sum nonnegative
subject allowances for the summary and explain the total's meaning accessibly.
Do not copy reference numbers or let overall eligibility hide a subject shortage.

### Ask AI

Refine existing bubbles, attendance result card, suggestions, badge, and fixed
composer to match. Keep live assistant requests, errors, retries, downloads,
navigation cards, and offline handling. Reference conversation is illustrative;
never display it as a real model response to an unasked question.

### Academics

Create a CGPA overview and semester bar chart when historical semester data is
available from `/api/gpa/history` (`history[].sgpa` and cumulative values).
Display current semester SGPA and compact grade rows with grade tile,
course metadata, credits, and marks. Keep semester switching and role-based mark
editing. Do not invent semester history or a CGPA change absent from API data.

### Timetable

Use the month heading, six dated day selectors, and timeline with time labels
beside class cards. Highlight Now only when the actual college-local date/time
falls within a class. Keep chronological sorting, daily/weekly switching, request
race protection, and existing admin create/edit/delete controls.

### More

Add the profile summary above Study, Campus, Help, and Account groups. Match tinted
icon tiles and row separators. Preserve all existing destinations, logout, and
profile navigation, including features omitted from the reference mockup.

### Offline

Show the reference offline message and Try again action. If showing saved data,
display its actual saved timestamp. Never claim cached content exists without a
successful saved response. Distinguish browser offline state from server errors.
Cache only the read-only records necessary for these screens; scope saved data to
the current user, endpoint, and semester/day parameters. Clear it on logout and
invalidate affected entries after successful mutations. Do not queue mutations offline.

### Not found

Replace silent dashboard fallback for unknown screen identifiers with the
reference 404 view and working Go to Home and Ask AI for help actions. Preserve
known-screen navigation history and native back behavior. The app currently uses
an in-memory screen stack: handle unknown screen IDs there; adding browser URL
routing is outside this reference-matching change.

## Implementation boundaries

Continue using React, Vite, existing CSS and API helpers; no new UI framework.
Do not change teacher/backend work already present in the checkout. Preserve
server-derived content even when its values differ from reference sample data.
No automatic deployment, APK release, or GitHub publication is part of this change.

## Verification

Run existing student tests, production build, and lint. Update behavioral tests
where reference labels change; add coverage for unknown screens and offline
cache/retry behavior. Verify all eight states visually at 390 × 844, plus narrow
and desktop widths. Check navigation, day selection, assignment submission,
semester switching, retry, and assistant composer/tab overlap. Capture screenshots
for comparison with the reference and report any unavailable live integrations.
