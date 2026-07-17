// Web Worker hosting the wasm optimizer. `find_plan` can take long enough on a complex facility
// setup that running it on the main thread freezes the page's own rendering, which is what makes
// the browser offer to kill the tab; every wasm call is dispatched through here instead, so the
// main thread stays free to paint a progress indicator while a solve is in flight. See
// `web/app.js`'s `callWorker` for the request/response contract this expects.
import init, { find_plan, time_to_reach, get_version, get_all_items } from './pkg/aniimax.js';

const ready = init();

const HANDLERS = { find_plan, time_to_reach, get_version, get_all_items };

self.onmessage = async (event) => {
    const { id, type, payload } = event.data;
    try {
        await ready;
        const handler = HANDLERS[type];
        if (!handler) {
            throw new Error(`Unknown worker request type: ${type}`);
        }
        const result = payload === undefined ? handler() : handler(payload);
        self.postMessage({ id, ok: true, result });
    } catch (error) {
        self.postMessage({ id, ok: false, error: error && error.message ? error.message : String(error) });
    }
};
