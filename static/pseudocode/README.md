# Pseudocode dump

One `.txt` file per unique PlayMaker FSM.
Each file contains a list of where that FSM can be found, as well as the pseudocode representation of the FSM.

## File format

Each file has a `#`-comment header followed by the pseudocode:

```
# <fsm name>
#   <scene> / <game_object>
#   ...

fsm <name> {
  start <state>
  on <event> → <state>  // from any state

  state <name> {
    <Action>(<param>=<value>, ...)
    on <event> → <state>
  }
}```

## File naming

Filenames start with the FSM name. If that collides, the names of the game object parents, then the scene name, are appended until it is unique.
