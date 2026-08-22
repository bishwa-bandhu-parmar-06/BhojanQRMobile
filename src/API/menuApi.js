import api from './axiosInstance';

const BASE_URL = '/menu';

export const getPublicMenu = (restaurantId, page = 1, limit = 8) => {
  return api.get(
    `${BASE_URL}/public/${restaurantId}?page=${page}&limit=${limit}`,
  );
};

export const getAllMenuItems = (page = 1, limit = 8) => {
  const response = api.get(`${BASE_URL}/all?page=${page}&limit=${limit}`);
  return response;
};

// The server paginates this at 20 by default and answers with totalItems /
// totalPages / currentPage alongside the rows. Calling it with no arguments
// used to silently return only the first 20 - which is why a 100-item menu
// showed 20 in the app.
export const getMyMenu = (page = 1, limit = 20, fresh = false) => {
  return api.get(`${BASE_URL}/owner/my-menu`, {
    params: { page, limit, ...(fresh ? { fresh: 1 } : {}) },
  });
};

// Everything in one request, for the places that need the WHOLE menu rather
// than a screenful: the Happy Hours offer form builds its category list and
// item picker from this, and with only the first page it would offer a
// category set that silently excluded most of the menu.
export const getFullMenu = (fresh = false) => {
  return api.get(`${BASE_URL}/owner/my-menu`, {
    params: { page: 1, limit: 1000, ...(fresh ? { fresh: 1 } : {}) },
  });
};

// The category dropdown's options: the server's default starter set plus any
// custom category this restaurant has already used on a live menu item. A
// custom category only becomes an option once something is saved under it,
// which is why the forms also add newly typed names to their local list
// straight away rather than waiting for a round trip.
export const getMenuCategories = () => {
  return api.get(`${BASE_URL}/owner/categories`);
};

// Asks the server what image a row would end up with, without saving it:
// the spreadsheet's own URL if it actually resolves to an image, otherwise a
// stock photo matched on the dish name, otherwise nothing. Runs the identical
// chain addMenuItem runs at save time, so the preview cannot promise one
// thing and the upload deliver another.
export const resolveMenuImage = (name, imageUrl) => {
  return api.post(`${BASE_URL}/owner/resolve-image`, { name, imageUrl });
};

export const addMenuItem = formDataToSend => {
  return api.post(`${BASE_URL}/add`, formDataToSend, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateMenuItem = (id, formDataToSend) => {
  return api.post(`${BASE_URL}/update/${id}`, formDataToSend, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateMenuAvailability = id => {
  return api.post(`${BASE_URL}/${id}/availability`);
};

// Wipes the whole menu in one request. The route sits above the catch-all
// "/:id" delete on the server, or Express would read "delete-all" as an id.
export const deleteAllMenuItems = () => {
  return api.post(`${BASE_URL}/delete-all`);
};

export const deleteMenuItem = id => {
  return api.post(`${BASE_URL}/${id}`);
};
