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
T0DO1@fffff content
T0DO1#Jl_obVmSA7XCwzp7hkT2r content
T0DO1##12 content
T0DO1@fffff@@eeeee content

T0DO 1@fffff content
T0DO: 1@fffff content
- [ ] 1@fffff content
```
where:
- At the beginning, `1` is any alphanumeric string before `@` or `#`, for user to prioritize the TODO in a alphabetically sorted list.
    - EG, I use `0-3` to indicate the priority tier, `0` being the highest.
- `@fffff` is a timestamp indicating when the TODO was created, using my timestamp format, 5-char URL-safe base64 unix timestamp, starting from 25.1.1, EG: `AlscR`.
    - `@@eeeee` is a timestamp indicating when the TODO was done.
- `#Jl_obVmSA7XCwzp7hkT2r` is a unique nanoid of 20 chars.
- `##12` is a unique incremented number id, assigned by unitodo system.
- Only one of `@fffff`, `#Jl_obVmSA7XCwzp7hkT2r`, `##12` is needed in one line. If more than one is present, the first one will be used.
- We only match all of above stuff in the first word of the line, excluding all leading blanks and `:`.



## todo

- [ ] show as tabs instead of sections
- [ ] 0 we need a unique id for each TODO, to support bi-directional sync (since the TODO line position may change)
  - [ ] let only unique-ensured id be editable and synced. show non-unique-ensured id in a different color, read-only, and with buttons to insert a nanoid/incremented-id for it.
- [ ] editable

- [ ] TODO include / file types? for ag
- [ ] check command injection safety
- [ ] 0 see from cease plugin, how to inline-render a string
- [ ] 1 polish readme/intro of Mira.vsix ← record a gif 
- [ ] 2 make this repo public
- [x] 0 copy-sync-file is awkward. let the frontend invoke the backend rust program every 5 second to aggregate the latest (distributed) TODOs


## Best practices

[TODO: simply put a 0/1/2/3 in the front of the line, to indicate the priority, when alphabetically sorted]

## Known issues

- support one-line TODO only
- to bi-directional sync, for now, we assume that the input TODOs are edited 


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