/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { Sentence } from "../../interfaces/backend";
import { createDexieSignalQuery } from "../../indexeddb/solid-dexie";
import { db } from "../../indexeddb";
import { furiganaToPlain } from "../../utils/utils";
import { makeSentenceMemory } from "../../utils/make";

interface Props {
  sentence: Sentence;
}
export const SentencePicked: Component<Props> = ({ sentence }) => {
  const plain = furiganaToPlain(sentence.furigana);
  const memory = createDexieSignalQuery(() => db.sentence.get(plain));
  const toggleLearn = () => {
    if (memory()) {
      db.sentence.delete(plain);
    } else {
      db.sentence.put(
        makeSentenceMemory({
          plain,
          relatedWordIds: sentence.vocab?.map((v) => v.entry.id) ?? [],
        }),
        plain
      );
    }
  };

  return (
    <div>
      <button onClick={toggleLearn}>
        {memory() ? "Unlearn sentence" : "Learn sentence!"}
      </button>
      {sentence.translations?.en.length && (
        <details>
          <summary>Expand translations</summary>
          <ul>
            {memory()?.personalTranslations?.length &&
              memory()?.personalTranslations?.map((tl) => (
                <li>
                  <em>{tl}</em>
                </li>
              ))}
            <li>
              <strong>Add personal translation</strong> TODO
            </li>
            {sentence.translations.en.map((tl) => (
              <li>{tl}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
