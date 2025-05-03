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


## format / parsing

EGs:
```bash
T0DO1@fffff content lalalaa
T0DO1#Jl_obVmSA7XCwzp7hkT2r content lalalaa
T0DO1##12 content lalalaa
T0DO1@fffff@@eeeee content lalalaa

T0DO 1@fffff content lalalaa
T0DO: 1@fffff content lalalaa
- [ ] 1@fffff content lalalaa
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

- [ ] 0 we need a unique id for each TODO, to support bi-directional sync (since the TODO line position may change)
  - [ ] let only unique-ensured id be editable and synced. show non-unique-ensured id in a different color, read-only, and with buttons to insert a nanoid/incremented-id for it.
  - [ ] let the frontend parse the content (which includes the-first-word), show it in a very advanced text-editor, where the-first-word is separated into small blocks, and each block is a button to edit part of the-first-word, and the remaining content is just editable text. The overall text-editor is like a text-editor in cursor. The overall text-editor is readonly if no unique-ensured id is present.
    - definition of the-first-word: the-first-word is the first word after the matched pattern (TODO) in the line (separated by blank after it).
- [ ] 0 editable <- parser

- [ ] 1 render basic markdown of the content; open wikilink using obsidian-uri
- [ ] 1 if the line contain "UNITODO_IGNORE", then skip it
- [ ] 2 switch to SolidJS (for better performance), instead of RaectJS
- [ ] 2 make this repo public
- [ ] 2 check command injection safety
- [ ] 2 show dependency of todos?
- [ ] 2 DB instead of json (200KB though)?
- [ ] 2 ag: include / file types?
- [ ] 2 polish tab-mode; fix icons; warp tabs; better UI, mode-switch button. denser UI.
- [ ] 3 see from cease plugin, how to inline-render a string
- [ ] 3 more hotkeys, even for vim users.

- [x] 0 copy-sync-file is awkward. let the frontend invoke the backend rust program every 5 second to aggregate the latest (distributed) TODOs

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