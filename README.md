# Tabito

## Restart everything
In one tab start the server:
```sh
npm run server:build && npm run server:start
```
This will load http://localhost:4000 with a SQLite file in `tabito.db`.

Then in another terminal run,
```sh
npm run dev
```
to start the Astro dev server on http://localhost:4321. This will have the website.

## Working notes

After entering a sentence, it needs to hit MeCab (probabily `curtiz-japanese-nlp`?) or Ichiran to get furigana.

The Sentence Editor needs to offer Furigana editing and synonym generation. This will generate data in the Tabito format (see `tabito-lib`).

Then the document page needs to show the plain sentences, without furigana. Ultimately this document view will become the passive reading page, with a button to mark a sentence as 
- "fully understood" versus 
- "click to see furigana" vs
- "click to see meaning".

We also need to create a "review" page that'll use Ebisu v3 (probably the single-Beta power-law algorithm?) to pick the sentence most at risk of being forgotten and let you review it. That'll finally use the Tabito library.

## Detailed setup
After cloning this repo, I think these are the setup steps:
```sh
# install dependencies
npx pnpm i

# generate TypeScript wrappers from SQL schema
npm run server:schema

# transpile server TypeScript code to JavaScript modules
npm run server:build

# start the backend server
npm run server:start
```
Then in another terminal, start Astro, the frontend dev server:
```sh
npm run dev
```