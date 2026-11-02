// `?raw` imports resolve to the file's contents (see turbopack.rules in next.config.mjs).
declare module "*.svg?raw" {
  const content: string;
  export default content;
}
