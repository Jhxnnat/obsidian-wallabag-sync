# Wallabag Sync

> [!NOTE]
> All of this is inspired the official Instapaper Plugin: https://github.com/Instapaper/obsidian-instapaper/

This plugin lets you sync your wallabags highlight/notes with your notes.
After you config the credentials you can run the **Wallabag Sync: Run now** command from the command palette.

Notes get the following properties:
- title
- url
- author
- wallabag_id
- tags
- date
- pdate

## Template

- {{text}} - The highlight text
- {{link}} - Link to the source article
- {{blockId}} - Block identifier for linking to this highlight, in the form `^h{annotationId}`
- {{note}} - Your personal note for this highlight
- {{annotationId}} - The wallabag annotation ID
- {{created}} - When the highlight was created
- {{updated}} - When the highlight was last updated

Checkout [Mustache](https://mustache.github.io/) to see more.

default template:
```
> {{text}} {{blockId}}
{{#note}}

{{note}}
{{/note}}
```

Annotations are identified by the blockId, Mustache does it all.

# Properties

> WIP!!

# TODO
- add link to guide on how to setup clientId/secret on settings
- properties customization
- link to the wallabag entry
- option to get a hole article like obsidian clipper??
- auto sync
- toggle to use properties or not
- add script to build and copy the plugin into my actual vault??
- new settings api thingy
- update notesFolder setting if folder is renamed
- refresh token expired bug -> auto connect
