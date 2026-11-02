# Fission stats page — connecting it to your Google Sheets

The page reads live from Google Sheets in the browser. It needs each sheet shared by
link, and it must be served over http (opening `index.html` straight off disk is blocked
by CORS).

## 1. Get the sheets into Google Sheets

Upload these three files to Google Drive, then open each one with Google Sheets
(right-click → Open with → Google Sheets, or File → Save as Google Sheets):

- Fission_Standup.xlsx
- Fission_Exploit_Intake.xlsx
- Fission_Verification.xlsx

Delete the local .xlsx afterwards, or keep editing in Sheets only — two copies diverge.

## 2. Share each sheet

Share → General access → **Anyone with the link** → **Viewer** → Done.

Link-viewing is what lets the page read the data with no login. Anyone holding the link
can read it, so treat the sheets as internal-not-secret.

## 3. Copy the links

Copy the address-bar URL for each sheet. If a file has more than one tab, put the tab
name on the end: `.../edit#Verification`. The first tab is the default, so the intake and
verification files need nothing appended.

## 4. Serve the page

From this folder:

```
python3 -m http.server 8777
```

Then open `http://localhost:8777` in a browser. For a link others can use, drop
`index.html` on any static host (Netlify drop, Vercel, Cloudflare Pages, GitHub Pages).

## 5. Connect

Open the page → **Sources** → paste the three links → **Save and load**.

The badge turns green with a timestamp on success. It auto-refreshes every 60 seconds.

## What breaks it

- Renaming a column header — columns are found by name, so the header text must stay.
- Moving a tab or renaming it without updating the `#TabName` suffix.
- Setting the share back to Restricted.
- Editing the sheet while `Anyone with the link` is off — the page will show
  "could not read a sheet" with the cause.

## Private sheets instead

If the data can't be link-shared, put an Apps Script Web App in front of each sheet
(deployed to run as the owner, accessible to anyone) and point the page at the `exec`
URL. It returns the same JSON shape, so only the three links change.
