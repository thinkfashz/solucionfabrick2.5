declare module 'three/examples/jsm/loaders/ColladaLoader.js' {
  import { Loader, LoadingManager, Object3D } from 'three';

  export interface ColladaResult {
    scene: Object3D;
    animations: unknown[];
    kinematics: unknown;
    library: unknown;
  }

  export class ColladaLoader extends Loader<ColladaResult> {
    constructor(manager?: LoadingManager);
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<ColladaResult>;
  }
}
