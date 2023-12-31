/*import express from "express";
import cors from "cors";

import { isRight } from "fp-ts/lib/Either.js";
import { path } from "static-path";
import {
  PostSentenceCodec,
  SentenceExistsCodec,
} from "../../interfaces/restDecoders";
import {
  getSentence,
  getSentencesInDocument,
  sentenceExists,
  upsertSentence,
} from "../../db";

const app = express();
const port =
  process.env["TABITO_PORT"] && isFinite(Number(process.env["TABITO_PORT"]))
    ? Number(process.env["TABITO_PORT"])
    : 3000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const documentPath = path("/api/document/:documentId");
app.get(documentPath.pattern, (req, res) => {
  const { documentId } = req.params;

  const jsons = getSentencesInDocument(documentId).map((o) => o.jsonEncoded);
  res.setHeader("Content-Type", "application/json");
  res.end(`[${jsons.join(",")}]`);
});

app.put("/api/sentence", (req, res) => {
  const parsed = PostSentenceCodec.decode(req.body);
  if (isRight(parsed)) {
    try {
      upsertSentence(parsed.right.sentence, parsed.right);
      // the above should never throw any kind of conflict but there may be some other write issues,
      // so we wrap in try-catch
      res.sendStatus(200);
    } catch (e) {
      console.error("Unexpected error", e);
      res.sendStatus(500);
    }
  } else {
    console.error("io-ts rejection");
    res.sendStatus(422);
  }
});

app.post("/api/sentence-exists", (req, res) => {
  const parsed = SentenceExistsCodec.decode(req.body);
  if (isRight(parsed)) {
    try {
      res.sendStatus(sentenceExists(parsed.right) ? 200 : 204);
    } catch (e) {
      console.error("Unexpected error", e);
      res.sendStatus(500);
    }
  } else {
    console.error("io-ts rejection");
    res.sendStatus(422);
  }
});

app.post("/api/sentence", (req, res) => {
  const parsed = SentenceExistsCodec.decode(req.body);
  if (isRight(parsed)) {
    let sentence: ReturnType<typeof getSentence>;
    try {
      sentence = getSentence(parsed.right, true);
    } catch (e) {
      console.error("Unexpected error", e);
      res.sendStatus(500);
      return;
    }

    if (typeof sentence === "string") {
      // found
      res.setHeader("Content-Type", "application/json");
      res.end(sentence);
    } else if (sentence === undefined) {
      // not found
      res.sendStatus(204);
    }
    // type `Sentence` is a fake return for `getSentence` since we asked it for string-only
  } else {
    console.error("io-ts rejection");
    res.sendStatus(422);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
*/

/* to test:
```console
npm run server:build && touch /tmp/tabito.db && rm /tmp/tabito.db && TABITO_DB=/tmp/tabito.db TABITO_PORT=4000 node server/src/server.js
```
Now in another window, run
```
curl -XPOST -H "Content-Type: application/json" -d'{"sentence":{"furigana":["test"], "citation":"", "english":[""]}}' http://localhost:4000/api/sentence
curl -XPOST -H "Content-Type: application/json" -d'{"sentence":{"furigana":["world"], "citation":"", "english":[""]}}' http://localhost:4000/api/sentence
curl -XPOST -H "Content-Type: application/json" -d'{"sentence":{"furigana":["test"], "citation":"new citation", "english":[""]}}' http://localhost:4000/api/sentence
curl -XPOST -H "Content-Type: application/json" -d'{"sentence":{"furigana":["test"], "citation":"new citation", "english":["new tl"]}}' http://localhost:4000/api/sentence
```

Then you can also run
```
sqlite3 /tmp/tabito.db "select * from sentence"
```

Finally,
```
curl http://localhost:4000/api/document/1
```
*/
