export const capturePreBatchSnapshot = (store) => store.createSnapshot();

export const commitBatchHistory = (store, action = "batch") => {
  store.pushHistoryEntry(action, store.createSnapshot());
};
