# Google Play store listing

The text of the Play Store listing, kept here so it can be read and edited
without opening the Play Console. Nothing reads these files automatically —
when publishing a release, paste them into the Console by hand.

| File | Field | Play limit | Current |
|---|---|---:|---:|
| `title.txt` | App name | 30 | 9 |
| `short_description.txt` | Short description | 80 | 44 |
| `full_description.txt` | Full description | 4000 | 2965 |

Keep them as plain text with no markup, so they paste straight in. The full
description accepts a small amount of HTML, but the current text uses none and
is easier to maintain that way.

Release notes are not kept in the repo. The Play Console provides a text box
for "What's new" at upload time, and that is the only place they are needed.
These files previously lived under `fastlane/metadata/android/en-US/`, a layout
required by F-Droid; that distribution was dropped in v1.2.3.
