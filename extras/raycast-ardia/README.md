# Ardia for Raycast

Search your open Ardia tabs and profiles from Raycast and switch to one, and open new tabs and
windows, like Dia's Raycast extension.

**Search Tabs** lists every window's tabs (sidebar order, front window first), with the page's
favicon, its host, a pin for pinned tabs, "Current" for the tab the front window shows and the
window number when more than one is open. Typing searches titles and hosts as written: tabs whose title
starts with it come first, then a word in the title starting with it, then the title containing it, then
the host. When every typed word appears but not together, the tab comes next. Tabs whose title words
start with the typed letters (`gads` for "Google Ads") follow under Other matches. Ties keep sidebar
order. While Ardia is closed or has no window open, it shows the tabs it last saw, and switching to one
opens its address in Ardia.

| Action | Shortcut |
|---|---|
| Switch to Tab (selects it, brings its window forward, activates Ardia) | ↵ |
| Copy URL | ⇧⌘C |
| Close Tab | ⌃X |
| Reload Tabs | ⌘R |

**Search Profiles** lists your profiles in Ardia's order, with how many tabs each has open and
"Current" for the one the front window shows.

| Action | Shortcut |
|---|---|
| Switch to Profile (shows it in the front window, or in a new window when the front one is incognito or there's none; activates Ardia) | ↵ |
| Open in New Window | ⌘↵ |
| Reload Profiles | ⌘R |

**New Tab** opens a tab in the front window. Give it a URL or a search and Ardia reads it the way
its command bar does, with your search engine; give it nothing and you get a blank tab. Add it to
Raycast's fallback commands and text typed in Raycast's root search can go straight to it.

**New Window** opens a window in your default profile, or in the profile you name (case doesn't
matter, and the start of a name is enough when no other profile starts the same way; when several
do, it names them and opens nothing). **New Incognito Window** opens an incognito one.

It talks to Ardia through its AppleScript dictionary (`Ardia.sdef` in the app), so every command except
Search Tabs' saved list needs Ardia running. The first time, macOS asks whether Raycast may control Ardia
(System Settings › Privacy & Security › Automation); allow it.

## Install (development)

Needs [Raycast](https://raycast.com) and Node 22 or newer.

```bash
cd extras/raycast-ardia
npm install
npm run dev     # ray develop: adds the extension to Raycast and rebuilds on save
```

Stop `npm run dev` when you're done: the extension stays in Raycast. `npm run build` checks that it
compiles, `npm run lint` runs Raycast's linter, and `npm test` checks the AppleScript it sends
and how it reads the answer.

## How it works

`src/scripts.ts` builds the AppleScript (no Raycast imports, so it can be tested on its own):

- `return running of application id "…"` checks that Ardia is running in a script with no `tell` block,
  because any script that names an app in a `tell` block starts that app when it loads; the list and
  the window check only run after it says yes;
- the list stops with an error when Ardia has no window, so the saved list stays; otherwise it reads
  `id`, `title`, `URL`, `isPinned` and `isFocused` of every tab of each window, one Apple event per
  property and window, joined with ASCII separators;
- Switch runs `focus (tab id "…" of window id "…")`, then `activate`; with no Ardia window it opens
  the tab's address in Ardia instead;
- Close runs `close (tab id "…" of window id "…")`;
- the profile list reads `id` and `name` of every profile, counts each one's tabs, and marks the
  `active profile` of window 1 (none when it's incognito);
- Switch to Profile runs `focus (profile id "…")`, or `make new window with properties
  {active profile:(profile id "…")}` when that fails, then `activate`;
- New Tab runs `make new tab with properties {URL:"…"}`, or `make new tab` when empty, then
  `activate`; Ardia resolves the text with the same parser as its command bar (`resolveInput`
  in `packages/core`);
- New Window runs `make new window`, with `{active profile:(profile id "…")}` for a profile or
  `{incognito:true}`, then `activate`.

The scripts address the app by bundle id (`com.ardia.browser`). Search Tabs' scripts were checked
against a running Ardia with the app's DEV AppleScript runner (`ac.shell.devRunAppleScript`, the
same text with `tell current application`), which avoids macOS's Automation prompt.
