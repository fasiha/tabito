import { useSignal, type Signal } from "@preact/signals";
import type { FunctionalComponent } from "preact";
import type { Sentence } from "../../interfaces/backend";
import type { Furigana } from "tabito-lib";
import type { TargetedEvent } from "preact/compat";
import { reparsePlain } from "../../endpointsHelpers/reparsePlain";
import type { ScoreHit } from "curtiz-japanese-nlp";

interface Props {
  sentence: Signal<Sentence | undefined>;
}

const furiganaToString = (fs: Furigana[]): string => fs.map((f) => (typeof f === "string" ? f : f.ruby)).join("");
const furiganasToString = (bunsetsu: Furigana[][]): string => bunsetsu.map(furiganaToString).join("");

interface AddCustomJmdict {
  startIdx: number;
  endIdx: number;
  hit: ScoreHit;
}
function addCustomJmdict(sentence: Signal<Sentence | undefined>, hit: AddCustomJmdict) {
  if (typeof sentence.value?.nlp.curtiz === "object") {
    const parent = sentence.value.nlp.curtiz.hits.find((h) => h.startIdx === hit.startIdx);
    const child = parent?.results.find((h) => h.endIdx === hit.endIdx);

    if (!parent) {
      sentence.value.nlp.curtiz.hits.unshift({
        startIdx: hit.startIdx,
        results: [{ endIdx: hit.endIdx, run: "", results: [hit.hit] }],
      });
    } else if (!child) {
      parent.results.unshift({
        endIdx: hit.endIdx,
        run: "(hopefully unused)", // this isn't used in the UI, so we can leave it empty. For now.
        results: [hit.hit],
      });
    } else {
      child?.results.unshift(hit.hit);
    }

    // Shallow-copy nlp to trigger reactivity
    sentence.value = { ...sentence.value, nlp: { ...sentence.value.nlp } };
  }
}

export const CustomVocab: FunctionalComponent<Props> = ({ sentence }) => {
  const curtiz = sentence.value?.nlp.curtiz;

  const startIndex = useSignal(0);
  const endIndex = useSignal(1);
  const searchText = useSignal("");

  const newHits = useSignal<ScoreHit[]>([]);

  if (!sentence.value || !curtiz || typeof curtiz === "string") {
    return null;
  }

  const handleChangeText = (raw: string) => {
    searchText.value = raw;
  };
  const handleSearch = async (event: TargetedEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    const result = await reparsePlain(searchText.value);
    if (!result || typeof result === "string") return;
    const hits = result.hits.flatMap((h) => h.results.flatMap((r) => r.results));
    newHits.value = hits;
  };
  const handleChangeStart = (raw: string) => {
    startIndex.value = Number(raw);
    endIndex.value = Number(raw) + 1;
  };
  const handleChangeEnd = (raw: string) => {
    endIndex.value = Number(raw);
  };
  const handleAdd = (hit: ScoreHit) => {
    addCustomJmdict(sentence, { startIdx: startIndex.value, endIdx: endIndex.value, hit });
  };

  const snippet = furiganasToString(curtiz.furigana.slice(startIndex.value, endIndex.value));

  return (
    <details>
      <summary>Dictionary lookup</summary>
      <section
        style={{
          marginLeft: "1rem",
          paddingLeft: "1rem",
          borderLeft: "3px solid gray",
        }}
      >
        <div>
          From{" "}
          <select value={startIndex.value} onChange={(e) => handleChangeStart(e.currentTarget.value)}>
            {curtiz.furigana.map((morpheme, midx) => (
              <option value={midx} key={midx}>
                {furiganaToString(morpheme)}
              </option>
            ))}
          </select>{" "}
          →{" "}
          <select value={endIndex.value} onChange={(e) => handleChangeEnd(e.currentTarget.value)}>
            {curtiz.furigana.slice(startIndex.value).map((_, midx) => (
              <option value={startIndex.value + midx + 1} key={midx}>
                {furiganasToString(curtiz.furigana.slice(startIndex.value, startIndex.value + midx + 1))}
              </option>
            ))}
          </select>
        </div>

        <div>
          <ul>
            <li>
              {snippet} ={" "}
              <form onSubmit={handleSearch}>
                <input onInput={(e) => handleChangeText(e.currentTarget.value)} type="text" value={searchText.value} />
                <button type="submit">Submit</button>
              </form>
            </li>
            {newHits.value.map((hit) => (
              <li>
                {hit.word?.kanji.map((k) => k.text).join("/")} {hit.word?.kana.map((k) => k.text).join("/")}
                {hit.word?.sense.map((s) => s.gloss.map((g) => g.text).join(", ")).join("; ")}
                <button onClick={() => handleAdd(hit)}>Add</button> {hit.wordId}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </details>
  );
};
