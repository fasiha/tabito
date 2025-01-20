// .prettierrc.mjs
/** @type {import("prettier").Config} */
export default {
  printWidth: 80,
  proseWrap: "never",
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
