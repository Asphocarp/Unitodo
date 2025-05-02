# Unitodo


## idea

- give every TODO a unique ID while distributing them everywhere
- collect them in real time at one place 
    - obsidian (simply a markdown file)?
    - webview? notion? terminal?
- (impact) so that every TODO is in one place, and all you need to do today is DO things after ranking them.

## related work:
https://marketplace.cursorapi.com/items?itemName=fabiospampinato.vscode-todo-plus


## format / parsing

Everything after TODO is optional.
```bash
T0DO#fffff!NANFfffff content
where:
`fffff` is my timestamp format, 5-char URL-safe base64 unix timestamp, starting from 25.1.1, EG: `AlscR`.
f means a char from URL-safe base64 char set, N means a char 0-9s.
#fffff for created at `fffff` timestamp, !N for tier(0-3), AN for actionable(0-3), Ffffff for finished at `fffff` timestamp, content is the rest of the line.
```
EG:
```bash
T0DO#AlscR!0ANF161616 eat well
- [ ] T0DO#AlscR!0ANF161616 eat well again
```
Inline-Render as:
```bash
- [ ] T0DO#[]!0ANF161616 eat well
- [ ] T0DO#AlscR!0ANF161616 eat well again
```


- todo
    - 0 format, elegant even in text form
        - type-able. short; unique (rg-able), abnormal
            - better: data all simply text; one-line?
        - `TOD0#A7g3O (uuid)`
        - `TOD0@A7g3O (timestamp)`
        - `- [ ] TOD0#A7g193O do abc and abc`
        - hash: time-inc, how about simply timestamp (start from 25)
    - [ ] 0 how to mark
    - [ ] 0 see from cease plugin, how to inline-render a string



- [ ] 1 polish readme/intro of Mira.vsix ← record a gif 



- TODO 2 make this repo public


- [ ] check command injection safety

- [ ] consider `glob` instead of `regex`

- [ ] TODO include? / file types?

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