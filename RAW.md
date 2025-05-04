# Unitodo
- **Unifying Distributed TODOs**

## idea

- give every todo a unique ID while distributing them everywhere
- collect them in real time at one place 
    - obsidian (simply a markdown file)?
    - webview? notion? terminal?
- (impact) so that every TODO is in one place, and all you need to do today is DO things after ranking them.

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
- [ ] 1@AoVs5 content lalalaa
```
where:
- At the beginning, `1` is any alphanumeric string before `@` or `#`, for user to prioritize the TODO in a alphabetically sorted list.
    - EG, I use `0-3` to indicate the priority tier, `0` being the highest.
- `@fffff` is a timestamp indicating when the TODO was created, using my timestamp format, 5-char URL-safe base64 unix timestamp, starting from 25.1.1, EG: `AlscR`.
    - `@@eeeee` is a timestamp indicating when the TODO was done.
- `#Jl_obVmSA7XCwzp7hkT2r` is a unique nanoid of 20 chars.
- `##12` is a unique incremented number id, assigned by unitodo system.
- Only one of `@fffff`, `#Jl_obVmSA7XCwzp7hkT2r`, `##12` is needed in one line. If more than one is present, the first one will be used.
- We only match all of above stuff in the-first-word of the line, excluding all leading blanks and `:`.



## todo

- [ ] 1 fix that `d` and `?` triggers hotkey even while i am typing in the text-editor
- [ ] 0 if the line contain "UNITODO_IGNORE_LINE", ignore all todos found in this line; if the file contain "UNITODO_IGNORE_FILE", ignore all todos found in this file
- [ ] 0 prove it to be useful by doing a project - wait, base on my experience, unique-id can be ignored, just fucking assume the line stays the same between aggregation and editing.
- [ ] button/hotkey to add append " // UNITODO_IGNORE_LINE" to the current line, if the line from a `.c/rs/md/ts` file
- [ ] 1 allow for adding todo to a project/glob, by append to `new.todo` file beside the `.git` folder. 
  - For projects, the user should assign a project default folder for the `new.todo` file.

- [ ] 1 make it `2@AoVtC:` instead of `2@AoVtC`
- [ ] 1 fix toggle-checkbox, and all hotkeys
- [ ] 1 edit the toml (especially projects) in the frontend

- [ ] 0 wait, wtf, when you add id you are assuming the todo item did not change place between aggregation and editing, FUCK. (maybe add checkLayer in rust to check exact existence of the todo item in the file, and if not, abort. And, rust needs to lock the file during checking and applying editing)
- [ ] 2#jvxJSUV_L1VgU5c3uleQ make dev run easier: no need to start both backend and frontend separately (maybe let rust be part of node.js to avoid port-conflict and be simpler)

- [ ] 1#6rCK5SlYLmWv0Ke-kGLq render basic markdown of the content; open wikilink using obsidian-uri
- [ ] 2@AoVsq make this repo public
- [ ] 2#wTzSLqzruFudt5f7Sf0W check command injection safety
- [ ] 2@AoVtD show dependency of todos?
- [ ] 2#tOvIdO-8kDD0skxZe97m DB instead of json (200KB though)?
- [ ] 2#PZ_0stf0wpRHVBP7R13M ag: include / file types?
- [ ] 3 curious of battery consumption
- [ ] 3@AoVsd see from cease plugin, how to inline-render a string
- [ ] 3 show currently focused tab and (maybe) the focused item (unique id or index if no unique-ensured id) in the address bar, for easy navigation back?

- [ ] 1 FANCY: add mcp server; let agent navigate files, pick easy todos and resolve them with agency.

- [x] 0 copy-sync-file is awkward. let the frontend invoke the backend rust program every 5 second to aggregate the latest (distributed) TODOs
- [x] 0 we need a unique id for each TODO, to support bi-directional sync (since the TODO line position may change)
  - [x] let only unique-ensured id be editable and synced. show non-unique-ensured id in a different color, read-only.
  - [x] let the frontend parse the content (which includes the-first-word), show it in a very advanced text-editor, where the-first-word is separated into small blocks, and each block is a button to edit part of the-first-word, and the remaining content is just editable text. The overall text-editor is like a text-editor in cursor. The overall text-editor is readonly if no unique-ensured id is present.
  - definition of the-first-word: the-first-word is the first word after the matched pattern (TODO) in the line (separated by blank after it).
- [x] 0 editable <- parser
- [x] X 3 switch to SolidJS (for better performance), instead of RaectJS


## Best practices

[TODO: simply put a 0/1/2/3 in the front of the line, to indicate the priority, when alphabetically sorted]

## Known issues

- support one-line TODO only
- to bi-directional sync, for now, we assume that the input TODOs are edited 
- we assume all created timestamps are unique. (you do not create more than 1 todo within 1 second)

## Frontend

A React frontend has been added to display the todo items in a web interface:

- Display todos grouped by categories (Project, Git Repo, Other)
- Filter todos by status (All/Active/Completed)
- Responsive design with modern UI

See [FRONTEND.md](FRONTEND.md) for more details on the frontend implementation.

### Running the Frontend

1. First run the Rust backend to generate the todo data:
   ```bash
   cargo run
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Run the frontend development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.