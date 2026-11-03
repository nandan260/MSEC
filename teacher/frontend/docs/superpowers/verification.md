# Verification ledger

Defaults: new standalone static project; browser-local fictional data; owner-private Sites deployment. User delegated execution by saying “yes go for it”. Native execution with one independent reviewer.

- Domain: attendance session upsert, numeric grade bounds, CSV escaping and risk checks pass.
- UI: all 17 routes render; attendance save/update/reload, safe assignment text, evaluation, attachment reload/download, doubt reply, parent draft, leave, template, CSV, empty search, profile persistence, mobile navigation and overflow checked in Chrome.
- Independent review: three important issues found: implicit modal Cancel submission, assignment class edits with existing submissions, stale references after persistence rollback.
- Fixes: ordinary buttons explicitly type=button; lock class after submission; reacquire mutable records inside transactions. Regression scripts verify keyboard submission, class lock and storage-failure retry.
- Minor findings fixed: preserve zero-byte named files; skip IndexedDB for text-only saves. Added node regression for empty attachment list.
- Review scope exclusions covered locally: browser rendering, mobile layout, upload reload/download and deployment privacy configuration.

Ruling: Deliver browser-local demo rather than integrating MSEC backend. Reason: user delegated choice after standalone/live-backend question. Cost: real users, shared data, external messaging and live AI need a follow-up backend integration.

No deferred review findings.

## Reference restyle
- Rebuilt overview composition and applied shared white/gray, black and lime visual system.
- Browser checks pass for all 17 routes, saved workflows and new overview shortcuts.
- Responsive overflow checks pass at 360, 390, 768, 1024, 1280 and 1600 pixels.
- Independent review found small-text contrast issues. Fixed foreground colors; new contrast regression reproduced 1.99:1 failure before fix and now checks 4.80:1–6.62:1.
- Five domain tests, syntax checks, all browser regressions and git diff whitespace checks pass.

## Screenshot composition correction
- User rejected previous loose adaptation. Rebuilt centered 1.55-ratio frame, compact navigation, header, seven-column chart, card carousel, portrait shortcuts and segmented gauge against supplied screenshot.
- Layout regression fails on old full-bleed frame; passes on framed composition.
- Independent reviewer found short-height clipping, unnamed collapsed controls and invented zero-count bars. Regression cases reproduced naming and zero-bar failures before fixes. Panels now fit typical laptops and allow overflow scrolling; collapsed controls retain names and group activation expands navigation; zero values draw no bars and counts use consistent scale.
- Laptop geometry at 1366×768: teacher panel bottom 404, portraits bottom 370; schedule panel bottom 718, footer bottom 701.
- Full browser suite, 5 domain tests, syntax, contrast, layout and weekly-chart checks pass. Width checks pass from 360 through 1600 px.
- A navigation run timed out while loading external fonts. Bundled local Inter and removed runtime Google Fonts requests; full suite then passes.
- Fictional profile portraits downloaded from Random User demonstration portraits; local variable Inter copied from existing font asset.
