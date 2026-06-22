import { staticFile, delayRender, continueRender } from "remotion";

// Bundle the gothic font locally (sandbox blocks Google Fonts).
export const fontFamily = "NotoSansJP";

if (typeof document !== "undefined") {
  const url = staticFile("ad3/fonts/NotoSansJP.ttf");
  const style = document.createElement("style");
  style.textContent = `@font-face{font-family:"NotoSansJP";src:url("${url}") format("truetype");font-weight:100 900;font-style:normal;font-display:swap;}`;
  document.head.appendChild(style);

  const handle = delayRender("load-noto-sans-jp", { timeoutInMilliseconds: 120000 });
  const fonts = (document as unknown as { fonts: FontFaceSet }).fonts;
  Promise.all([
    fonts.load('900 64px "NotoSansJP"'),
    fonts.load('700 48px "NotoSansJP"'),
  ])
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}
