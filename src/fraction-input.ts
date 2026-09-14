import type { Question } from "./types";

export function usesFractionInput(question: Question): boolean {
  if (question.answerInput) return question.answerInput === "fraction";
  // Saves from before explicit input kinds retain their original fraction controls.
  return /^\d+\/\d+\s[+−÷]/.test(question.prompt);
}
export const fractionFields = `<div class="fraction-fields"><label>Numerator<input data-fraction="0" inputmode="none" autocomplete="off" maxlength="8"></label><span aria-hidden="true">/</span><label>Denominator<input data-fraction="1" inputmode="none" autocomplete="off" maxlength="8"></label></div>`;

/** Two visible fields retain the existing slash-encoded durable draft. */
export function bindFractionInput(
  draft: string,
  change: (draft: string) => void,
  submit: () => void,
): (key: string) => void {
  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement>("[data-fraction]"),
  );
  const values = draft.split("/");
  fields.forEach((field, index) => {
    field.value = values[index] ?? "";
  });
  let active = draft.includes("/") ? 1 : 0;
  const publish = () => change(`${fields[0].value}/${fields[1].value}`);
  const edit = (key: string) => {
    const field = fields[active];
    if (key === "/") {
      active = 1;
      fields[1].focus();
      return;
    }
    if (key === "clear") {
      fields.forEach((field) => {
        field.value = "";
      });
      active = 0;
    } else if (key === "back") field.value = field.value.slice(0, -1);
    else if (/^\d$/.test(key) && field.value.length < 8) field.value += key;
    else return;
    publish();
  };
  fields.forEach((field, index) => {
    field.addEventListener("focus", () => {
      active = index;
    });
    field.addEventListener("input", publish);
    field.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Tab") return;
      event.preventDefault();
      if (event.repeat) return;
      if (event.key === "Enter") submit();
      else edit(event.key === "Backspace" ? "back" : event.key);
    });
  });
  return edit;
}
