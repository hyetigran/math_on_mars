export function renderPractice(
  root: HTMLElement,
  practice: any,
  send: (intent: unknown) => void,
  parentControls = true,
  compact = false,
) {
  const signature = JSON.stringify(practice);
  if (root.dataset.snapshot === signature) return;
  root.dataset.snapshot = signature;
  root.replaceChildren();
  const add = (tag: string, text: string, parent: HTMLElement = root) => {
    const e = document.createElement(tag);
    e.textContent = text;
    parent.append(e);
    return e;
  };
  if (!compact) add("h3", "Town practice");
  add(
    "p",
    compact
      ? `${Math.floor(practice.credit / 60000)}m boost saved`
      : `Construction credit: ${practice.credit / 60000} minutes.`,
  );
  const settings = document.createElement("details");
  if (parentControls) root.append(settings);
  add("summary", "Parent: eligible practice topics", settings);
  const parentForm = document.createElement("form");
  parentForm.dataset.eligibility = "true";
  settings.append(parentForm);
  const topicLabel = add("label", "Choose eligible grade/topics", parentForm);
  const topics = document.createElement("select");
  topics.multiple = true;
  topics.size = 5;
  topics.name = "topics";
  for (const topic of practice.topics) {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = `Grade ${topic.grade}: ${topic.skill}`;
    option.selected = practice.eligibleTopics.includes(topic.id);
    topics.append(option);
  }
  topicLabel.append(topics);
  const passwordLabel = add("label", "Parent password", parentForm);
  const password = document.createElement("input");
  password.type = "password";
  password.name = "password";
  password.autocomplete = "current-password";
  password.required = true;
  passwordLabel.append(password);
  const update = add("button", "Save eligible topics", parentForm);
  update.dataset.mutation = "true";
  parentForm.onsubmit = (e) => {
    e.preventDefault();
    send({
      action: "set-topics",
      topics: Array.from(topics.selectedOptions, (o) => o.value),
      password: password.value,
    });
  };
  const attempt = practice.attempt;
  if (!attempt || attempt.completed) {
    if (attempt)
      add(
        "p",
        `${Object.values(attempt.firstAttempts).filter(Boolean).length}/${attempt.questionIds.length} correct first try · +${attempt.reward / 60000}m boost`,
      );
    if (!compact) add("p", "Correct all answers to earn the displayed credit.");
    for (const topic of practice.topics.filter((t: any) =>
      practice.eligibleTopics.includes(t.id),
    )) {
      const button = add(
        "button",
        compact
          ? `${topic.skill} · +${topic.reward / 60000}m`
          : `Grade ${topic.grade}: ${topic.skill} · ${Math.min(5, topic.count)} questions · ${topic.reward / 60000} minutes credit`,
      );
      button.dataset.mutation = "true";
      button.dataset.beginPractice = topic.id;
      button.onclick = () =>
        send({ action: "begin-practice", topic: topic.id });
    }
    if (!practice.eligibleTopics.length) add("p", "No topics enabled.");
    return;
  }
  add(
    "p",
    `${attempt.reward / 60000}m boost for completing this set${attempt.repeated ? " · Repeated questions" : ""}`,
  );
  const q = attempt.questions.find(
    (q: any) => !attempt.corrected.includes(q.id),
  );
  add("p", q.prompt).dataset.questionId = q.id;
  if (attempt.firstAttempts[q.id] === false) add("p", `Try again. ${q.hint}`);
  const answerForm = document.createElement("form");
  answerForm.dataset.answerPractice = "true";
  root.append(answerForm);
  const answerLabel = add("label", "Answer (number or fraction)", answerForm);
  const input = document.createElement("input");
  input.name = "answer";
  input.maxLength = 18;
  input.required = true;
  answerLabel.append(input);
  const submit = add("button", "Check answer", answerForm);
  submit.dataset.mutation = "true";
  answerForm.onsubmit = (e) => {
    e.preventDefault();
    send({
      action: "answer-practice",
      attemptId: attempt.id,
      questionId: q.id,
      value: input.value,
    });
  };
  add(
    "p",
    `${q.source.title} · ${q.source.author} · ${q.source.edition} · ${q.source.license}. ${q.source.changes}`,
  );
  const source = add("a", "Original question") as HTMLAnchorElement;
  source.href = q.source.url;
  source.target = "_blank";
  source.rel = "noopener";
  const license = add("a", "License") as HTMLAnchorElement;
  license.href = q.source.licenseUrl;
  license.target = "_blank";
  license.rel = "noopener";
}
