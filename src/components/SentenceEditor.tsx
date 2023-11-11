/*

Start server:
```
npm run server:build && TABITO_DB=tabito.db TABITO_PORT=4000 node server/src/server.js
```

*/

import type { FunctionalComponent } from "preact";
import { effect, signal, useSignal } from "@preact/signals";
import type { Sentence } from "tabito-lib";
import {
  type PostSentence,
  type SentenceExists,
} from "../../server/src/restDecoders";
import type { TargetedEvent } from "preact/compat";

const plain = signal("");
const sentence = signal<undefined | Sentence>(undefined);
const networkFeedback = signal("");

effect(async () => {
  const plainValue = plain.value;

  const body: Pick<SentenceExists, "plain"> = { plain: plainValue };
  const response = await fetch("http://localhost:4000/api/sentence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 200) {
    const payload = await response.json();
    sentence.value = payload;
    networkFeedback.value = "";
  } else if (response.status === 204) {
    sentence.value = undefined;
    networkFeedback.value = "";
  } else {
    networkFeedback.value = `Error ${response.status} ${response.statusText}`;
    console.error("Error", response);
  }
});

export const SentenceEditor: FunctionalComponent = () => {
  const newTranslation = useSignal("");

  const words = plain.value.split("");
  function handleStartEditing() {
    const newSentence: Sentence = { furigana: words };
    sentence.value = newSentence;
  }

  function handleChangeCitation(e: TargetedEvent<HTMLInputElement, Event>) {
    sentence.value = {
      ...sentence.value!, // this is defined per ternary above
      citation: (e.target as HTMLInputElement).value,
    };
  }

  function handleTranslationChange(e: TargetedEvent<HTMLInputElement, Event>) {
    newTranslation.value = (e.target as HTMLInputElement).value;
  }
  function handleTranslationAdd() {
    if (!sentence.value) return;

    const pointer = sentence.value;
    if (!pointer.english) pointer.english = [];
    pointer.english.push(newTranslation.value);
    sentence.value = { ...pointer };

    newTranslation.value = "";
  }
  async function handleSubmit() {
    if (!sentence.value) return;
    const body: PostSentence = { sentence: sentence.value };
    const response = await fetch("http://localhost:4000/api/sentence", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      networkFeedback.value = "Submitted!";
      newTranslation.value = "";
    }
  }

  return (
    <div>
      <p>Type in a sentence to search for it or create it</p>
      <input
        onInput={(e) => (plain.value = (e.target as HTMLInputElement).value)}
        type="text"
        value={plain}
      />
      {networkFeedback.value && <p>Network feedback: {networkFeedback}</p>}
      {!sentence.value ? (
        <button onClick={handleStartEditing}>Start Editing</button>
      ) : (
        <div>
          <ul>
            <li>
              Change citation:{" "}
              <input
                type="text"
                onChange={handleChangeCitation}
                value={sentence.value.citation}
              />
            </li>
            {(sentence.value.english ?? []).map((english) => (
              <li key={english}>{english}</li>
            ))}
            <li>
              New translation?{" "}
              <input
                onChange={handleTranslationChange}
                type="text"
                value={newTranslation}
              />{" "}
              <button onClick={handleTranslationAdd}>Submit</button>
            </li>
          </ul>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      )}
    </div>
  );
};
