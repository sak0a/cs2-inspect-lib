# Command line

Install globally or use the local binary through `npx`:

```sh
npm install -g cs2-inspect-lib
cs2inspect --help
```

## Create a link

```sh
cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15
```

## Read a link

Replace `$INSPECT_URL` with a link, or set it in your shell first.

```sh
cs2inspect decode "$INSPECT_URL"
cs2inspect info "$INSPECT_URL"
cs2inspect validate "$INSPECT_URL"
```

Embedded links decode offline. For legacy S/M links, `decode --help` lists the Steam options. Steam credentials passed as command-line arguments may appear in shell history and process listings; applications should prefer the [programmatic integration](./steam.md).

## Discover options

```sh
cs2inspect encode --help
cs2inspect decode --help
cs2inspect info --help
```

The CLI supports the common item creation fields. Use the TypeScript API for arrays of custom names and binary `blobdata`.
