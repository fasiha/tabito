import "./review.css";
import { Signal, useSignal, useSignalEffect } from "@preact/signals";
import type { FunctionalComponent } from "preact";
import {
  type Sentence,
  type Graph,
  sentenceToGraph,
  type Chunk,
  chunkInput,
} from "tabito-lib";
import { Sentence as SentenceComponent } from "./Sentence";
import type { TargetedEvent } from "preact/compat";

interface Props {
  sentenceId: number;
}

async function networkCall(
  sentenceId: number,
  sentence: Signal<Sentence | undefined>,
  graph: Signal<Graph | undefined>,
  networkFeedback: Signal<string>
) {
  const res = await fetch(`/api/sentence-id/${sentenceId}`);
  if (res.ok) {
    const s: Sentence = await res.json();
    sentence.value = s;
    graph.value = sentenceToGraph(s);
    networkFeedback.value = "";
  } else {
    networkFeedback.value = `${res.status} ${res.statusText}`;
  }
}

export const Review: FunctionalComponent<Props> = ({ sentenceId }) => {
  const sentence = useSignal<Sentence | undefined>(undefined);
  const graph = useSignal<Graph | undefined>(undefined);
  const chunks = useSignal<Chunk[]>([]);
  const networkFeedback = useSignal("");

  const answer = useSignal("");

  useSignalEffect(() => {
    networkCall(sentenceId, sentence, graph, networkFeedback);
  });
  useSignalEffect(() => {
    if (graph.value) {
      chunks.value = answer.value ? chunkInput(answer.value, graph.value) : [];
    }
  });

  function handleInput(ev: TargetedEvent<HTMLInputElement, InputEvent>) {
    answer.value = ev.currentTarget.value;
  }

  if (!graph.value || !sentence.value) {
    return (
      <div>
        {networkFeedback.value && <p>Network feedback: {networkFeedback}</p>}
      </div>
    );
  }

  return (
    <div>
      {networkFeedback.value && <p>Network feedback: {networkFeedback}</p>}
      <p>
        Type the sentence meaning: “
        <strong>{(sentence.value.english || []).join("/") || "(NONE)"}</strong>”
        (hint, lol, its <SentenceComponent sentence={sentence.value} />)
      </p>
      <p>
        <input
          placeholder="Type answer"
          onInput={handleInput}
          type="text"
          value={answer}
        />
      </p>
      <p>
        {chunks.value.map((c, idx) => (
          <span
            key={idx}
            class={[
              "chunk",
              c.start && !c.full ? "start-chunk" : "",
              c.status === "unknown" ? "unknown-chunk" : "",
              c.full ? "full-chunk" : "",
            ].join(" ")}
          >
            {c.text}
          </span>
        ))}
      </p>
    </div>
  );
};
