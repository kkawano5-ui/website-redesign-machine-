import { staticFile, delayRender, continueRender } from "remotion";

// Bundle the gothic font locally (no network at render time).
export const fontFamily = "NotoSansJP";

if (typeof document !== "undefined") {
  const url = staticFile("ad3/fonts/NotoSansJP.ttf");
  const style = document.createElement("style");
  style.textContent = `@font-face{font-family:"NotoSansJP";src:url("${url}") format("truetype");font-weight:100 900;font-style:normal;font-display:block;}`;
  document.head.appendChild(style);

  const handle = delayRender("load-noto-sans-jp");
  const face = new FontFace("NotoSansJP", `url(${url})`, { weight: "100 900" });
  face
    .load()
    .then((f) => {
      (document as unknown as { fonts: FontFaceSet }).fonts.add(f);
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
}
