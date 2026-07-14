export const useFavoriteItemStore = defineStore('favoriteItem', () => {
  const STORAGE_KEY = 'favorite_items';

  const allFavorites = ref([]);

  onMounted(() => {
    allFavorites.value = getFavorites();
  });

  const addToFavorites = (item, type) => {
    const favorites = getFavorites();
    const itemId = item.id;

    favorites[itemId] = {
      id: itemId,
      type,
    };

    saveFavoriteItems(favorites);
  };

  const removeFromFavorites = (item) => {
    const favorites = getFavorites();
    const itemId = item.id;

    delete favorites[itemId];
    saveFavoriteItems(favorites);
  };

  /**
   * @param {Resource} item
   */
  const toggleFavorite = (item, type) => {
    if (isFavorite(item)) {
      removeFromFavorites(item);
      return;
    }
    addToFavorites(item, type);
  };

  const getFavorites = (type) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const favorites = stored ? JSON.parse(stored) : {};
      if (!type) {
        return favorites;
      }
      const filtered = {};
      for (const [id, item] of Object.entries(favorites)) {
        if (item.type === type) {
          filtered[id] = item;
        }
      }
      return filtered;
    } catch (error) {
      console.error('Error reading favorite items:', error);
      return {};
    }
  };

  const saveFavoriteItems = (items) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      allFavorites.value = items;
    } catch (error) {
      console.error('Error saving favorite items:', error);
    }
  };

  const isFavorite = (item) => {
    const favorites = getFavorites();
    const itemId = item.id;
    return Object.hasOwn(favorites, itemId);
  };

  return {
    allFavorites,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    getFavorites,
  };
});
