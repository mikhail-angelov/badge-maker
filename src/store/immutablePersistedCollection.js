export class ImmutablePersistedCollection {
  constructor(db, collectionName) {
    this.db = db;
    this.items = Object.freeze([]);
  }

  async init() {
    try {
      await this.db.initDB();
      const items = await this.db.loadObjects();
      this.items = Object.freeze(this.loadItems(items));
      return this.items;
    } catch (error) {
      console.error("Error initializing collection:", error);
      throw error;
    }
  }

  loadItems(items) {
    return items.map((item) => {
      if (item.type === "image") {
        const image = new Image();
        image.src = item.properties.imageSrc;
        return Object.freeze({ ...item, image});  
      }
      return Object.freeze(item);
    });
  }
  async storeObject({id, type, properties}) {
    return await this.db.saveObject({id, type, properties});
  } 

  getAll() {
    return this.items;
  }

  async add(item) {
    try {
      await this.storeObject(item);
      this.items = Object.freeze([...this.items, Object.freeze(item)]);
      return this.items;
    } catch (error) {
      console.error(`Error adding item:`, error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      await this.storeObject({ id, ...updates });
      this.items = Object.freeze(
        this.items.map((item) =>
          item.id === id ? Object.freeze({ ...item, ...updates }) : item
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
      const updatePromises = updates.map(({ id, ...changes }) => 
        this.storeObject({ id, ...changes })
      );
      await Promise.all(updatePromises);

      this.items = Object.freeze(
        this.items.map((item) => {
          const itemUpdates = updates.find(update => update.id === item.id);
          return itemUpdates 
            ? Object.freeze({ ...item, ...itemUpdates })
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