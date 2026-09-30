import QRCore, { type OptimizeOptions, type Snapshot } from "./qr-core";

export interface WorkerRequest {
  id: number;
  opts: OptimizeOptions;
}

export interface WorkerResponse {
  id: number;
  snap: Snapshot;
  done: boolean;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, opts } = e.data;
  const g = QRCore.optimize(opts);
  for (;;) {
    const r = g.next();
    const snap = r.value;
    const msg: WorkerResponse = { id, snap, done: !!r.done };
    self.postMessage(msg, { transfer: [snap.matrix.buffer] });
    if (r.done) break;
  }
};
