# Unitodo

- **Unifying Distributed TODOs** <!-- UNITODO_IGNORE_LINE -->

## idea

- give every todo a unique ID while distributing them everywhere
- collect them in real time at one place
  - obsidian (simply a markdown file)?
  - webview? notion? terminal?
- (impact) so that every Todo is in one place, and all you need to do today is DO things after ranking them.

## story

pain point:
- notion: not hign-performance; bi-sync; vim; (intelligent adding)
- finally, being able to control your own recommendation system (prompts as recommendation algorithm)
  - When you use any social media, you're not really choosing what you're looking at. You just scroll and the site decides what you're going to look at next.

motivation/insight:
- LLM-friendly, plain-text, vim-able, high-performance, distributed, bi-sync TODO system.
- LLM has tendency to leave todos/placeholders in codes, like this: 
```ts
  // ---- Placeholder for YouTube API fetching logic ----
  // This would involve: 
  // 1. Calling YouTube Data API v3 (e.g., search.list or playlistItems.list)
  //    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${youtubeChannelApiId}&order=date&maxResults=50&type=video&key=${YOUTUBE_API_KEY}`
  // 2. Paging through results if necessary.
  interface ApiVideoItem { 
    id: { videoId: string }
    snippet: { 
      title: string
      description: string
      publishedAt: string
      thumbnails: { high?: { url: string }, medium?: {url: string}, default?: {url: string} }
      channelId: string // To confirm it matches
      channelTitle: string // Can be used if our DB stored one is stale
    }
  }
  const fetchedVideosFromApi: ApiVideoItem[] = [] // Replace with actual API call
  // --- End of Placeholder ---

  if (fetchedVideosFromApi.length === 0) {
    // Update last fetched time even if no new videos, to indicate an attempt was made
    await db.update(sourcesTable)
      .set({ lastFetchedAt: new Date(), updatedAt: new Date() })
      .where(eq(sourcesTable.sourceId, genericSourceId))
    console.log("No new videos found or API call placeholder not implemented for channel:", youtubeChannelApiId)
    return
  }
```
- therefore, it is natural to let it cook, and aggregate todos later. (besides, rg is fast)
  - ! but: let it register todos after coding is also not that hard...

## related work

<https://marketplace.cursorapi.com/items?itemName=fabiospampinato.vscode-todo-plus>
<https://www.task-master.dev/>

- key diff:
  - with key features, but not disturbingly long even in plain text (in code)
  - focus on so-called `embeded` todos.
  - all-in-one experience.
  - same in: plain-text


## format / parsing

EGs:

```bash
T0DO1@fffff content lalalaa
T0DO1#Jl_obVmSA7XCwzp7hkT2r content lalalaa
T0DO1##12 content lalalaa
T0DO1@fffff@@eeeee content lalalaa

T0DO 1@fffff content lalalaa
T0DO: 1@fffff content lalalaa
- [ ] 1@AoVs5 content lalalaa
- [-] 1@AoVs5 In progress example // UNITODO_IGNORE_LINE
- [x] 1@AoVs5 Done example // UNITODO_IGNORE_LINE
- [/] 1@AoVs5 Cancelled example // UNITODO_IGNORE_LINE
```

where:

- At the beginning, `1` is any alphanumeric string before `@` or `#`, for user to prioritize the TODO in a alphabetically sorted list. <!-- UNITODO_IGNORE_LINE -->
  - EG, I use `0-3` to indicate the priority tier, `0` being the highest.
- `@fffff` is a timestamp indicating when the TODO was created, using my timestamp format, 5-char URL-safe base64 unix timestamp, starting from 25.1.1, EG: `AlscR`. <!-- UNITODO_IGNORE_LINE -->
  - `@@eeeee` is a timestamp indicating when the TODO was done. This timestamp is typically appended when an item is transitioned to a "DONE" state (e.g., the third state in a configured set like `- [x]`). <!-- UNITODO_IGNORE_LINE -->
- `#Jl_obVmSA7XCwzp7hkT2r` is a unique nanoid of 20 chars.
- `##12` is a unique incremented number id, assigned by unitodo system.
- Only one of `@fffff`, `#Jl_obVmSA7XCwzp7hkT2r`, `##12` is needed in one line. If more than one is present, the first one will be used.
- We only match all of above stuff in the-first-word of the line, excluding all leading blanks and `:`.
- The initial part of the line (e.g., `- [ ] `, `TODO:`, `T0DO`) determines the TODO's current state. These state markers are configurable in `todo_states` in `config.toml`, where each sub-array defines a set of states (e.g., Todo, Doing, Done, Cancelled).

## Best practices

- simply put a 0/1/2/3 in the front of the line, to indicate the priority, when alphabetically sorted

## Known issues

- support one-line TODO only <!-- UNITODO_IGNORE_LINE -->
- to bi-directional sync, for now, we assume that the input todos are edited
- we assume all created timestamps are unique. (you do not create more than 1 todo within 1 second)

## Installation

Download the latest release from the [releases page](https://github.com/Asphocarp/unitodo/releases).

MacOS users may need to run the following command to remove the quarantine attribute:

```bash
xattr -cr /Applications/Unitodo.app
```

The config file is at `~/.config/unitodo/config.toml`.

## NO_RELEASE_UNTIL

- but end up feeling more productive editing markdown.

- [ ] 2@Apt3d (fancy) edit online; api to fetch from notion, slack, etc
- [ ] 2 support timeline
- [ ] 1@Aruxf figure out history-edit / bi-sync problem, so that supporting view on phone;
- [ ] 0@Aq6hD tree-view / dep-chain-view  (table,tab,section,tree)-view
- [ ] 0@AqTDc polish readme and homepage like <https://inputsource.pro/zh-CN>, <https://github.com/runjuu/InputSourcePro>

## Todos

- i feel that unitodo goes wrong. the goal was to make any thing i wanna do from anything to a linear list. so that i can keep on doing one by one.
  - which seem to require a unique id (for sorting)
- feature
  - list mode (In A Row)
  - tree mode
    - archive (remember position in tree)
    - dependency relationship, taxonomy, in a row
    - 3d? color? just highlight the first in the tree?
  - vim modal

- [x] 2@@ArSOf unique-id can be fucking doomed! (with checking before applying)
  - [x] 2@@ArSOR render timestamp (even when not leading) / remove it?
- [ ] 1 ci: submit to homebrew cask; make doc and everything more user-friendly

- [x] 2@@ArSOC move sorting to frontend (natural sorting like 0-1 < 0-2 < 0-10 < 0)
- [ ] 1 feat: show est time, like @1h; record time?

- [ ] 1 render basic markdown of the content, like bold, italic, code, link, wikilink etc.
- [x] 2@@ArSL8 X check command injection safety
- [ ] 2 (fancy) show dependency of todos?
- [x] 2@@AptmE DB instead of json (200KB though)? X - gRPC now
- [x] 3@@ArSOs rg: file types?
- [x] 3@@ArSOq curious of battery consumption
- [x] 3@AoVsd@@Aq6f3 see from cease plugin, how to inline-render a string - X no need to see it inline
- [x] 3@@ArSO4 show currently focused tab and (maybe) the focused item (unique id or index if no unique-ensured id) in the address bar, for easy navigation back?

- [-] 1 fancy: add mcp server; let agent navigate files, pick easy todos and resolve them with agency. (cli would work too though)

---

- [x] 2@@ApcTI make dev-run easier: no need to start both backend and frontend separately (maybe let rust be part of node.js to avoid port-conflict and be simpler)
- [x] 1@@ApYk0 add search via `/`
- [x] 2@AoVsq@@ApW8A make this repo public
- [x] 1 do not scroll twice (when 5j too low)
- [x] 1 fix: when i type in search textarea, the focus is immdietely taken by the todo item, making me unable to continue my typing.
- [x] 1@@ApYJ6 feat: fix hotkeys, toggle-checkbox
- [x] 1@@ApYQO add feat: `space` to mark the todo item as done via: 1. change current state marker (e.g. `TODO`/`- [ ]`) to its corresponding "DONE" state marker (e.g. `DONE`/`- [x]`, typically the third item in a state set in `config.toml`) 2. append `@@fffff` (the finished timestamp) to the-first-word // UNITODO_IGNORE_LINE
  - [x] 2 make it configurable, like sets of `TODO`/`DOING`/`DONE`/`CANCELLED` states in `config.toml` // UNITODO_IGNORE_LINE
- [x] 1 fix: using "display: flex" or "display: inline-flex" on an element containing content editable, Chrome may have unwanted focusing behavior when clicking outside of it. Consider wrapping the content editable within a non-flex element.
- [x] 0 add feat: allow for adding todo to a section (git/project currently) (press `o`), by append to `unitodo.append.md` file beside the `.git` folder (if it is a git section). if it is a project section, the user should have assigned a project default file path for appending to it (like the `/path/to/project/unitodo.append.md`). (you need to add config items for this)
- [x] 0 all a config page for the frontend, where almost anything can be configed, including: 0. project setting in the toml 1. auto-refresh interval 2. vscode/cursor uri 3. ignore glob list. At best replace entire toml config file via more payload for both apis (modify the rust api @main.rs accordingly)
- [x] 0 fix: profile and optimize frontend performance, when the list is >800 items. via virtualized list.
- [x] 3 maybe optimize via hash of ori-content? X - no need, the content is not long
- [x] 0 X fancy: merge rust-module into node.js via napi-rs - X only to -5ms json parsing, tranmission is not bottleneck!
- [x] 1 X store entire line in the json, to future-proof when writing back to the file? no need, we only change the todo content
- [x] X 1 make it `2@AoVtC:` instead of `2@AoVtC`
- [x] 0 check if the todo item is changed between aggregation and editing, if so, abort. (lock the file during editing)
  - [x] 0 wait, wtf, when you add id you are assuming the todo item did not change place between aggregation and editing, FUCK. (maybe add checkLayer in rust to check exact existence of the todo item in the file, and if not, abort. And, rust needs to lock the file during checking and applying editing)
- [x] 1 button/hotkey to add append " // UNITODO_IGNORE_LINE" to the current line, if the line from a `.c/rs/md/ts` file
- [x] 1 fix that `d` and `?` triggers hotkey even while i am typing in the text-editor
- [x] 0 copy-sync-file is awkward. let the frontend invoke the backend rust program every 5 second to aggregate the latest (distributed) todos
- [x] 0 we need a unique id for each TODO, to support bi-directional sync (since the TODO line position may change) <!-- UNITODO_IGNORE_LINE -->
  - [x] let only unique-ensured id be editable and synced. show non-unique-ensured id in a different color, read-only.
  - [x] let the frontend parse the content (which includes the-first-word), show it in a very advanced text-editor, where the-first-word is separated into small blocks, and each block is a button to edit part of the-first-word, and the remaining content is just editable text. The overall text-editor is like a text-editor in cursor. The overall text-editor is readonly if no unique-ensured id is present.
  - definition of the-first-word: the-first-word is the first word after the matched pattern in the line (separated by blank after it).
- [x] 0 editable <- parser
- [x] X 3 switch to SolidJS (for better performance), instead of RaectJS
- [x] 0 can you find a most high-performance way to implement this (maybe using `rg`'s grep-searcher + grep-regex): if the line contain "UNITODO_IGNORE_LINE"
- [x] 1@ApYt7@@ApcuT add a config item for the default append todo file basename for a git section (currently it is `unitodo.append.md`)
- [x] 1@ApYun@@ApZG2 no more succeed huge alert, just a simple pop info should be ok
- [x] 1@ApZNj@@ApdML allow no more cursor inside a Lexical chip/node; render the `@fffff` chip as readable format, but keep the text-content behind it same as before; - but maybe make it a table col is better
- [x] 1 do not fix the gRPC port, so that if some other app is using the same port 50051, it will not conflict.
- [x] 0@@App-V fix macos Electron app of `npm run electron:package:mac`
- [x] 0@@ApqT1 change current RESTful API to gRPC, using tonic (sidecar) for rust backend.
- [x] 0-0@@Apqdj fix: do when pressing `enter` to open the vscode uri, the page should not change. (maybe there is a better native way to do this) And after that, activate back to the focused item when i open the vscode uri
- [x] 0@@ApqkU fix: toggle-checkbox is goes wrong, fucking again
- [x] 0@ApdyT@@Apqkg add feat: convert this entire app to a Electron app (e.g. for macos)
- [x] 0@Apdzo@@ApqxA fix: when appending via `o`, do not ignore my leading prior 0/1/2/3;
- [x] 1@@Apqxs X fancy: make it a native app? (rn/swift?) - Electron now
- [x] 1 polish UI: more rounded corners for buttons and everything, fancier&elegant, minimalistic style; just remove the header inside the webpage, move the updated time info to the header besides the buttons;
- [x] 1@@ArSIH polish dark mode UI
- [x] 1@@ArSLR why is my macos electron .app file so huge (500MB)? any idea to make the electron app package size smaller? - Tauri now
- [x] 1@@ArSIq X remember the state of last focused tab and item index for each tab, restore it when the app is reopened / switching between tabs; - using table now
- [x] 2@Apdxw@@ArSMR config profile slots, offering mixed view (all todos from all projects mixed ranking, project source at right)
- [x] 2@@ArSOJ remove the native title bar in macos electron app, by moving the 3 macos buttons at the left of the web title header
- [x] 2@AptAw@@ArSMz doc: say that by default config at ~/.config/unitodo/unitodo.toml
- [ ] 2@AptCd even when nothing changed, the updated time should be updated
- [ ] 1@Aptsh fix: make click on a lexcial editor starts editing
- [x] 1@Aptww@@Aq6dl fix: click on filename should behave the same as pressing enter (no new windows popup)
- [ ] 1@Aptz8 show GET todos time cost, auto-adjust interval to be larger than it, and for user to tune refresh interval
- [ ] 1@Apt6w fancy: like notion-mail, define view/filters (replace proj); hover (or v) to show nearby lines, maybe make it a card component, show more info like file path;
- [ ] 1@Apt7C fancy: left sidebar (instead of tabs)
- [x] 2@Apt81@@Aq6fI let the priority part include "-" (not just alphanumeric)- X no more concept of fisrt word, simply append timestamp and stuff at the end
- [ ] 2@ApuFL rust backend offer exact char pos instead of just line pos, so that following checking can be easier
- [ ] 2@Ap-nc UI: the "edit" "ignore" button at the left of filename instead of right (currently)
- [x] 0@AqTDq@@AqWoV tarui instead of electron!
- [x] 0@AqWoP@@Aqn1l fix: enter to open
- [x] 01@AqnH7@@AqnWV fix sorting (blank > number)
- [x] 0@AqoNf@@AqpXT add updater <https://v2.tauri.app/plugin/updater/>
- [ ] 0@AqoSu feat: log or track: log when create/start/finish, est time, time elapsed
- [x] 000@Aq2kC@@Aq24r update config
- [x] 1@Aq2qH@@Aq6c- fix dark mode titlebar color
- [x] 000@Aq26w@@Aq3Lo do you have any idea why `npm run dev` of this project would consume 1000% of CPU - it is rust backend in dev mode not optimized
- [ ] 1@Aq6Ux CI: fix windows linux error caused by drag-feat

- [x] 00 table-view; show file git repo (if available) or project name (not if in tab-mode);
  - add a table view for items of this todo page @Todo.tsx (each item is a row), with cols of: content, zone (git-repo or project-name), file(filename:line), created(time), finishe    d(time), est(duration).
    - @web, maybe you can find a high-performance interactive table component for this (one that allow user to drag cols around). tell me your choice of component first.
  - x find a way to quick debug the frontend ui without re-run the entire app
  - D round corners of the table; make the table more compact, info-dense; polish its UI to fit overall style.
  - D contain corresponding nerd icon in the source col;
  - D show only basename in file col;
- D usable: show only cols of checkbox/zone/content/file, for now; frontend sorting;
  - [x] 1@ArCCd@@ArSHm add feat: profiles of configs, meaning user can switch between different config profiles.
    - @app  @src @tauri.conf.json @unitodo.proto @Cargo.toml @package.json
    - add feat: profiles of configs, meaning user can switch between different config profiles.
    - let each profile contain all of current config items.
    - remember to adjust the config page frontend to fit the new profile-switchable feature. (add, modify, delete profile); use shadcn if you want.
    - continue to save all profiles in `~/.config/unitodo/config.toml`, the default profile is `default` (which can not be deleted).
  - (then design algo for appending to filters)
- [ ] 1@Aq6kT item color (base on git repo or project color)
- [x] 1@Aq7DJ@@ArSKQ X separate dev and release config? or let the frontend connect the same one
- [ ] 1@ArB_8 (hard) fix: align cells in a col when resizing window
- [ ] 2@ArSPW support uri like unitodo://timestamp/xxx
- [x] 00@ArSeL@@ArUS3 minor: upgrade next.js react.js to SOTA fancy versions; a or i for editing:
  - make the content cell in TodoTable @TodoTable.tsx  editable, and we can start to edit it like we can do via pressing 'a' or 'i' like in @TodoItem.tsx @Todo.tsx .
- [x] 00@ArYft@@ArYkt font
- [x] 000@Arnrm@@Arv8T fix: whenever i am editing the table content cell and typing in the middle of the content, it always got my cursor back to the end of the content (i guess it keeps on triggering setting editedContent and rerendering and resetting the cursor to the end of the content)
- [x] 001@AroT3@@ArwnW fix: too much margin at the right of icon;
- [x] 000@@Arwm9 time format
- [x] 000@@Aruxo rounded highlight whole item;
- [x] 000@@Aruxu make 000 prior a chip (render using lexcial in table-view)
- [x] fix other mode content should not be original
- [ ] 1@Aron2 allow for switch profile in main page
- [ ] 0@AruxC rethinking workflow (add to current queue; view on phone; record, track, pause)
- [ ] 2@Ar4YD UI: align buttons
- [ ] 00 EZ rename to `lemdo`; rename `UNITODO_IGNORE_LINE` to `LEMDO_IGNORE`.
- [ ] 00 EZ fuck @stuff, just use 7-char nanoid as unique id; use @abc(xxx) as fields, @file://xxx as file-link?

- [x] @@AuNy0add (4-state system) give an un-sorted sec / states: TODO([ ]), DOING/IN-PROGRESS([-]), DONE([x]), CANCELLED([/]) - THINK: make it a field, or the prefix, or a field in new novel prefix (like LDO (easier to type), i prefer!)? -> This is now implemented via configurable `todo_states`.
- [ ] 3 say in doc: org-mode inspired state management. https://orgmode.org/manual/TODO-Basics.html
- [ ] 2 no more @shit, simply @created(readable-timestamp) @finished(readable-timestamp)
- [-] make `apiCycleTodoState` more general, supporting cycle back, and then add hotkeys 'h' and 'l' in @TodoTable.tsx  for cycle back/forward respectively
- think: dependency system need external mcp (matching) tool for llm-based agents (just #xxxx is too hard for them to infer)