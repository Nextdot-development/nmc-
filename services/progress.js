import { AsyncLocalStorage } from 'async_hooks';

// Live progress for one audit request. The streaming endpoint runs the audit inside
// withProgress(); anything deeper in the pipeline calls progress() to report a step.
// Outside a streaming request progress() does nothing.
const store = new AsyncLocalStorage();

export const withProgress = (emit, fn) => store.run(emit, fn);

export const progress = (event) => {
  const emit = store.getStore();
  if (!emit) return;
  try {
    emit(event);
  } catch {
    // a closed connection must never break the audit
  }
};

export const stage = (message) => progress({ type: 'stage', message });
