export class ImmutablePersistedCollection {
  constructor(db, collectionName) {
    this.db = db;
    this.items = Object.freeze([]);
    this.initPromise = null;
  }

  freezeItem(item) {
    const nextItem = { ...item };
    if (nextItem.properties) {
      nextItem.properties = Object.freeze({ ...nextItem.properties });
    }
    return Object.freeze(nextItem);
  }

  async init() {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          await this.db.initDB();
          const items = await this.db.loadObjects();
          this.items = Object.freeze(this.loadItems(items));
          return this.items;
        } catch (error) {
          console.error("Error initializing collection:", error);
          this.initPromise = null;
          throw error;
        }
      })();
    }

    return this.initPromise;
  }

  ensureReady() {
    return this.init();
  }

  loadItems(items) {
    return items.map((item) => {
      if (item.type === "image") {
        const image = new Image();
        image.src = item.properties.imageSrc;
        return this.freezeItem({ ...item, image });
      }
      return this.freezeItem(item);
    });
  }
  async storeObject(item) {
    const { image, rect, ...persistedItem } = item;
    return await this.db.saveObject(persistedItem);
  } 

  getAll() {
    return this.items;
  }

  async add(item) {
    try {
      await this.ensureReady();
      await this.storeObject(item);
      this.items = Object.freeze([...this.items, this.freezeItem(item)]);
      return this.items;
    } catch (error) {
      console.error(`Error adding item:`, error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      await this.ensureReady();
      await this.storeObject({ id, ...updates });
      this.items = Object.freeze(
        this.items.map((item) =>
          item.id === id ? this.freezeItem({ ...item, ...updates }) : item
        )
      );
      return this.items;
    } catch (error) {
      console.error(`Error updating item:`, error);
      throw error;
    }
  }
  async updateMany(updates) {
    try {
      await this.ensureReady();
      const updatePromises = updates.map(({ id, ...changes }) => 
        this.storeObject({ id, ...changes })
      );
      await Promise.all(updatePromises);

      this.items = Object.freeze(
        this.items.map((item) => {
          const itemUpdates = updates.find(update => update.id === item.id);
          return itemUpdates 
            ? this.freezeItem({ ...item, ...itemUpdates })
            : item;
        })
      );
      return this.items;
    } catch (error) {
      console.error(`Error updating multiple items:`, error);
      throw error;
    }
  }

  async remove(id) {
    try {
      await this.ensureReady();
      await this.db.deleteObject(id);
      this.items = Object.freeze(this.items.filter((item) => item.id !== id));
      return this.items;
    } catch (error) {
      console.error(`Error removing item:`, error);
      throw error;
    }
  }

  async clear() {
    try {
      await this.ensureReady();
      await this.db.deleteAllObjects();
      this.items = Object.freeze([]);
      return this.items;
    } catch (error) {
      console.error(`Error clearing collection:`, error);
      throw error;
    }
  }

  async replace(newItems) {
    try {
      await this.ensureReady();
      await this.db.deleteAllObjects();
      await Promise.all(newItems.map((o) => this.storeObject(o)));
      this.items = Object.freeze(this.loadItems(newItems));
      return this.items;
    } catch (error) {
      console.error(`Error replacing items:`, error);
      throw error;
    }
  }
}
