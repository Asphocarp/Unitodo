# Unitodo
- **Unifying Distributed TODOs** <!-- UNITODO_IGNORE_LINE -->


## idea

- give every todo a unique ID while distributing them everywhere
- collect them in real time at one place 
    - obsidian (simply a markdown file)?
    - webview? notion? terminal?
- (impact) so that every Todo is in one place, and all you need to do today is DO things after ranking them.

## related work:
https://marketplace.cursorapi.com/items?itemName=fabiospampinato.vscode-todo-plus

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
- [x] 1@AoVs5 content lalalaa
```
where:
- At the beginning, `1` is any alphanumeric string before `@` or `#`, for user to prioritize the TODO in a alphabetically sorted list. <!-- UNITODO_IGNORE_LINE -->
    - EG, I use `0-3` to indicate the priority tier, `0` being the highest.
- `@fffff` is a timestamp indicating when the TODO was created, using my timestamp format, 5-char URL-safe base64 unix timestamp, starting from 25.1.1, EG: `AlscR`. <!-- UNITODO_IGNORE_LINE -->
    - `@@eeeee` is a timestamp indicating when the TODO was done. <!-- UNITODO_IGNORE_LINE -->
- `#Jl_obVmSA7XCwzp7hkT2r` is a unique nanoid of 20 chars.
- `##12` is a unique incremented number id, assigned by unitodo system.
- Only one of `@fffff`, `#Jl_obVmSA7XCwzp7hkT2r`, `##12` is needed in one line. If more than one is present, the first one will be used.
- We only match all of above stuff in the-first-word of the line, excluding all leading blanks and `:`.


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


## Todos

- [ ] 2 unique-id can be fucking doomed! (with checking before applying)
    - [ ] 2 render timestamp (even when not leading) / remove it?
- [ ] 1 ci: submit to homebrew cask; make doc and everything more user-friendly

- [ ] 2 move sorting to frontend (natural sorting like 0-1 < 0-2 < 0-10 < 0)
- [ ] 1 feat: show est time, like @1h; record time?

- [ ] 1 render basic markdown of the content; open wikilink using obsidian-uri
- [ ] 2 check command injection safety
- [ ] 2 (fancy) show dependency of todos?
- [x] 2@@AptmE DB instead of json (200KB though)? X - gRPC now
- [ ] 3 rg: file types?
- [ ] 3 curious of battery consumption
- [ ] 3@AoVsd see from cease plugin, how to inline-render a string
- [ ] 3 show currently focused tab and (maybe) the focused item (unique id or index if no unique-ensured id) in the address bar, for easy navigation back?

- [ ] 1 fancy: add mcp server; let agent navigate files, pick easy todos and resolve them with agency. (cli would work too though)

---

- [x] 2@@ApcTI make dev-run easier: no need to start both backend and frontend separately (maybe let rust be part of node.js to avoid port-conflict and be simpler)
- [x] 1@@ApYk0 add search via `/`
- [x] 2@AoVsq@@ApW8A make this repo public
- [x] 1 do not scroll twice (when 5j too low)
- [x] 1 fix: when i type in search textarea, the focus is immdietely taken by the todo item, making me unable to continue my typing.
- [x] 1@@ApYJ6 feat: fix hotkeys, toggle-checkbox
- [x] 1@@ApYQO add feat: `space` to mark the todo item as done via: 1. change `TODO`/`TODO:`/`- [ ]` to `DONE`/`DONE:`/`- [x]` 2. append `@@fffff` (the finished timestamp) to the-first-word // UNITODO_IGNORE_LINE
  - [x] 2 make it configurable, like pairs of `TODO`&`DONE`/`TODO:`&`DONE:`/`- [ ]`&`- [x]` // UNITODO_IGNORE_LINE
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
- [ ] 1 polish dark mode UI
- [ ] 1 why is my macos electron .app file so huge (500MB)? any idea to make the electron app package size smaller?
- [ ] 1 remember the state of last focused tab and item index for each tab, restore it when the app is reopened / switching between tabs; 
- [ ] 2@Apdxw config profile slots, offering mixed view (all todos from all projects mixed ranking, project source at right)
- [ ] 2 remove the native title bar in macos electron app, by moving the 3 macos buttons at the left of the web title header
- [ ] 2@AptAw doc: say that by default config at ~/.config/unitodo/unitodo.toml
- [ ] 2@AptCd even when nothing changed, the updated time should be updated
- [ ] 1@Aptsh fix: make click on a lexcial editor starts editing
- [ ] 1@Aptww fix: click on filename should behave the same as pressing enter (no new windows popup)
- [ ] 1@Aptz8 show GET todos time cost, auto-adjust interval to be larger than it, and for user to tune refresh interval
- [ ] 2@Apt3d fancy: fetch from notion, slack, etc
- [ ] 1@Apt6w fancy: like notion-mail, define view/filters (replace proj); hover (or v) to show nearby lines, maybe make it a card component, show more info like file path;
- [ ] 1@Apt7C fancy: left sidebar (instead of tabs)
- [ ] 2@Apt81 let the priority part include "-" (not just alphanumeric)- maybe no more concept of fisrt word, simply append timestamp and stuff at the end
- [ ] 2@ApuFL rust backend offer exact char pos instead of just line pos, so that following checking can be easier
- [ ] 2@Ap-nc UI: the "edit" "ignore" button at the left of filename instead of right (currently)
- [ ] 0@AqTDc polish readme and homepage like https://inputsource.pro/zh-CN, https://github.com/runjuu/InputSourcePro
- [x] 0@AqTDq@@AqWoV tarui instead of electron!
- [x] 0@AqWoP@@Aqn1l fix: enter to open
- [x] 01@AqnH7@@AqnWV fix sorting (blank > number)
- [x] 0@AqoNf@@AqpXT add updater https://v2.tauri.app/plugin/updater/
- [ ] 0@AqoSu feat: log or track: log when create/start/finish, est time, time elapsed
- [ ] 00 in a row -> profiles (filter append algo); tree mode
- [x] 000@Aq2kC@@Aq24r update config
- [ ] 1@Aq2qH fix dark mode titlebar color
- [x] 000@Aq26w@@Aq3Lo do you have any idea why `npm run dev` of this project would consume 1000% of CPU - it is rust backend in dev mode not optimized
- [ ] 1@Aq6Ux ci: fix windows linux error caused by drag-feat
