import test from "node:test";
import assert from "node:assert/strict";
import { bindFractionInput } from "../src/fraction-input";

test("fraction fields restore partial drafts and direct keypad edits to the selected part", () => {
  const original = globalThis.document;
  class Field {
    value = "";
    handlers = new Map<string, Function>();
    addEventListener(name: string, handler: Function) {
      this.handlers.set(name, handler);
    }
    focus() {
      this.handlers.get("focus")?.();
    }
  }
  const fields = [new Field(), new Field()];
  Object.assign(globalThis, { document: { querySelectorAll: () => fields } });
  try {
    let draft = "1/";
    let submitted = false;
    const edit = bindFractionInput(
      draft,
      (value) => {
        draft = value;
      },
      () => {
        submitted = true;
      },
    );
    assert.deepEqual(
      fields.map((field) => field.value),
      ["1", ""],
    );
    edit("4");
    assert.equal(draft, "1/4");
    fields[0].focus();
    edit("back");
    assert.equal(draft, "/4");
    edit("3");
    assert.equal(draft, "3/4");
    edit(".");
    assert.equal(draft, "3/4");
    fields[1].handlers.get("keydown")!({
      key: "Enter",
      repeat: false,
      stopPropagation() {},
      preventDefault() {},
    });
    assert.equal(submitted, true);
    edit("clear");
    assert.equal(draft, "/");
  } finally {
    Object.assign(globalThis, { document: original });
  }
});
