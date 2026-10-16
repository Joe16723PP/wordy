# Word pool

`words.jsonl` contains 1,000 unique lowercase five-letter English words used as random answer candidates. Each JSONL record has one `word` field. The app uppercases entries when loading them.

The list is seeded with Wordy's existing sample answers, then filled from the source list in its published order. In a `file://` preview where browsers block fetching local JSONL files, Wordy falls back to its small built-in sample list. Static hosts can load the complete asset.

Source: [darkermango/5-Letter-words](https://github.com/darkermango/5-Letter-words), used under the MIT License. See `WORDLIST-LICENSE.txt`.
