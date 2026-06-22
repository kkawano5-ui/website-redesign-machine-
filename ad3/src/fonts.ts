import { staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// Bundle the gothic font locally (sandbox/offline-safe; no Google Fonts at render).
export const fontFamily = "NotoSansJP";

const url = staticFile("ad3/fonts/NotoSansJP.ttf");

// Variable font: register the weights we use. @remotion/fonts handles delayRender.
["400", "500", "700", "900"].forEach((weight) => {
  loadFont({ family: fontFamily, url, weight, display: "block" }).catch(() => undefined);
});
