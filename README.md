# hk-fsms

Dump of all PlayMaker FSMs of the games Hollow Knight and Silksong.
Available online at https://jakobhellermann.github.io/hk-fsms/ss

Additionaly, a text-only pseudocode dump is available at [./static/pseudocode](./static/pseudocode).

## Development

The project contains two parts, the indexer at [./indexer](./indexer), which scans the game files and builds some static 
json files containing a cleaned up presentation, and the frontend in [./src](./src) which renders that data on a static website.

```sh
# run the indexer and compress the results into ./static/data/{hk,ss}.tar.zst
just index

# generate a text-only pseudocode dump in ./out/pseudo.
just dump-pseudo

# start the frontend with hot-reloading
pnpm run dev
```

For deployment, the static `tar.zst`s are checked in and extracted in the github action which build the github pages website build.
