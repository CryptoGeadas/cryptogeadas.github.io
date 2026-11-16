# Shared header and footer

The header (ticker and nav) and the footer are defined once, in `header.html` and `footer.html`,
and written into every page as plain HTML. Pages stay complete with JavaScript off.

To change the nav, the ticker or the footer:

1. Edit `header.html` or `footer.html`.
2. Run `node scripts/chrome/sync.mjs`.
3. Commit the changed pages with it.

A page states only what differs: `<body data-nav="/tools/">` names its section in the nav, and
the text inside its footer's `data-line` span is its own.

`node --test scripts/chrome/chrome.test.mjs` fails when a page differs (also run on every push).
