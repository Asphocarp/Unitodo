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
TODO#fffff!NANFfffff content
where:
`fffff` is my timestamp format, 5-char URL-safe base64 unix timestamp, starting from 25.1.1, EG: `AlscR`.
f means a char from URL-safe base64 char set, N means a char 0-9s.
#fffff for created at `fffff` timestamp, !N for tier(0-3), AN for actionable(0-3), Ffffff for finished at `fffff` timestamp, content is the rest of the line.
```
EG:
```bash
TODO#AlscR!0ANF161616 eat well
- [ ] TODO#AlscR!0ANF161616 eat well again
```
Inline-Render as:
```bash
- [ ] TODO#[]!0ANF161616 eat well
- [ ] TODO#AlscR!0ANF161616 eat well again
```


- todo
    - 0 format, elegant even in text form
        - type-able. short; unique (rg-able), abnormal
            - better: data all simply text; one-line?
        - `TODO#A7g193O (uuid)`
        - `TODO@A7g193O (timestamp)`
        - `- [ ] TODO#A7g193O do abc and abc`
        - hash: time-inc, how about simply timestamp (start from 25)
    - [ ] 0 how to mark
    - [ ] 0 see from cease plugin, how to inline-render a string



- [ ] 1 polish readme/intro of Mira.vsix ← record a gif 



- TODO 2 make this repo public


- [ ] check command injection safety

```
what if a repo is called "No Repo"? decide a better placeholder name, that won't raise such concerns.

remove all unitodo.md in git history
```