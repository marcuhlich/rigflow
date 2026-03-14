interface Window {
  lovable?: {
    getSecret: (key: string) => Promise<string>;
  };
}