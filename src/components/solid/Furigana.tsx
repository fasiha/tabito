/** @jsxImportSource solid-js */
import { type Component, For, Show } from "solid-js";
import type { Furigana as FuriganaType } from "curtiz-japanese-nlp";

interface Props {
  furigana: FuriganaType[];
}

export const Furigana: Component<Props> = (props) => {
  return (
    <span>
      <For each={props.furigana}>
        {(f) => (
          <Show
            when={typeof f === "string"}
            fallback={
              <ruby>
                {typeof f === "object" && f.ruby}
                <rt>{typeof f === "object" && f.rt}</rt>
              </ruby>
            }
          >
            {typeof f === "string" && f}
          </Show>
        )}
      </For>
    </span>
  );
};
