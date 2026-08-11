import SecureLS from 'secure-ls';

const ls = new SecureLS({
  isCompression: false, //不压缩
  encryptionSecret: import.meta.env.VITE_SiteSecretKey, //自定义秘钥
});

export const SelfStorage = {
  setItem(key: string, value: any) {
    ls.set(key, value);
  },
  getItem(key: string) {
    return ls.get(key);
  },
};
