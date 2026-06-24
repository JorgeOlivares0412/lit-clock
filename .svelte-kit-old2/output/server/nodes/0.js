import * as universal from '../entries/pages/_layout.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.js";
export const imports = ["_app/immutable/nodes/0.XnBDs4md.js","_app/immutable/chunks/BrfdEsfY.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/BvxhH8ls.js","_app/immutable/chunks/BW11eJ_l.js"];
export const stylesheets = ["_app/immutable/assets/0.BjH6_aBt.css"];
export const fonts = ["_app/immutable/assets/Georgia.CReoFFPn.ttf"];
