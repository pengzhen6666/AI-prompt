//css
declare module "*.css" {
  const content: { [className: string]: string };
}

// SVG
declare module "*.svg" {
  const src: string;
  export default src;
}

// Image formats
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}
