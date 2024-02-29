# Tabito

Very work in progress.

## Setup
First-time setup:
```sh
npx pnpm install       # install dependencies
npm run server:schema  # convert SQL schema to TypeScript interfaces
```

Then, start [Curtiz Japanese NLP](https://github.com/fasiha/curtiz-japanese-nlp) on `locahost`, port 8133 (or provide URL via an environment variable `CURTIZ_URL` to the following).

Then to start the dev server:
```sh
npm run dev
```
and visit http://localhost:4321.

To clear all NLP data and reload it (for example, when the NLP pipeline has changed), run
```sh
sqlite3 sentences.db "UPDATE sentence SET jsonEncoded = json_remove(jsonEncoded, '$.nlp')" && npm run dev
```
To clear all saved vocabulary:
```sh
sqlite3 sentences.db "UPDATE sentence SET jsonEncoded = json_remove(jsonEncoded, '$.vocab')" && npm run dev
```

## Working notes

- in the vocab memory, track what senses we've learned
- we need *directed* graphs to indicate which vocab "include" other smaller vocab, e.g., "かぜをひく" is a word, and reviewing it means we've also indirectly reviewed "かぜ and "ひく".