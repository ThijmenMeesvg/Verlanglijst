import { db } from "./firebase.js";

import {
  ref,
  get,
  push,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

import {
  ITEM_STATUSES,
  VISIBILITY
} from "./config.js";


const ITEMS_PATH = "v2/items";


export function createItemModel(data = {}) {
  return {
    title: data.title ?? "",
    price: Number(data.price ?? 0),
    link: data.link ?? "",
    image: data.image ?? "",

    category: data.category ?? "other",

    favorite: Boolean(data.favorite),

    status: data.status ?? ITEM_STATUSES.AVAILABLE,

    visibility: data.visibility ?? VISIBILITY.PUBLIC,
    privateList: data.privateList ?? null,

    createdAt:
      data.createdAt ??
      new Date().toISOString().slice(0, 10)
  };
}


export async function getAllItems() {
  const snapshot = await get(ref(db, ITEMS_PATH));

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();

  return Object.entries(data).map(([id, item]) => ({
    id,
    ...item
  }));
}


export async function getItem(id) {
  const snapshot = await get(
    ref(db, `${ITEMS_PATH}/${id}`)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id,
    ...snapshot.val()
  };
}


export async function addItem(itemData) {
  const item = createItemModel(itemData);

  const newItemRef = push(
    ref(db, ITEMS_PATH)
  );

  await set(newItemRef, item);

  return newItemRef.key;
}


export async function updateItem(id, changes) {
  await update(
    ref(db, `${ITEMS_PATH}/${id}`),
    changes
  );
}


export async function deleteItem(id) {
  await remove(
    ref(db, `${ITEMS_PATH}/${id}`)
  );
}