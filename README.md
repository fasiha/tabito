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

After entering a sentence, it needs to hit MeCab (probabily `curtiz-japanese-nlp`?) or Ichiran to get furigana.

The Sentence Editor needs to offer Furigana editing and synonym generation. This will generate data in the Tabito format (see `tabito-lib`).

Then the document page needs to show the plain sentences, without furigana. Ultimately this document view will become the passive reading page, with a button to mark a sentence as 
- "fully understood" versus 
- "click to see furigana" vs
- "click to see meaning".

We also need to create a "review" page that'll use Ebisu v3 (probably the single-Beta power-law algorithm?) to pick the sentence most at risk of being forgotten and let you review it. That'll finally use the Tabito library.
