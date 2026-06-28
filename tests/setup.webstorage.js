// tests/setup.webstorage.js
// Polyfill działającego in-memory Storage dla testów jsdom.
//
// Node ≥ 22 dostarcza eksperymentalny globalny `localStorage` (Web Storage API),
// który bez poprawnego `--localstorage-file` jest niefunkcjonalnym obiektem
// (`localStorage.clear is not a function`, rzuca przy konwersji na string).
// Ten natywny global przesłania `localStorage` z jsdom, przez co testy DOM
// używające localStorage/sessionStorage padają na maszynach z nowym Node.
//
// Metody muszą żyć na `Storage.prototype` — część testów robi
// `vi.spyOn(Storage.prototype, 'setItem')` lub podmienia `Storage.prototype.*`,
// więc instancje muszą dziedziczyć po prototypie (a nie mieć metody własne).
//
// Setup wykonuje się tylko w środowisku jsdom (gdy istnieje `window`) i tylko
// gdy wykryty Storage jest zepsuty — testy w środowisku `node` są nietknięte.

function isBroken(storage) {
  return !storage || typeof storage.clear !== 'function' || typeof storage.setItem !== 'function';
}

function defineSafe(target, name, descriptor) {
  try {
    Object.defineProperty(target, name, descriptor);
    return true;
  } catch {
    return false;
  }
}

function install() {
  if (typeof window === 'undefined') return; // tylko jsdom
  if (!isBroken(globalThis.localStorage)) return; // jsdom Storage działa — nie ruszamy

  const StorageCtor = typeof window.Storage === 'function' ? window.Storage : function Storage() {};
  window.Storage = StorageCtor;
  globalThis.Storage = StorageCtor;

  const stores = new WeakMap();
  const backing = (inst) => {
    if (!stores.has(inst)) stores.set(inst, new Map());
    return stores.get(inst);
  };

  const proto = StorageCtor.prototype;
  defineSafe(proto, 'clear', { value() { backing(this).clear(); }, writable: true, configurable: true });
  defineSafe(proto, 'getItem', {
    value(key) {
      const m = backing(this);
      const k = String(key);
      return m.has(k) ? m.get(k) : null;
    },
    writable: true,
    configurable: true,
  });
  defineSafe(proto, 'setItem', { value(key, value) { backing(this).set(String(key), String(value)); }, writable: true, configurable: true });
  defineSafe(proto, 'removeItem', { value(key) { backing(this).delete(String(key)); }, writable: true, configurable: true });
  defineSafe(proto, 'key', {
    value(index) {
      const keys = Array.from(backing(this).keys());
      return index >= 0 && index < keys.length ? keys[index] : null;
    },
    writable: true,
    configurable: true,
  });
  defineSafe(proto, 'length', { get() { return backing(this).size; }, configurable: true });

  for (const name of ['localStorage', 'sessionStorage']) {
    const instance = Object.create(proto);
    const descriptor = { value: instance, writable: true, configurable: true, enumerable: false };
    defineSafe(window, name, descriptor);
    defineSafe(globalThis, name, descriptor);
  }
}

install();
