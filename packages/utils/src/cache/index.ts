import CryptoJS from 'crypto-js';

const prefix = 'yusui';
const SECRET_KEY = 'yusui-secret-key-123456';
type StorageType = 'local' | 'session';

interface CacheOptions {
  type?: StorageType;
  expire?: number; // 过期时间(秒)
  encrypt?: boolean;
}

const defaultCacheOptions: CacheOptions = {
  type: 'local',
  expire: undefined,
  encrypt: true,
};

const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

const decryptData = (cipherText: string): string => {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

const getStorage = (type: StorageType) => {
  return type === 'local' ? localStorage : sessionStorage;
};

export const cache = {
  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param options 配置选项
   */
  set(key: string, value: any, options: CacheOptions = {}): void {
    const {
      type = defaultCacheOptions.type as StorageType,
      expire = defaultCacheOptions.expire,
      encrypt = defaultCacheOptions.encrypt,
    } = options;
    const storage = getStorage(type);
    const storageKey = `${prefix}${key}`;

    const storageValue = JSON.stringify({
      data: value,
      expire: expire ? Date.now() + expire * 1000 : null,
    });

    storage.setItem(storageKey, encrypt ? encryptData(storageValue) : storageValue);
  },

  /**
   * 获取缓存
   * @param key 缓存键
   * @param options 配置选项
   */
  get<T = any>(key: string, options: CacheOptions = {}): T | undefined {
    const {
      type = defaultCacheOptions.type as StorageType,
      encrypt = defaultCacheOptions.encrypt,
    } = options;
    const storage = getStorage(type);
    const storageKey = `${prefix}${key}`;
    const storedValue = storage.getItem(storageKey);

    if (!storedValue) return undefined;

    try {
      const dataStr = encrypt ? decryptData(storedValue) : storedValue;
      const { data, expire } = JSON.parse(dataStr);

      if (expire && Date.now() > expire) {
        this.remove(key, { type });
        return undefined;
      }
      return data as T;
    } catch {
      return undefined;
    }
  },

  /**
   * 删除缓存
   * @param key 缓存键
   * @param options 配置选项
   */
  remove(key: string, options: CacheOptions = {}): void {
    const { type = defaultCacheOptions.type as StorageType } = options;
    getStorage(type).removeItem(`${prefix}${key}`);
  },

  /**
   * 删除所有缓存（指定前缀）
   * @param options 配置选项
   */
  clearAll(options: CacheOptions = {}): void {
    const { type = defaultCacheOptions.type as StorageType } = options;
    const storage = getStorage(type);

    Object.keys(storage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => storage.removeItem(key));
  },
};
