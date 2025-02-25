class IndexedDBHelper {
    constructor(dbName, storeName) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error during initialization:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    saveObject(object) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(object);

            request.onsuccess = () => {
                console.log(`Object with id ${object.id} saved successfully.`);
                resolve();
            };

            request.onerror = (event) => {
                console.error(`Error saving object with id ${object.id}:`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    loadObjects() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error('Error loading objects from IndexedDB:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    deleteObject(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`Object with id ${id} deleted successfully.`);
                resolve();
            };

            request.onerror = (event) => {
                console.error(`Error deleting object with id ${id}:`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }
}

export default IndexedDBHelper;