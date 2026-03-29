class IndexedDB {
  constructor(dbName, storeName) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.isMemoryFallback = false;
  }

  initDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        this.isMemoryFallback = true;
        resolve(null);
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isMemoryFallback = false;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.warn(
          "IndexedDB unavailable, falling back to in-memory storage:",
          event.target.errorCode || event.target.error?.message || "unknown"
        );
        this.db = null;
        this.isMemoryFallback = true;
        resolve(null);
      };
    });
  }

  saveObject(object) {
    return new Promise((resolve, reject) => {
      if (!this.db || this.isMemoryFallback) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(object);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error(
          `Error saving object with id ${object.id}:`,
          event.target.errorCode
        );
        reject(event.target.errorCode);
      };
    });
  }

  saveObjects(objects) {
    return new Promise((resolve, reject) => {
      if (!this.db || this.isMemoryFallback) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      let errorOccurred = false;

      transaction.oncomplete = () => {
        if (!errorOccurred) {
          resolve();
        }
      };

      transaction.onerror = (event) => {
        console.error("Error saving objects:", event.target.errorCode);
        errorOccurred = true;
        reject(event.target.errorCode);
      };

      objects.forEach((object) => {
        const request = store.put(object);
        request.onerror = (event) => {
          console.error(
            `Error saving object with id ${object.id}:`,
            event.target.errorCode
          );
          errorOccurred = true;
        };
      });
    });
  }

  loadObjects() {
    return new Promise((resolve, reject) => {
      if (!this.db || this.isMemoryFallback) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error(
          "Error loading objects from IndexedDB:",
          event.target.errorCode
        );
        reject(event.target.errorCode);
      };
    });
  }

  deleteObject(id) {
    return new Promise((resolve, reject) => {
      if (!this.db || this.isMemoryFallback) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error(
          `Error deleting object with id ${id}:`,
          event.target.errorCode
        );
        reject(event.target.errorCode);
      };
    });
  }

  deleteAllObjects() {
    return new Promise((resolve, reject) => {
      if (!this.db || this.isMemoryFallback) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error("Error deleting all objects:", event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }
}

export default IndexedDB;
